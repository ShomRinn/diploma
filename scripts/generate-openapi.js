/**
 * OpenAPI Specification Generator
 * 
 * Generates OpenAPI 3.1.0 spec from Zod schemas.
 * Run with: npm run docs:generate
 */

const { z } = require('zod');
const { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } = require('@asteasolutions/zod-to-openapi');
const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .openapi({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Ethereum address (42 characters, starting with 0x)',
  });

const NetworkIdSchema = z
  .enum([
    'ethereum',
    'linea-mainnet',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'linea-sepolia',
    'sepolia',
  ])
  .openapi({
    example: 'ethereum',
    description: 'Blockchain network identifier',
  });

// Chat API Schemas
const MessageSchema = z
  .object({
    role: z.enum(['user', 'assistant', 'system']).openapi({
      description: 'Message role',
      example: 'user',
    }),
    content: z.string().min(1).max(10000).openapi({
      description: 'Message content',
      example: 'What is my balance?',
    }),
  })
  .openapi('Message');

const ContactSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({
      description: 'Contact name',
      example: 'Alice',
    }),
    address: EthereumAddressSchema.openapi({
      description: 'Contact Ethereum address',
    }),
  })
  .openapi('Contact');

const ChatRequestSchema = z
  .object({
    messages: z.array(MessageSchema).min(1).openapi({
      description: 'Array of message objects',
    }),
    contacts: z.array(ContactSchema).optional().default([]).openapi({
      description: 'Array of contact objects for AI context',
    }),
  })
  .openapi('ChatRequest');

// Realtime API Schemas
const BlockDataSchema = z
  .object({
    number: z.string().openapi({
      description: 'Block number as string',
      example: '18500000',
    }),
    hash: z.string().openapi({
      description: 'Block hash',
      example: '0x1234...abcd',
    }),
    timestamp: z.string().openapi({
      description: 'Block timestamp as string',
      example: '1234567890',
    }),
    transactionCount: z.number().int().openapi({
      description: 'Number of transactions in block',
      example: 150,
    }),
  })
  .nullable()
  .openapi('BlockData');

const GasInfoSchema = z
  .object({
    gasPriceGwei: z.number().openapi({
      description: 'Current gas price in Gwei',
      example: 25.5,
    }),
    baseFeeGwei: z.number().nullable().openapi({
      description: 'Base fee in Gwei',
      example: 20.0,
    }),
    priorityFeeGwei: z.number().openapi({
      description: 'Priority fee in Gwei',
      example: 5.5,
    }),
    networkLoad: z.number().min(0).max(1).openapi({
      description: 'Network load (0.0 to 1.0)',
      example: 0.75,
    }),
    trend: z.enum(['up', 'down', 'stable']).openapi({
      description: 'Gas price trend',
      example: 'up',
    }),
    history: z
      .array(
        z.object({
          timestamp: z.number().openapi({ example: 1234567800 }),
          gwei: z.number().openapi({ example: 24.0 }),
        })
      )
      .optional()
      .openapi({
        description: 'Historical gas prices',
      }),
  })
  .nullable()
  .openapi('GasInfo');

const ServiceStatsSchema = z
  .object({
    blocksReceived: z.number().int().openapi({
      description: 'Total blocks received',
      example: 100,
    }),
    eventsReceived: z.number().int().openapi({
      description: 'Total events received',
      example: 250,
    }),
    uptime: z.number().int().openapi({
      description: 'Service uptime in seconds',
      example: 3600,
    }),
  })
  .nullable()
  .openapi('ServiceStats');

const RealtimeStateResponseSchema = z
  .object({
    success: z.boolean().openapi({
      description: 'Request success status',
      example: true,
    }),
    timestamp: z.number().int().openapi({
      description: 'Server timestamp in milliseconds',
      example: 1234567890000,
    }),
    data: z
      .object({
        connectionStatus: z.enum(['connected', 'disconnected', 'connecting']).openapi({
          example: 'connected',
        }),
        lastEventTime: z.number().nullable().openapi({
          description: 'Last event timestamp',
          example: 1234567890,
        }),
        latestBlock: BlockDataSchema,
        gasInfo: GasInfoSchema,
        stats: ServiceStatsSchema,
      })
      .nullable()
      .openapi({
        description: 'State data (null on error)',
      }),
    message: z.string().optional().openapi({
      description: 'Success message (for POST requests)',
      example: 'Service started',
    }),
    error: z.string().optional().openapi({
      description: 'Error message (for error responses)',
      example: 'Failed to get realtime state',
    }),
  })
  .openapi('RealtimeStateResponse');

const RealtimeStateRequestSchema = z
  .object({
    action: z.enum(['start', 'stop']).openapi({
      description: 'Action to perform',
      example: 'start',
    }),
    address: EthereumAddressSchema.optional().openapi({
      description: 'Wallet address to watch (only for start action)',
    }),
  })
  .openapi('RealtimeStateRequest');

// Auth API Schemas
const RefreshTokenResponseSchema = z
  .object({
    token: z.string().openapi({
      description: 'New JWT token',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    expiresAt: z.number().int().openapi({
      description: 'Token expiration timestamp in milliseconds',
      example: 1234567890000,
    }),
  })
  .openapi('RefreshTokenResponse');

// Error Schemas
const ErrorTypeSchema = z.enum([
  'TIMEOUT',
  'RATE_LIMIT',
  'AUTH_ERROR',
  'INVALID_REQUEST',
  'MODEL_OVERLOADED',
  'SERVICE_UNAVAILABLE',
  'CONTENT_FILTER',
  'CONTEXT_LENGTH',
  'UNKNOWN',
]);

const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: 'Human-readable error message',
      example: 'Invalid request',
    }),
    type: ErrorTypeSchema.optional().openapi({
      description: 'Error type',
      example: 'INVALID_REQUEST',
    }),
    retryable: z.boolean().optional().openapi({
      description: 'Whether the request can be retried',
      example: true,
    }),
    retryAfter: z.number().int().optional().openapi({
      description: 'Seconds to wait before retrying',
      example: 60,
    }),
    details: z.array(z.string()).optional().openapi({
      description: 'Additional error details',
      example: ['Messages array is required'],
    }),
    blocked: z.boolean().optional().openapi({
      description: 'Whether content was blocked by moderation',
      example: false,
    }),
  })
  .openapi('ErrorResponse');

// =============================================================================
// REGISTRY SETUP
// =============================================================================

const registry = new OpenAPIRegistry();

// Register security schemes
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token in Authorization header',
});

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'token',
  description: 'JWT token in cookie',
});

// Register schemas
registry.register('Message', MessageSchema);
registry.register('Contact', ContactSchema);
registry.register('ChatRequest', ChatRequestSchema);
registry.register('BlockData', BlockDataSchema);
registry.register('GasInfo', GasInfoSchema);
registry.register('ServiceStats', ServiceStatsSchema);
registry.register('RealtimeStateResponse', RealtimeStateResponseSchema);
registry.register('RealtimeStateRequest', RealtimeStateRequestSchema);
registry.register('RefreshTokenResponse', RefreshTokenResponseSchema);
registry.register('ErrorResponse', ErrorResponseSchema);

// =============================================================================
// ENDPOINT REGISTRATION
// =============================================================================

// POST /api/chat
registry.registerPath({
  method: 'post',
  path: '/chat',
  tags: ['Chat'],
  summary: 'Send messages to AI assistant',
  description: `Sends messages to the AI assistant and receives streaming responses via Server-Sent Events (SSE).
Supports rate limiting, content moderation, and prompt injection protection.`,
  operationId: 'postChat',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Streaming response from AI assistant',
      headers: {
        'X-RateLimit-Limit': {
          schema: { type: 'integer' },
          description: 'Maximum requests allowed',
        },
        'X-RateLimit-Remaining': {
          schema: { type: 'integer' },
          description: 'Remaining requests in current window',
        },
        'X-RateLimit-Reset': {
          schema: { type: 'integer' },
          description: 'Timestamp when rate limit resets',
        },
      },
      content: {
        'text/event-stream': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    400: {
      description: 'Bad request - invalid input',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/realtime/stream
registry.registerPath({
  method: 'get',
  path: '/realtime/stream',
  tags: ['Realtime'],
  summary: 'Real-time blockchain data stream',
  description: `Establishes a Server-Sent Events (SSE) connection for real-time blockchain data streaming.
Server sends ping messages every 30 seconds to maintain connection.`,
  operationId: 'getRealtimeStream',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: z.object({
      network: NetworkIdSchema.optional().openapi({
        description: 'Network ID to monitor',
        example: 'ethereum',
      }),
      address: EthereumAddressSchema.optional().openapi({
        description: 'Wallet address to watch for transactions',
      }),
    }),
  },
  responses: {
    200: {
      description: 'SSE stream with real-time blockchain events',
      content: {
        'text/event-stream': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/realtime/state
registry.registerPath({
  method: 'get',
  path: '/realtime/state',
  tags: ['Realtime'],
  summary: 'Get real-time service state',
  description: 'Retrieves the current state of the real-time blockchain service',
  operationId: 'getRealtimeState',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: 'Current service state',
      content: {
        'application/json': {
          schema: RealtimeStateResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/realtime/state
registry.registerPath({
  method: 'post',
  path: '/realtime/state',
  tags: ['Realtime'],
  summary: 'Control real-time service',
  description: 'Starts or stops the real-time blockchain service',
  operationId: 'postRealtimeState',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RealtimeStateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Action result',
      content: {
        'application/json': {
          schema: RealtimeStateResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/auth/refresh
registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Auth'],
  summary: 'Refresh JWT token',
  description: `Refreshes an expired JWT token using a refresh token from cookie.
Returns a new JWT token and sets it in a cookie.`,
  operationId: 'postAuthRefresh',
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'New token issued',
      content: {
        'application/json': {
          schema: RefreshTokenResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// =============================================================================
// GENERATE SPEC
// =============================================================================

const generator = new OpenApiGeneratorV31(registry.definitions);

const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'AI Bank API',
    version: '1.0.0',
    description: `REST API for AI-powered cryptocurrency wallet management.
All endpoints require JWT authentication via Authorization header or token cookie.

## Authentication
- **Bearer Token**: Include JWT in \`Authorization: Bearer <token>\` header
- **Cookie**: JWT is also accepted from the \`token\` cookie

## Rate Limiting
- Chat endpoint: 10 requests per minute per client
- Rate limit headers are included in responses

## Streaming Responses
- Chat and realtime endpoints use Server-Sent Events (SSE)
- Content-Type: \`text/event-stream\``,
    contact: {
      name: 'API Support',
      email: 'support@aibank.example',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
    {
      url: 'https://api.aibank.example',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Chat',
      description: 'AI assistant chat endpoints',
    },
    {
      name: 'Realtime',
      description: 'Real-time blockchain data streaming',
    },
    {
      name: 'Auth',
      description: 'Authentication and token management',
    },
  ],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
});

// =============================================================================
// OUTPUT
// =============================================================================

const outputPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const yamlOutput = yaml.stringify(spec, { indent: 2 });

fs.writeFileSync(outputPath, yamlOutput);

console.log('✅ OpenAPI spec generated successfully!');
console.log(`   Output: ${outputPath}`);
console.log(`   Endpoints: ${Object.keys(spec.paths || {}).length}`);
console.log(`   Schemas: ${Object.keys(spec.components?.schemas || {}).length}`);
