import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

// Helper function to verify password using PBKDF2
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  // Use Web Crypto API (available in Cloudflare Workers)
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(salt),
      iterations: 100000,
      hash: 'SHA-512'
    },
    keyMaterial,
    512 // 64 bytes * 8 bits
  );

  const derivedHash = bufferToHex(new Uint8Array(derivedBits));
  return derivedHash === hash;
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a session token
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  let body: any;

  try {
    body = await request.json();
    const { email, password, remember } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get database connection
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database connection failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const user = await db.prepare(
      'SELECT id, email, password_hash, name FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (remember ? 30 : 1)); // 30 days if remember, else 1 day

    // Store session in database
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();

    await db.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, sessionToken, expiresAt.toISOString()).run();

    // Update last login
    await db.prepare(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user.id).run();

    // Set cookie
    const cookieOptions = [
      `session=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Expires=${expiresAt.toUTCString()}`,
      'Secure'
    ].join('; ');

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/auth/login', method: 'POST' },
      extra: { email: body?.email },
      request
    });
    return new Response(JSON.stringify({
      success: false,
      error: 'An error occurred during login'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
