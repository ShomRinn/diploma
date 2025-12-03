/**
 * API Error Handler
 * Handles timeouts, retries, and error categorization for AI API calls
 */

// Error types
export enum APIErrorType {
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  AUTH_ERROR = "AUTH_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  MODEL_OVERLOADED = "MODEL_OVERLOADED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  CONTENT_FILTER = "CONTENT_FILTER",
  CONTEXT_LENGTH = "CONTEXT_LENGTH",
  UNKNOWN = "UNKNOWN",
}

export interface APIError {
  type: APIErrorType;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number; // seconds
  originalError?: any;
}

// Configuration
export const ERROR_CONFIG = {
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
};

/**
 * Categorize error from OpenAI or other AI providers
 */
export function categorizeError(error: any): APIError {
  const errorMessage = error?.message || error?.toString() || "Unknown error";
  const statusCode = error?.status || error?.statusCode || 500;
  
  // Timeout errors
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("aborted") ||
    error?.name === "AbortError"
  ) {
    return {
      type: APIErrorType.TIMEOUT,
      message: errorMessage,
      userMessage: "The request took too long. Please try again.",
      statusCode: 408,
      retryable: true,
    };
  }
  
  // Rate limit errors (429)
  if (statusCode === 429 || errorMessage.includes("rate limit")) {
    const retryAfter = error?.headers?.["retry-after"] || 60;
    return {
      type: APIErrorType.RATE_LIMIT,
      message: errorMessage,
      userMessage: "Too many requests. Please wait a moment and try again.",
      statusCode: 429,
      retryable: true,
      retryAfter: parseInt(retryAfter),
    };
  }
  
  // Authentication errors (401, 403)
  if (statusCode === 401 || statusCode === 403 || errorMessage.includes("api key")) {
    return {
      type: APIErrorType.AUTH_ERROR,
      message: errorMessage,
      userMessage: "Authentication error. Please contact support.",
      statusCode,
      retryable: false,
    };
  }
  
  // Invalid request (400)
  if (statusCode === 400) {
    return {
      type: APIErrorType.INVALID_REQUEST,
      message: errorMessage,
      userMessage: "Invalid request. Please try rephrasing your message.",
      statusCode: 400,
      retryable: false,
    };
  }
  
  // Model overloaded (503 from OpenAI)
  if (
    statusCode === 503 ||
    errorMessage.includes("overloaded") ||
    errorMessage.includes("capacity")
  ) {
    return {
      type: APIErrorType.MODEL_OVERLOADED,
      message: errorMessage,
      userMessage: "The AI service is currently busy. Please try again in a moment.",
      statusCode: 503,
      retryable: true,
      retryAfter: 5,
    };
  }
  
  // Service unavailable (502, 503, 504)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      type: APIErrorType.SERVICE_UNAVAILABLE,
      message: errorMessage,
      userMessage: "The AI service is temporarily unavailable. Please try again later.",
      statusCode,
      retryable: true,
    };
  }
  
  // Content filter triggered
  if (
    errorMessage.includes("content_filter") ||
    errorMessage.includes("content_policy")
  ) {
    return {
      type: APIErrorType.CONTENT_FILTER,
      message: errorMessage,
      userMessage: "Your message was flagged by content filters. Please rephrase.",
      statusCode: 400,
      retryable: false,
    };
  }
  
  // Context length exceeded
  if (
    errorMessage.includes("context_length") ||
    errorMessage.includes("maximum context") ||
    errorMessage.includes("too long")
  ) {
    return {
      type: APIErrorType.CONTEXT_LENGTH,
      message: errorMessage,
      userMessage: "Conversation is too long. Please start a new chat.",
      statusCode: 400,
      retryable: false,
    };
  }
  
  // Unknown error
  return {
    type: APIErrorType.UNKNOWN,
    message: errorMessage,
    userMessage: "An unexpected error occurred. Please try again.",
    statusCode: statusCode || 500,
    retryable: true,
    originalError: error,
  };
}

/**
 * Create a timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = ERROR_CONFIG.DEFAULT_TIMEOUT_MS,
  timeoutMessage: string = "Request timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number = ERROR_CONFIG.DEFAULT_TIMEOUT_MS): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return {
    controller,
    timeoutId,
    clear: () => clearTimeout(timeoutId),
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: APIError) => boolean;
    onRetry?: (attempt: number, error: APIError) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = ERROR_CONFIG.MAX_RETRIES,
    initialDelay = ERROR_CONFIG.INITIAL_RETRY_DELAY_MS,
    maxDelay = ERROR_CONFIG.MAX_RETRY_DELAY_MS,
    shouldRetry = (e) => e.retryable,
    onRetry,
  } = options;
  
  let lastError: APIError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = categorizeError(error);
      
      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );
        
        // Use retryAfter from error if available
        const actualDelay = lastError.retryAfter 
          ? lastError.retryAfter * 1000 
          : delay;
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        console.log(`[API] Retry ${attempt + 1}/${maxRetries} after ${actualDelay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      } else {
        break;
      }
    }
  }
  
  throw lastError;
}

/**
 * Create error response for API
 */
export function createErrorResponse(error: APIError): Response {
  return new Response(
    JSON.stringify({
      error: error.userMessage,
      type: error.type,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
    }),
    {
      status: error.statusCode,
      headers: {
        "Content-Type": "application/json",
        ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
      },
    }
  );
}

/**
 * Log error with context
 */
export function logAPIError(error: APIError, context?: Record<string, any>): void {
  console.error("[API Error]", {
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    retryable: error.retryable,
    ...context,
  });
}

