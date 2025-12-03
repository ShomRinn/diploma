import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { tools } from "@/ai/tools/index";
import {
  // Rate limiting
  checkRateLimit,
  getClientIdentifier,
  addRateLimitHeaders,
  // Prompt injection
  sanitizeMessages,
  // Input validation
  validateMessages,
  truncateConversation,
  formatValidationErrors,
  // Content moderation
  moderateMessages,
  getBlockedContentResponse,
  // Error handling
  categorizeError,
  createErrorResponse,
  logAPIError,
  APIErrorType,
} from "@/lib/security";

export async function POST(request: Request) {
  const startTime = Date.now();
  
  // 1. Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId);
  
  if (!rateLimitResult.allowed) {
    console.warn('[Security] Rate limit hit for:', clientId, rateLimitResult.reason);
    const headers = new Headers();
    addRateLimitHeaders(headers, rateLimitResult);
    headers.set("Content-Type", "application/json");
    
    return new Response(
      JSON.stringify({
        error: rateLimitResult.reason || "Rate limit exceeded",
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      }),
      {
        status: 429,
        headers,
      }
    );
  }
  
  // 2. Parse request body
  let rawMessages: any;
  try {
    const body = await request.json();
    rawMessages = body.messages;
  } catch (error) {
    console.error('[Chat API] Failed to parse request body:', error);
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log('[Chat API] Received messages:', rawMessages?.length || 0);
  
  // 3. Input validation
  const validationResult = validateMessages(rawMessages);
  
  if (!validationResult.isValid) {
    console.warn('[Security] Validation failed:', validationResult.errors);
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: formatValidationErrors(validationResult.errors),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Log warnings if any
  if (validationResult.warnings.length > 0) {
    console.log('[Chat API] Validation warnings:', validationResult.warnings);
  }
  
  // 4. Content moderation
  const moderationResult = moderateMessages(rawMessages);
  
  if (moderationResult.hasBlockedContent) {
    const blockedResult = moderationResult.results.find(r => r.result.action === "block");
    console.warn('[Security] Content blocked:', blockedResult?.result.categories);
    
    return new Response(
      JSON.stringify({
        error: getBlockedContentResponse(blockedResult?.result.categories || []),
        blocked: true,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Log moderation warnings
  const warnings = moderationResult.results.filter(r => r.result.action === "warn");
  if (warnings.length > 0) {
    console.log('[Chat API] Content warnings:', warnings.map(w => w.result.categories));
  }
  
  // 5. Truncate conversation if too long
  let messages = truncateConversation(rawMessages);
  if (messages.length !== rawMessages.length) {
    console.log('[Chat API] Conversation truncated from', rawMessages.length, 'to', messages.length, 'messages');
  }
  
  // 6. Prompt injection protection
  const sanitizedMessages = sanitizeMessages(messages);
  
  const modifiedCount = messages.filter((msg: any, i: number) => 
    msg.content !== sanitizedMessages[i].content
  ).length;
  
  if (modifiedCount > 0) {
    console.warn('[Security] Filtered', modifiedCount, 'message(s) for potential prompt injection');
  }

  try {
    // Extract wallet address from system message if present
    const systemMessage = sanitizedMessages.find((m: any) => m.role === "system");
    const systemContent = systemMessage?.content || "You are a helpful AI banking assistant.";

    console.log('[Chat API] Processing', sanitizedMessages.filter((m: any) => m.role !== "system").length, 'non-system messages');
    console.log('[Chat API] Available tools:', Object.keys(tools).length);

    // 7. Call AI with timeout handling built into the SDK
    const result = await streamText({
      model: openai("gpt-4o"),
      system: systemContent,
      messages: sanitizedMessages.filter((m: any) => m.role !== "system"),
      maxSteps: 5,
      tools,
      // Note: Vercel AI SDK handles streaming timeouts internally
      // For additional timeout control, you could wrap this in withTimeout()
      onStepFinish: (step) => {
        console.log('[Chat API] Step finished:', step.toolCalls?.length || 0, 'tool calls');
        step.toolCalls?.forEach((toolCall) => {
          console.log('  Tool called:', toolCall.toolName, 'with args:', JSON.stringify(toolCall.args).substring(0, 100));
        });
      },
    });

    // Add rate limit headers to successful response
    const response = result.toDataStreamResponse();
    const headers = new Headers(response.headers);
    addRateLimitHeaders(headers, rateLimitResult);
    
    const duration = Date.now() - startTime;
    console.log('[Chat API] Response completed in', duration, 'ms');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Categorize the error
    const apiError = categorizeError(error);
    logAPIError(apiError, { duration, clientId });
    
    // Special handling for different error types
    switch (apiError.type) {
      case APIErrorType.RATE_LIMIT:
        console.warn('[Chat API] OpenAI rate limit hit');
        break;
      case APIErrorType.CONTEXT_LENGTH:
        console.warn('[Chat API] Context length exceeded - conversation too long');
        break;
      case APIErrorType.CONTENT_FILTER:
        console.warn('[Chat API] OpenAI content filter triggered');
        break;
      case APIErrorType.AUTH_ERROR:
        console.error('[Chat API] Authentication error - check OPENAI_API_KEY');
        break;
      case APIErrorType.TIMEOUT:
        console.warn('[Chat API] Request timed out after', duration, 'ms');
        break;
    }
    
    return createErrorResponse(apiError);
  }
}
