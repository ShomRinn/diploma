/**
 * Rate Limiter
 * Prevents abuse by limiting requests per IP/identifier
 */

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

// In-memory store for rate limiting
// Note: This resets on server restart. For production, use Redis or similar.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const CONFIG = {
  // Sliding window rate limit
  WINDOW_MS: 60 * 1000, // 1 minute window
  MAX_REQUESTS: 20, // Max requests per window
  
  // Burst protection
  BURST_WINDOW_MS: 10 * 1000, // 10 seconds
  BURST_MAX: 5, // Max 5 requests in 10 seconds
  
  // Block duration for repeated offenders
  BLOCK_DURATION_MS: 5 * 60 * 1000, // 5 minute block
  
  // Cleanup interval
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Clean up every 5 minutes
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  blocked: boolean;
  blockTimeRemaining?: number;
  reason?: string;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(identifier, entry);
  }
  
  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.blockedUntil - now,
      blocked: true,
      blockTimeRemaining: entry.blockedUntil - now,
      reason: "Too many requests. Please wait before trying again.",
    };
  }
  
  // Clear expired block
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blockedUntil = undefined;
  }
  
  // Filter timestamps within the window
  const windowStart = now - CONFIG.WINDOW_MS;
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);
  
  // Check burst limit (short window)
  const burstWindowStart = now - CONFIG.BURST_WINDOW_MS;
  const burstCount = entry.timestamps.filter(t => t > burstWindowStart).length;
  
  if (burstCount >= CONFIG.BURST_MAX) {
    // Block for burst abuse
    entry.blockedUntil = now + CONFIG.BLOCK_DURATION_MS;
    console.warn('[RateLimit] Burst limit exceeded for:', identifier);
    return {
      allowed: false,
      remaining: 0,
      resetIn: CONFIG.BLOCK_DURATION_MS,
      blocked: true,
      blockTimeRemaining: CONFIG.BLOCK_DURATION_MS,
      reason: "Request rate too high. Please slow down.",
    };
  }
  
  // Check window limit
  if (entry.timestamps.length >= CONFIG.MAX_REQUESTS) {
    const oldestTimestamp = entry.timestamps[0];
    const resetIn = (oldestTimestamp + CONFIG.WINDOW_MS) - now;
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.max(0, resetIn),
      blocked: false,
      reason: "Rate limit exceeded. Please try again later.",
    };
  }
  
  // Allow request and record timestamp
  entry.timestamps.push(now);
  
  const remaining = CONFIG.MAX_REQUESTS - entry.timestamps.length;
  const oldestTimestamp = entry.timestamps[0];
  const resetIn = (oldestTimestamp + CONFIG.WINDOW_MS) - now;
  
  return {
    allowed: true,
    remaining,
    resetIn: Math.max(0, resetIn),
    blocked: false,
  };
}

/**
 * Get client identifier from request
 * Uses IP address or falls back to a default
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (set by reverse proxy)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback for development
  return "anonymous";
}

/**
 * Clean up old entries to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const windowStart = now - CONFIG.WINDOW_MS;
  
  for (const [identifier, entry] of rateLimitStore.entries()) {
    // Remove entries with no recent activity and no active block
    const hasRecentActivity = entry.timestamps.some(t => t > windowStart);
    const hasActiveBlock = entry.blockedUntil && now < entry.blockedUntil;
    
    if (!hasRecentActivity && !hasActiveBlock) {
      rateLimitStore.delete(identifier);
    }
  }
}

// Periodic cleanup (runs in background)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, CONFIG.CLEANUP_INTERVAL_MS);
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set("X-RateLimit-Limit", String(CONFIG.MAX_REQUESTS));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetIn / 1000)));
  
  if (result.blocked) {
    headers.set("Retry-After", String(Math.ceil((result.blockTimeRemaining || result.resetIn) / 1000)));
  }
}

/**
 * Get current rate limit stats (for debugging/monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeBlocks: number;
} {
  const now = Date.now();
  let activeBlocks = 0;
  
  for (const entry of rateLimitStore.values()) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      activeBlocks++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    activeBlocks,
  };
}

