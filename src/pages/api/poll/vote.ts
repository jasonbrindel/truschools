import type { APIRoute } from 'astro';

// Hash IP address for privacy using Web Crypto API (Cloudflare compatible)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'truschools-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

// Generate a simple session ID if none exists
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// POST - Submit a poll vote
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { questionId, pageSlug, questionText, answerText, sessionId } = body;

    if (!questionId || !pageSlug || !questionText || !answerText) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get IP and user agent for analytics
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               'unknown';
    const ipHash = await hashIP(ip);
    const userAgent = request.headers.get('user-agent') || '';

    // Check if this session already voted on this question
    if (sessionId) {
      const existingVote = await db.prepare(`
        SELECT id FROM qa_responses
        WHERE question_id = ? AND session_id = ?
      `).bind(questionId, sessionId).first();

      if (existingVote) {
        // Return results without adding duplicate vote
        const results = await db.prepare(`
          SELECT answer_text, COUNT(*) as vote_count
          FROM qa_responses
          WHERE question_id = ?
          GROUP BY answer_text
          ORDER BY vote_count DESC
        `).bind(questionId).all();

        const totalVotes = results.results?.reduce((sum: number, r: any) => sum + r.vote_count, 0) || 0;
        const resultsWithPercent = results.results?.map((r: any) => ({
          answer: r.answer_text,
          votes: r.vote_count,
          percentage: totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0
        })) || [];

        return new Response(JSON.stringify({
          success: true,
          alreadyVoted: true,
          results: resultsWithPercent,
          totalVotes
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Insert the vote
    const finalSessionId = sessionId || generateSessionId();
    await db.prepare(`
      INSERT INTO qa_responses (question_id, page_slug, question_text, answer_text, session_id, ip_hash, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      questionId,
      pageSlug,
      questionText,
      answerText,
      finalSessionId,
      ipHash,
      userAgent.substring(0, 500)
    ).run();

    // Get updated results
    const results = await db.prepare(`
      SELECT answer_text, COUNT(*) as vote_count
      FROM qa_responses
      WHERE question_id = ?
      GROUP BY answer_text
      ORDER BY vote_count DESC
    `).bind(questionId).all();

    const totalVotes = results.results?.reduce((sum: number, r: any) => sum + r.vote_count, 0) || 0;
    const resultsWithPercent = results.results?.map((r: any) => ({
      answer: r.answer_text,
      votes: r.vote_count,
      percentage: totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0
    })) || [];

    return new Response(JSON.stringify({
      success: true,
      alreadyVoted: false,
      sessionId: finalSessionId,
      results: resultsWithPercent,
      totalVotes
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting poll vote:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit vote' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET - Get poll results without voting
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const questionId = url.searchParams.get('questionId');
    const sessionId = url.searchParams.get('sessionId');

    if (!questionId) {
      return new Response(JSON.stringify({ error: 'Missing questionId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already voted
    let hasVoted = false;
    if (sessionId) {
      const existingVote = await db.prepare(`
        SELECT id FROM qa_responses
        WHERE question_id = ? AND session_id = ?
      `).bind(questionId, sessionId).first();
      hasVoted = !!existingVote;
    }

    // Get results
    const results = await db.prepare(`
      SELECT answer_text, COUNT(*) as vote_count
      FROM qa_responses
      WHERE question_id = ?
      GROUP BY answer_text
      ORDER BY vote_count DESC
    `).bind(questionId).all();

    const totalVotes = results.results?.reduce((sum: number, r: any) => sum + r.vote_count, 0) || 0;
    const resultsWithPercent = results.results?.map((r: any) => ({
      answer: r.answer_text,
      votes: r.vote_count,
      percentage: totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0
    })) || [];

    return new Response(JSON.stringify({
      success: true,
      hasVoted,
      results: resultsWithPercent,
      totalVotes
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching poll results:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch results' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
