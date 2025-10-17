import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if security violation reporting is disabled
    const skipSecurityViolations = process.env.SKIP_SECURITY_VIOLATIONS === 'true';

    if (skipSecurityViolations) {
      return NextResponse.json(
        {
          status: 'skipped',
          message: 'Security violation reporting disabled'
        },
        { status: 200 }
      );
    }

    // Get the request body
    const body = await request.json();

    // Get backend API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Forward the request to the backend
    const backendResponse = await fetch(`${apiUrl}/api/v1/security/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any relevant headers from the original request
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify(body),
    });

    // Return the backend response
    const responseData = await backendResponse.json();

    return NextResponse.json(responseData, {
      status: backendResponse.status,
    });

  } catch (error) {
    console.error('Error proxying security violation:', error);

    // Return a generic success response to avoid exposing errors
    return NextResponse.json(
      {
        status: 'reported',
        message: 'Security violation logged'
      },
      { status: 200 }
    );
  }
}