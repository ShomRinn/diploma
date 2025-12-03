/**
 * Prompt Injection Protection
 * Filters dangerous patterns that could manipulate AI behavior
 */

// Dangerous patterns that could indicate prompt injection attempts
const DANGEROUS_PATTERNS: RegExp[] = [
  // Direct instruction manipulation
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(your|the|all)\s+(system\s+)?(prompt|instructions?|rules?|training)/i,
  /disregard\s+(your|the|all)\s+(system\s+)?(prompt|instructions?|rules?)/i,
  
  // Role/persona manipulation
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(if\s+you\s+are|a|an)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /new\s+(persona|identity|role|character)/i,
  /switch\s+(to|into)\s+(a\s+)?(new\s+)?(persona|mode|character)/i,
  
  // Jailbreak attempts
  /\bjailbreak\b/i,
  /\bbypass\b.*\b(filter|safety|restriction|rule)/i,
  /\bdeveloper\s+mode\b/i,
  /\bdan\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  
  // System prompt extraction
  /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  /print\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  
  // Code injection patterns
  /```\s*(system|admin|root)/i,
  /<\s*(system|admin|script)/i,
  /\[\s*(system|admin)\s*\]/i,
  
  // Override attempts
  /override\s+(all\s+)?(safety|security|restriction)/i,
  /disable\s+(all\s+)?(safety|security|filter)/i,
  /turn\s+off\s+(safety|security|filter)/i,
];

// Suspicious but not immediately dangerous (log but don't block)
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\bprompt\s+injection\b/i,
  /\bsystem\s+prompt\b/i,
  /\bhidden\s+instructions?\b/i,
  /\bsecret\s+(mode|command|instruction)/i,
];

export interface FilterResult {
  isBlocked: boolean;
  isSuspicious: boolean;
  originalContent: string;
  sanitizedContent: string;
  matchedPatterns: string[];
  reason?: string;
}

/**
 * Check if content contains dangerous patterns
 */
export function checkForInjection(content: string): FilterResult {
  const matchedPatterns: string[] = [];
  let isBlocked = false;
  let isSuspicious = false;
  
  // Check dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      matchedPatterns.push(pattern.source);
      isBlocked = true;
    }
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      if (!matchedPatterns.includes(pattern.source)) {
        matchedPatterns.push(pattern.source);
      }
      isSuspicious = true;
    }
  }
  
  return {
    isBlocked,
    isSuspicious,
    originalContent: content,
    sanitizedContent: isBlocked ? "[Message blocked: potential prompt injection detected]" : content,
    matchedPatterns,
    reason: isBlocked ? "Potential prompt injection attempt detected" : undefined,
  };
}

/**
 * Sanitize message content by filtering dangerous patterns
 */
export function sanitizeMessage(content: string): string {
  const result = checkForInjection(content);
  return result.sanitizedContent;
}

/**
 * Sanitize an array of messages
 */
export function sanitizeMessages(messages: Array<{ role: string; content: string; [key: string]: any }>) {
  return messages.map(msg => {
    // Only sanitize user messages, not system or assistant messages
    if (msg.role === "user") {
      const result = checkForInjection(msg.content);
      if (result.isBlocked || result.isSuspicious) {
        console.warn('[Security] Suspicious message detected:', {
          blocked: result.isBlocked,
          patterns: result.matchedPatterns,
        });
      }
      return {
        ...msg,
        content: result.sanitizedContent,
      };
    }
    return msg;
  });
}

/**
 * Validate that the message doesn't try to manipulate the system
 */
export function isValidUserMessage(content: string): boolean {
  const result = checkForInjection(content);
  return !result.isBlocked;
}

