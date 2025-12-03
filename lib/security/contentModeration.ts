/**
 * Content Moderation
 * Detects inappropriate, harmful, or offensive content
 */

// Categories of inappropriate content
const INAPPROPRIATE_PATTERNS: Record<string, RegExp[]> = {
  // Hate speech indicators
  hate_speech: [
    /\b(kill|murder|exterminate)\s+(all\s+)?(jews|muslims|christians|blacks|whites|gays|women|men)\b/i,
    /\b(death\s+to)\s+\w+/i,
    /\bracial\s+(cleansing|purity)\b/i,
  ],
  
  // Violence/threats
  violence: [
    /\b(i('ll|'m going to)|we('ll| should))\s+(kill|murder|shoot|stab|bomb|attack)\b/i,
    /\b(bomb|explosive)\s+(instructions?|recipe|how\s+to\s+make)\b/i,
    /\bhow\s+to\s+(make|build)\s+(a\s+)?(bomb|weapon|gun)/i,
  ],
  
  // Self-harm
  self_harm: [
    /\bhow\s+to\s+(commit\s+)?suicide\b/i,
    /\bbest\s+way\s+to\s+(kill|hurt)\s+(myself|yourself)\b/i,
    /\bsuicide\s+(methods?|instructions?)\b/i,
  ],
  
  // Illegal activities related to crypto
  illegal_crypto: [
    /\bhow\s+to\s+(launder|wash)\s+(money|crypto|bitcoin|eth)\b/i,
    /\b(money\s+laundering)\s+(tutorial|guide|instructions?)\b/i,
    /\bhow\s+to\s+(hack|steal)\s+(wallet|crypto|bitcoin|eth|funds)\b/i,
    /\bscam\s+(people|users|victims)\b/i,
    /\brug\s*pull\s+(guide|tutorial|how)/i,
  ],
  
  // Phishing/scam
  scam_phishing: [
    /\bsend\s+(me\s+)?your\s+(private\s+key|seed\s+phrase|recovery\s+phrase)/i,
    /\bshare\s+(your\s+)?(private\s+key|seed\s+phrase)/i,
    /\b(give|tell)\s+(me\s+)?(your\s+)?(password|credentials|keys)/i,
  ],
};

// Spam patterns
const SPAM_PATTERNS: RegExp[] = [
  // Repeated characters
  /(.)\1{10,}/i, // Same character repeated 10+ times
  // Repeated words
  /\b(\w+)\s+\1\s+\1\s+\1\s+\1/i, // Same word 5+ times
  // URL spam
  /(https?:\/\/[^\s]+\s*){5,}/i, // 5+ URLs in a message
  // All caps abuse
  /^[A-Z\s!?]{50,}$/, // 50+ characters all caps
];

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  severity: "none" | "low" | "medium" | "high";
  reason?: string;
  action: "allow" | "warn" | "block";
}

/**
 * Check content for inappropriate material
 */
export function moderateContent(content: string): ModerationResult {
  const flaggedCategories: string[] = [];
  let severity: ModerationResult["severity"] = "none";
  
  // Check each category
  for (const [category, patterns] of Object.entries(INAPPROPRIATE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        flaggedCategories.push(category);
        break; // Only flag each category once
      }
    }
  }
  
  // Check spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      flaggedCategories.push("spam");
      break;
    }
  }
  
  // Determine severity and action
  if (flaggedCategories.length === 0) {
    return {
      flagged: false,
      categories: [],
      severity: "none",
      action: "allow",
    };
  }
  
  // High severity categories
  const highSeverity = ["hate_speech", "violence", "self_harm", "illegal_crypto"];
  const mediumSeverity = ["scam_phishing"];
  const lowSeverity = ["spam"];
  
  if (flaggedCategories.some(c => highSeverity.includes(c))) {
    severity = "high";
  } else if (flaggedCategories.some(c => mediumSeverity.includes(c))) {
    severity = "medium";
  } else if (flaggedCategories.some(c => lowSeverity.includes(c))) {
    severity = "low";
  }
  
  // Determine action based on severity
  let action: ModerationResult["action"];
  let reason: string;
  
  switch (severity) {
    case "high":
      action = "block";
      reason = "Content violates usage policy: " + flaggedCategories.join(", ");
      break;
    case "medium":
      action = "block";
      reason = "Potentially harmful content detected: " + flaggedCategories.join(", ");
      break;
    case "low":
      action = "warn";
      reason = "Content may be flagged: " + flaggedCategories.join(", ");
      break;
    default:
      action = "allow";
      reason = "";
  }
  
  return {
    flagged: true,
    categories: flaggedCategories,
    severity,
    reason,
    action,
  };
}

/**
 * Check if content should be blocked
 */
export function shouldBlockContent(content: string): boolean {
  const result = moderateContent(content);
  return result.action === "block";
}

/**
 * Get safe response for blocked content
 */
export function getBlockedContentResponse(categories: string[]): string {
  if (categories.includes("self_harm")) {
    return "I'm concerned about this message. If you're struggling, please reach out to a crisis helpline. I'm here to help with crypto and wallet questions.";
  }
  
  if (categories.includes("illegal_crypto") || categories.includes("scam_phishing")) {
    return "I can't help with that request. I'm designed to assist with legitimate crypto wallet operations only.";
  }
  
  if (categories.includes("hate_speech") || categories.includes("violence")) {
    return "I can't respond to this type of content. Please keep our conversation focused on crypto wallet assistance.";
  }
  
  return "I can't process this request. Please rephrase your question about crypto wallet operations.";
}

/**
 * Moderate an array of messages
 */
export function moderateMessages(
  messages: Array<{ role: string; content: string; [key: string]: any }>
): {
  hasBlockedContent: boolean;
  results: Array<{ index: number; result: ModerationResult }>;
} {
  const results: Array<{ index: number; result: ModerationResult }> = [];
  let hasBlockedContent = false;
  
  messages.forEach((msg, index) => {
    if (msg.role === "user" && msg.content) {
      const result = moderateContent(msg.content);
      if (result.flagged) {
        results.push({ index, result });
        if (result.action === "block") {
          hasBlockedContent = true;
        }
      }
    }
  });
  
  return { hasBlockedContent, results };
}

