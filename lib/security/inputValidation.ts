/**
 * Input Validation
 * Validates message structure, length, and format
 */

// Configuration
export const VALIDATION_CONFIG = {
  // Message limits
  MAX_MESSAGE_LENGTH: 4000, // Max characters per message
  MIN_MESSAGE_LENGTH: 1, // Min characters per message
  MAX_MESSAGES_COUNT: 50, // Max messages in conversation history
  MAX_TOTAL_CHARS: 100000, // Max total characters in conversation
  
  // Role validation
  VALID_ROLES: ["system", "user", "assistant", "tool"] as const,
  
  // Content type validation
  MAX_CONTENT_PARTS: 10, // Max parts in multi-part message
};

export type ValidRole = typeof VALIDATION_CONFIG.VALID_ROLES[number];

export interface Message {
  role: string;
  content: string;
  id?: string;
  [key: string]: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  sanitizedMessages?: Message[];
}

/**
 * Validate a single message
 */
export function validateMessage(message: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check message is an object
  if (!message || typeof message !== "object") {
    errors.push({
      field: `messages[${index}]`,
      message: "Message must be an object",
      value: typeof message,
    });
    return errors;
  }
  
  // Check role exists and is valid
  if (!message.role) {
    errors.push({
      field: `messages[${index}].role`,
      message: "Message role is required",
    });
  } else if (!VALIDATION_CONFIG.VALID_ROLES.includes(message.role)) {
    errors.push({
      field: `messages[${index}].role`,
      message: `Invalid role. Must be one of: ${VALIDATION_CONFIG.VALID_ROLES.join(", ")}`,
      value: message.role,
    });
  }
  
  // Check content exists
  if (message.content === undefined || message.content === null) {
    errors.push({
      field: `messages[${index}].content`,
      message: "Message content is required",
    });
  } else if (typeof message.content !== "string") {
    // Content might be an array for multi-modal messages
    if (!Array.isArray(message.content)) {
      errors.push({
        field: `messages[${index}].content`,
        message: "Message content must be a string or array",
        value: typeof message.content,
      });
    }
  } else {
    // Validate content length
    if (message.content.length < VALIDATION_CONFIG.MIN_MESSAGE_LENGTH && message.role === "user") {
      errors.push({
        field: `messages[${index}].content`,
        message: "Message content is too short",
        value: message.content.length,
      });
    }
    
    if (message.content.length > VALIDATION_CONFIG.MAX_MESSAGE_LENGTH) {
      errors.push({
        field: `messages[${index}].content`,
        message: `Message content exceeds maximum length of ${VALIDATION_CONFIG.MAX_MESSAGE_LENGTH} characters`,
        value: message.content.length,
      });
    }
  }
  
  return errors;
}

/**
 * Validate messages array
 */
export function validateMessages(messages: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  
  // Check messages is an array
  if (!messages) {
    errors.push({
      field: "messages",
      message: "Messages array is required",
    });
    return { isValid: false, errors, warnings };
  }
  
  if (!Array.isArray(messages)) {
    errors.push({
      field: "messages",
      message: "Messages must be an array",
      value: typeof messages,
    });
    return { isValid: false, errors, warnings };
  }
  
  // Check messages count
  if (messages.length === 0) {
    errors.push({
      field: "messages",
      message: "At least one message is required",
    });
    return { isValid: false, errors, warnings };
  }
  
  if (messages.length > VALIDATION_CONFIG.MAX_MESSAGES_COUNT) {
    errors.push({
      field: "messages",
      message: `Too many messages. Maximum is ${VALIDATION_CONFIG.MAX_MESSAGES_COUNT}`,
      value: messages.length,
    });
  }
  
  // Calculate total content size
  let totalChars = 0;
  
  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    const messageErrors = validateMessage(messages[i], i);
    errors.push(...messageErrors);
    
    if (messages[i]?.content && typeof messages[i].content === "string") {
      totalChars += messages[i].content.length;
    }
  }
  
  // Check total conversation size
  if (totalChars > VALIDATION_CONFIG.MAX_TOTAL_CHARS) {
    errors.push({
      field: "messages",
      message: `Total conversation size exceeds maximum of ${VALIDATION_CONFIG.MAX_TOTAL_CHARS} characters`,
      value: totalChars,
    });
  }
  
  // Add warnings for edge cases
  if (messages.length > 30) {
    warnings.push("Large conversation history may slow down responses");
  }
  
  if (totalChars > 50000) {
    warnings.push("Large conversation size may increase response time and cost");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedMessages: errors.length === 0 ? messages : undefined,
  };
}

/**
 * Truncate message content to max length
 */
export function truncateMessage(content: string, maxLength: number = VALIDATION_CONFIG.MAX_MESSAGE_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Truncate conversation history to fit within limits
 */
export function truncateConversation(
  messages: Message[],
  maxMessages: number = VALIDATION_CONFIG.MAX_MESSAGES_COUNT
): Message[] {
  if (messages.length <= maxMessages) {
    return messages;
  }
  
  // Keep system message if present
  const systemMessage = messages.find(m => m.role === "system");
  const nonSystemMessages = messages.filter(m => m.role !== "system");
  
  // Keep most recent messages
  const recentMessages = nonSystemMessages.slice(-(maxMessages - (systemMessage ? 1 : 0)));
  
  return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `${e.field}: ${e.message}`).join("; ");
}

