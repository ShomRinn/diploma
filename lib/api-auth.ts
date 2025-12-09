/**
 * API Authentication Middleware
 * Verifies JWT tokens in API requests
 */

import { verifyJWT, extractToken } from './jwt';

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verify request has valid JWT token
 * Returns auth context if valid, null if invalid
 */
export function verifyAuthHeader(request: Request): AuthContext | null {
  try {
    const token = extractToken(request);

    if (!token) {
      console.warn('[API Auth] No token found in request');
      return null;
    }

    const payload = verifyJWT(token);

    if (!payload) {
      console.warn('[API Auth] Token verification failed');
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    console.error('[API Auth] Authentication error:', error);
    return null;
  }
}

/**
 * Create an error response for auth failures
 */
export function createAuthErrorResponse(message: string, status: number = 401) {
  return new Response(
    JSON.stringify({
      error: message,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Middleware wrapper for API routes
 */
export function withAuth(handler: (request: Request, auth: AuthContext) => Promise<Response>) {
  return async (request: Request) => {
    const auth = verifyAuthHeader(request);

    if (!auth) {
      console.warn('[API Auth] Request rejected: invalid or missing token');
      return createAuthErrorResponse('Unauthorized: Invalid or expired token');
    }

    try {
      return await handler(request, auth);
    } catch (error) {
      console.error('[API Auth] Handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
