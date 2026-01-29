# API Documentation Strategy

## Overview

This document describes the documentation strategy, tools, standards, and conventions used for the AI Bank API documentation.

## Documentation Approach

### Manual Specification with Type Safety

Since we use Next.js API routes (not a traditional backend framework), we've chosen a **hybrid approach**:

1. **OpenAPI Specification (YAML)** - Manually created and maintained
2. **TypeScript Types** - Used for runtime validation and type safety
3. **Markdown Documentation** - Human-readable reference documentation

This approach provides:
- ✅ Industry-standard OpenAPI 3.1.0 specification
- ✅ Validation using standard tools (Swagger CLI, Spectral)
- ✅ Type safety through TypeScript
- ✅ Human-readable documentation
- ✅ Easy to maintain and update

## Tools and Standards

### OpenAPI Specification

- **Format**: OpenAPI 3.1.0 (YAML)
- **Location**: `docs/openapi.yaml`
- **Validation Tool**: `@apidevtools/swagger-cli`
- **Alternative Tools**: 
  - Swagger Editor (online): https://editor.swagger.io/
  - Spectral (linting): https://stoplight.io/open-source/spectral
  - Redocly CLI: `@redocly/cli`

### Validation Commands

```bash
# Validate OpenAPI specification
npm run docs:validate

# Bundle specification (resolve $ref)
npm run docs:bundle
```

### Documentation Structure

```
docs/
├── openapi.yaml              # OpenAPI 3.1.0 specification
├── API_DOCUMENTATION.md      # Human-readable API reference
├── DOCUMENTATION_STRATEGY.md # This file
├── ai/                       # AI features documentation
├── analytics/                # Analytics documentation
└── realtime/                 # Real-time features documentation
```

## Naming Conventions

### Endpoints

- **Format**: RESTful, lowercase with hyphens
- **Examples**: 
  - `/api/chat` (not `/api/Chat` or `/api/chatEndpoint`)
  - `/api/realtime/stream` (not `/api/realtimeStream`)

### Schema Names

- **Format**: PascalCase
- **Examples**: 
  - `ChatRequest`, `ChatResponse`
  - `RealtimeStateRequest`, `RealtimeStateResponse`
  - `Message`, `Contact`, `BlockData`

### Operation IDs

- **Format**: `{method}{Resource}` (camelCase)
- **Examples**:
  - `postChat` (POST /chat)
  - `getRealtimeStream` (GET /realtime/stream)
  - `postRealtimeState` (POST /realtime/state)

### Field Names

- **Format**: camelCase
- **Examples**: `gasPriceGwei`, `lastEventTime`, `connectionStatus`

## Versioning Approach

### API Versioning

- **Current Version**: 1.0.0
- **Strategy**: URL-based versioning (future)
  - Current: `/api/chat`
  - Future: `/api/v1/chat`, `/api/v2/chat`

### Specification Versioning

- **OpenAPI Version**: 3.1.0
- **File Versioning**: Git-based (no separate versioning needed)
- **Changelog**: Documented in commit messages and release notes

## Formatting Rules

### YAML Formatting

- **Indentation**: 2 spaces
- **Line Length**: Maximum 100 characters (soft limit)
- **Quotes**: Only when necessary (for special characters)
- **Arrays**: Inline for short arrays, multi-line for long arrays

### Code Examples

- **Language**: JavaScript/TypeScript for client examples
- **Format**: Code blocks with syntax highlighting
- **Real-world**: All examples use real data structures and patterns

### Documentation Comments

- **Style**: Clear, concise, technical
- **Include**: Purpose, parameters, return values, errors
- **Examples**: Always include at least one example per endpoint

## Schema Definitions

### Reusability

- Common schemas defined in `components/schemas`
- Referenced using `$ref: '#/components/schemas/SchemaName'`
- Examples:
  - `Message`, `Contact` (used in multiple endpoints)
  - `ErrorResponse` (standard error format)

### Type Mapping

| TypeScript Type | OpenAPI Type | Notes |
|----------------|--------------|-------|
| `string` | `type: string` | Standard |
| `number` | `type: number` | Standard |
| `boolean` | `type: boolean` | Standard |
| `Date` | `type: integer, format: int64` | Unix timestamp (ms) |
| `BigInt` | `type: string` | Serialized as string |
| `0x${string}` | `type: string, pattern: '^0x...'` | Ethereum address |

## Error Handling Documentation

### Standard Error Format

All errors follow the `ErrorResponse` schema:

```yaml
ErrorResponse:
  type: object
  required:
    - error
  properties:
    error: string          # Human-readable message
    type: string          # Error type enum
    retryable: boolean    # Can retry?
    retryAfter: integer   # Seconds to wait
    details: array        # Additional details
```

### HTTP Status Codes

- **200 OK**: Success
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Authentication required
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

## Authentication Documentation

### JWT Authentication

- **Method 1**: `Authorization: Bearer <token>` header
- **Method 2**: `token=<token>` cookie
- **Token Format**: JWT (JSON Web Token)
- **Expiration**: 15 minutes
- **Refresh**: Via `/api/auth/refresh` endpoint

### Security Schemes

Defined in `components/securitySchemes`:
- `bearerAuth`: HTTP Bearer token
- `cookieAuth`: API key in cookie

## Examples and Tutorials

### Example Requirements

Each endpoint must include:
1. **Request Example**: Real-world usage
2. **Response Example**: Typical response
3. **Error Example**: Common error scenarios
4. **Edge Cases**: Boundary conditions

### Integration Tutorial

Located in: `docs/INTEGRATION_TUTORIAL.md`

Covers:
- Authentication flow
- Making first API call
- Handling streaming responses (SSE)
- Error handling
- Token refresh

## Maintenance and Updates

### Update Process

1. **Code Changes**: Update API route implementation
2. **OpenAPI Update**: Update `docs/openapi.yaml`
3. **Validation**: Run `npm run docs:validate`
4. **Markdown Update**: Update `docs/API_DOCUMENTATION.md` if needed
5. **Review**: Check examples are still accurate

### Review Checklist

- [ ] OpenAPI spec validates without errors
- [ ] All endpoints documented
- [ ] Request/response examples included
- [ ] Error responses documented
- [ ] TypeScript types match OpenAPI schemas
- [ ] Examples are accurate and testable

## Known Gaps and Limitations

### Current Limitations

1. **Manual Maintenance**: OpenAPI spec is manually maintained (not auto-generated)
   - **Impact**: Requires discipline to keep in sync with code
   - **Mitigation**: Validation scripts and review process

2. **No Auto-generation**: Cannot automatically generate from TypeScript types
   - **Impact**: Manual updates required
   - **Future**: Consider tools like `typescript-json-schema` + `json-schema-to-openapi`

3. **SSE Documentation**: Server-Sent Events are harder to document in OpenAPI
   - **Impact**: SSE format documented in examples and notes
   - **Mitigation**: Clear examples and client implementation code

4. **No Interactive UI**: No Swagger UI deployed
   - **Impact**: Developers must use external tools
   - **Future**: Consider deploying Swagger UI or Redoc

### Future Improvements

1. **Auto-generation**: Explore tools to generate OpenAPI from TypeScript
2. **Swagger UI**: Deploy interactive API documentation
3. **API Versioning**: Implement URL-based versioning
4. **Postman Collection**: Generate from OpenAPI spec
5. **SDK Generation**: Generate client SDKs from OpenAPI spec

## Validation and Quality Assurance

### Validation Tools

1. **Swagger CLI**: `npm run docs:validate`
2. **Swagger Editor**: Online validation at https://editor.swagger.io/
3. **Spectral**: Linting rules (future)

### Quality Metrics

- ✅ All endpoints documented
- ✅ All request/response schemas defined
- ✅ Examples for all endpoints
- ✅ Error responses documented
- ✅ Authentication documented
- ✅ Type safety maintained

## References

- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Swagger Documentation](https://swagger.io/docs/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT Authentication](https://jwt.io/)

## Last Updated

- **Date**: 2026-01-06
- **Version**: 1.0.0
- **Maintainer**: Development Team
