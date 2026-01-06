import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthHeader, createAuthErrorResponse } from '@/lib/api-auth';
import { hashData } from '@/lib/storage/encryption';
import { createSignedJWT } from '@/lib/jwt';
import * as db from '@/lib/storage/indexeddb/service';

const JWT_EXPIRY = 15 * 60 * 1000; // 15 minutes

/**
 * Refresh JWT token using refresh token from cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return createAuthErrorResponse('Refresh token not found', 401);
    }

    // Hash the refresh token to compare with stored hash
    const refreshTokenHash = await hashData(refreshToken);

    // Find session by refresh token hash
    const sessions = await db.getActiveSessions();
    const session = sessions.find(s => s.refreshToken === refreshTokenHash);

    if (!session) {
      return createAuthErrorResponse('Invalid refresh token', 401);
    }

    // Check if session is still active
    if (!session.isActive) {
      return createAuthErrorResponse('Session expired', 401);
    }

    // Get user
    const user = await db.getUserById(session.userId);
    if (!user || !user.isActive) {
      return createAuthErrorResponse('User not found or inactive', 401);
    }

    // Create new JWT token
    const expiresAt = Date.now() + JWT_EXPIRY;
    const newToken = createSignedJWT(
      { userId: user.id, email: user.email, role: 'user' },
      JWT_EXPIRY
    );

    // Update session with new token hash
    session.tokenHash = await hashData(newToken);
    session.expiresAt = expiresAt;
    session.lastActivity = Date.now();
    await db.updateAuthSession(session);

    // Return new token
    const response = NextResponse.json({
      token: newToken,
      expiresAt,
    });

    // Set token in cookie
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: JWT_EXPIRY / 1000,
    });

    return response;
  } catch (error) {
    console.error('[Refresh API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
