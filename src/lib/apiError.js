import { NextResponse } from 'next/server';

/**
 * Classify and return a structured NextResponse for known error types.
 *
 * Usage in API routes:
 *   } catch (error) {
 *     return handleApiError(error, 'goals POST');
 *   }
 */
export function handleApiError(error, context = 'API') {
  // Log with context so server logs are useful
  console.error(`[${context}] Error:`, error?.message || error);

  // Mongoose CastError: invalid ObjectId or type mismatch
  if (error?.name === 'CastError') {
    const field = error.path || 'field';
    return NextResponse.json(
      { error: `Invalid value for ${field}. Expected ${error.kind}.` },
      { status: 400 }
    );
  }

  // Mongoose ValidationError: schema-level field validation failed
  if (error?.name === 'ValidationError') {
    const messages = Object.values(error.errors)
      .map(e => e.message)
      .join(', ');
    return NextResponse.json(
      { error: `Validation failed: ${messages}` },
      { status: 422 }
    );
  }

  // MongoDB duplicate key error (unique index violation)
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return NextResponse.json(
      { error: `A record with this ${field} already exists.` },
      { status: 409 }
    );
  }

  // JSON body parse failure (request.json() throws SyntaxError)
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 }
    );
  }

  // Database connection / timeout error
  if (error?.name === 'MongoNetworkError' || error?.name === 'MongoTimeoutError') {
    return NextResponse.json(
      { error: 'Database connection error. Please try again.' },
      { status: 503 }
    );
  }

  // Next-auth / JWT errors
  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    return NextResponse.json(
      { error: 'Session expired. Please log in again.' },
      { status: 401 }
    );
  }

  // SMTP / mailer errors (rethrown with descriptive messages)
  if (error?.message?.toLowerCase().includes('smtp')) {
    return NextResponse.json(
      { error: error.message },
      { status: 503 }
    );
  }

  // Fallback — generic 500
  return NextResponse.json(
    { error: 'An unexpected server error occurred. Please try again.' },
    { status: 500 }
  );
}

/**
 * Safe JSON body parser — returns { data, error } instead of throwing.
 */
export async function parseBody(request) {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch {
    return { data: null, error: NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 }) };
  }
}
