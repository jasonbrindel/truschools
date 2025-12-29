import type { APIRoute } from 'astro';
import { captureException } from '@/lib/error-logger';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid newsletter categories (must match NewsletterSignup.astro)
const VALID_CATEGORIES = [
  // K-12
  'preschool',
  'kindergarten',
  'elementary',
  'middle',
  'high',
  // School Choice
  'charter',
  'magnet',
  'private',
  // Higher Ed
  'college',
  'university',
  'grad-school',
  'financial-aid',
  // Vocational
  'trade',
  'healthcare',
  'technology',
  'culinary',
  'beauty',
];

// Hash IP address for privacy
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'truschools-newsletter-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  let body: any;

  try {
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    body = await request.json();
    const { email, categories } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate categories
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one newsletter category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filter to only valid categories
    const validSelectedCategories = categories.filter(c => VALID_CATEGORIES.includes(c));
    if (validSelectedCategories.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select valid newsletter categories' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get IP and user agent for analytics/spam prevention
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';
    const ipHash = await hashIP(ip);
    const userAgent = request.headers.get('user-agent') || '';

    // Use upsert to handle race conditions atomically
    // If email exists, update categories; otherwise insert new record
    await db.prepare(`
      INSERT INTO newsletter_subscriptions (email, categories, ip_hash, user_agent, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        categories = excluded.categories,
        status = 'active',
        updated_at = datetime('now')
    `).bind(
      normalizedEmail,
      validSelectedCategories.join(','),
      ipHash,
      userAgent.substring(0, 500)
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you for subscribing!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    await captureException(db, error, {
      tags: { endpoint: '/api/newsletter/subscribe', method: 'POST' },
      extra: { email: body?.email },
      request
    });
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
