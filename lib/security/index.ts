/**
 * Security utilities for API protection
 */

// Prompt injection protection
export {
  checkForInjection,
  sanitizeMessage,
  sanitizeMessages,
  isValidUserMessage,
  type FilterResult,
} from "./promptFilter";

// Rate limiting
export {
  checkRateLimit,
  getClientIdentifier,
  addRateLimitHeaders,
  cleanupRateLimitStore,
  getRateLimitStats,
  type RateLimitResult,
} from "./rateLimiter";

// Input validation
export {
  validateMessage,
  validateMessages,
  truncateMessage,
  truncateConversation,
  formatValidationErrors,
  VALIDATION_CONFIG,
  type Message,
  type ValidationError,
  type ValidationResult,
} from "./inputValidation";

// Content moderation
export {
  moderateContent,
  shouldBlockContent,
  getBlockedContentResponse,
  moderateMessages,
  type ModerationResult,
} from "./contentModeration";

// API error handling
export {
  categorizeError,
  withTimeout,
  createTimeoutController,
  withRetry,
  createErrorResponse,
  logAPIError,
  APIErrorType,
  ERROR_CONFIG,
  type APIError,
} from "./apiErrorHandler";
