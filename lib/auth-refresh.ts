/**
 * Token Refresh Utility
 * Handles automatic JWT token refresh when expired
 */

/**
 * Refresh JWT token using refresh token
 */
export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      console.warn('[Auth Refresh] Failed to refresh token:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Update token in cookie (server sets it, but we also update it client-side for consistency)
    if (data.token) {
      document.cookie = `token=${data.token}; path=/; max-age=${data.expiresAt ? Math.floor((data.expiresAt - Date.now()) / 1000) : 900}`;
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('[Auth Refresh] Error refreshing token:', error);
    return null;
  }
}

/**
 * Get current JWT token from cookie
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Check if token is expired (without verifying signature)
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token || typeof window === 'undefined') return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    // exp is already in milliseconds (as per our implementation)
    const exp = payload.exp;
    
    // Consider token expired if it expires in less than 1 minute
    return exp < Date.now() + 60 * 1000;
  } catch (error) {
    return true;
  }
}

/**
 * Ensure token is valid, refresh if needed
 */
export async function ensureValidToken(): Promise<string | null> {
  const token = getToken();
  
  if (!token || isTokenExpired(token)) {
    console.log('[Auth Refresh] Token expired or missing, refreshing...');
    return await refreshToken();
  }

  return token;
}
