/**
 * Fetch Interceptor
 * Automatically refreshes JWT token on 401 errors
 */

import { refreshToken } from './auth-refresh';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Intercept fetch requests and handle 401 errors by refreshing token
 */
export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Make the initial request
    let response = await originalFetch(input, init);

    // If we get a 401, try to refresh the token and retry
    if (response.status === 401) {
      console.log('[Fetch Interceptor] Got 401, attempting token refresh...');

      // Only refresh once at a time
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken();
      }

      const newToken = await refreshPromise;

      if (newToken) {
        console.log('[Fetch Interceptor] Token refreshed, retrying request...');
        
        // Clone the original request
        const request = new Request(input, init);
        
        // Update Authorization header if it exists
        const headers = new Headers(request.headers);
        if (headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${newToken}`);
        }
        
        // Retry the request with new token
        response = await originalFetch(input, {
          ...init,
          headers,
        });
      } else {
        console.warn('[Fetch Interceptor] Failed to refresh token, redirecting to login...');
        // Redirect to login if refresh fails
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      isRefreshing = false;
      refreshPromise = null;
    }

    return response;
  };
}
