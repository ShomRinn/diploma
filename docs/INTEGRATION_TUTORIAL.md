# API Integration Tutorial

## Step-by-Step Integration Guide

This tutorial walks you through integrating with the AI Bank API, from authentication to making your first API call.

## Prerequisites

- Node.js 18+ or modern browser
- HTTP client (curl, Postman, or JavaScript fetch)
- Understanding of REST APIs and JWT authentication

## Step 1: User Registration and Login

### 1.1 Register a New User

First, you need to register a user account. This is done through the application UI at `/register`.

**Note**: Registration is handled client-side using IndexedDB. For API integration, you'll need to use the existing authentication system.

### 1.2 Login and Get JWT Token

After registration, login through the application UI at `/login`. The login process:

1. Validates email and password
2. Creates a JWT token (valid for 15 minutes)
3. Creates a refresh token (valid for 7 days)
4. Stores tokens in cookies and localStorage

**Tokens are automatically set in cookies** after login. For API calls, you can use either:
- `Authorization: Bearer <token>` header
- `token=<token>` cookie

## Step 2: Understanding Authentication

### 2.1 Token Storage

After login, tokens are stored in:
- **Cookies**: `token` and `refreshToken` (for server-side access)
- **localStorage**: `token`, `refreshToken`, `userId`, `userEmail` (for client-side access)

### 2.2 Token Expiration

- **JWT Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days

### 2.3 Automatic Token Refresh

The API includes automatic token refresh via fetch interceptor. When a request returns `401 Unauthorized`:

1. Client automatically calls `/api/auth/refresh`
2. New token is issued and stored
3. Original request is retried with new token

**Implementation**: See `lib/fetch-interceptor.ts` and `lib/auth-refresh.ts`

## Step 3: Making Your First API Call

### 3.1 Basic Chat Request

Let's start with a simple chat request to the AI assistant.

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is my balance?"
      }
    ]
  }'
```

**Response** (Streaming):
```
data: {"type":"text","content":"I'll check your balance for you."}

data: {"type":"tool-call","toolName":"displayBalance","args":{}}

data: {"type":"tool-result","result":{"balance":"1.5 ETH"}}

data: {"type":"text","content":"Your current balance is 1.5 ETH."}
```

### 3.2 JavaScript Implementation

```javascript
async function sendChatMessage(message, token) {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Handle streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        console.log('Received:', data);
      }
    }
  }
}

// Usage
await sendChatMessage('What is my balance?', 'YOUR_JWT_TOKEN');
```

## Step 4: Handling Streaming Responses (SSE)

The `/api/chat` endpoint returns Server-Sent Events (SSE). Here's how to handle them:

### 4.1 Using EventSource (Browser)

```javascript
function connectToChat(token) {
  // Note: EventSource doesn't support custom headers in all browsers
  // Use cookie-based auth instead
  
  const eventSource = new EventSource('/api/chat', {
    // Token must be in cookie for EventSource
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Message:', data);
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };
}
```

### 4.2 Using Fetch with ReadableStream

```javascript
async function streamChat(messages, token) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          handleStreamEvent(data);
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

function handleStreamEvent(data) {
  switch (data.type) {
    case 'text':
      console.log('AI:', data.content);
      break;
    case 'tool-call':
      console.log('Tool called:', data.toolName);
      break;
    case 'tool-result':
      console.log('Tool result:', data.result);
      break;
  }
}
```

## Step 5: Real-Time Blockchain Data

### 5.1 Connecting to SSE Stream

```javascript
function connectRealtimeStream(network = 'ethereum', address = null, token) {
  let url = `/api/realtime/stream?network=${network}`;
  if (address) {
    url += `&address=${address}`;
  }

  const eventSource = new EventSource(url);
  // Token must be in cookie for EventSource

  eventSource.addEventListener('connection', (event) => {
    const data = JSON.parse(event.data);
    console.log('Connected:', data.data.message);
  });

  eventSource.addEventListener('block', (event) => {
    const data = JSON.parse(event.data);
    console.log('New block:', data.data.number);
  });

  eventSource.addEventListener('gas_update', (event) => {
    const data = JSON.parse(event.data);
    console.log('Gas price:', data.data.gasPriceGwei, 'Gwei');
  });

  eventSource.addEventListener('transaction', (event) => {
    const data = JSON.parse(event.data);
    console.log('Transaction:', data.data.hash);
  });

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // Auto-reconnect handled by useRealtimeBlockchain hook
  };

  return eventSource;
}
```

### 5.2 Getting Current State

```javascript
async function getRealtimeState(token) {
  const response = await fetch('/api/realtime/state', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Usage
const state = await getRealtimeState('YOUR_JWT_TOKEN');
console.log('Connection status:', state.data.connectionStatus);
console.log('Latest block:', state.data.latestBlock?.number);
console.log('Gas price:', state.data.gasInfo?.gasPriceGwei);
```

## Step 6: Error Handling

### 6.1 Handling Authentication Errors

```javascript
async function apiCall(url, options, token) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // Handle 401 - try to refresh token
  if (response.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      // Retry with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
    } else {
      // Redirect to login
      window.location.href = '/login';
      return;
    }
  }

  return response;
}

async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  // Update token in storage
  localStorage.setItem('token', data.token);
  return data.token;
}
```

### 6.2 Handling Rate Limits

```javascript
async function handleRateLimit(response) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 
                      (await response.json()).retryAfter;
    
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return true; // Indicates should retry
  }
  return false;
}
```

### 6.3 Complete Error Handling

```javascript
async function makeApiCall(url, options, token) {
  try {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    // Handle rate limiting
    if (await handleRateLimit(response)) {
      return makeApiCall(url, options, token); // Retry
    }

    // Handle authentication errors
    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        return makeApiCall(url, options, newToken); // Retry with new token
      }
      throw new Error('Authentication failed');
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## Step 7: Complete Integration Example

Here's a complete example of a chat client:

```javascript
class AIChatClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async sendMessage(message, contacts = []) {
    const response = await this.makeRequest('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        contacts,
      }),
    });

    return this.handleStreamResponse(response);
  }

  async *handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            yield data;
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  }

  async makeRequest(path, options) {
    let response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (response.status === 401) {
      this.token = await this.refreshToken();
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.token}`,
        },
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  async refreshToken() {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.token;
  }
}

// Usage
const client = new AIChatClient('http://localhost:3000/api', 'YOUR_TOKEN');

for await (const event of await client.sendMessage('What is my balance?')) {
  if (event.type === 'text') {
    console.log('AI:', event.content);
  }
}
```

## Step 8: Testing Your Integration

### 8.1 Test Authentication

```bash
# Test token refresh
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN" \
  -H "Content-Type: application/json"
```

### 8.2 Test Chat Endpoint

```bash
# Test chat with authentication
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### 8.3 Test Realtime State

```bash
# Get realtime state
curl http://localhost:3000/api/realtime/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues and Solutions

### Issue: 401 Unauthorized

**Solution**: 
- Check token is valid and not expired
- Use token refresh endpoint
- Ensure token is in Authorization header or cookie

### Issue: SSE Connection Fails

**Solution**:
- EventSource requires cookie-based auth (can't set custom headers)
- Ensure `token` cookie is set
- Check CORS settings if calling from different origin

### Issue: Rate Limit Exceeded

**Solution**:
- Check `X-RateLimit-Remaining` header
- Wait for `X-RateLimit-Reset` timestamp
- Implement exponential backoff

### Issue: Streaming Response Not Parsing

**Solution**:
- Handle incomplete chunks (buffer remaining data)
- Check for `data: ` prefix before parsing
- Handle multiple events in single chunk

## Next Steps

1. **Explore More Endpoints**: See `docs/API_DOCUMENTATION.md`
2. **Review OpenAPI Spec**: See `docs/openapi.yaml`
3. **Check Examples**: See `docs/ai/EXAMPLE_CONVERSATIONS.md`
4. **Read Security Docs**: See `docs/SECURITY_ANALYSIS.md`

## Support

For issues or questions:
- Check API documentation: `docs/API_DOCUMENTATION.md`
- Review OpenAPI specification: `docs/openapi.yaml`
- Validate your requests using Swagger Editor: https://editor.swagger.io/
