import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent, getSecurityEvents } from '@/lib/monitoring/security-monitor';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    // Validate event structure
    if (!event.type || !event.details || !event.severity) {
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }

    // Log the security event
    logSecurityEvent(
      event.type,
      event.details,
      event.severity,
      'backend'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log security event:', error);
    return NextResponse.json(
      { error: 'Failed to log security event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filter = {
      type: searchParams.get('type') as any,
      severity: searchParams.get('severity') as any,
      timeRange: searchParams.get('timeRange') ? parseInt(searchParams.get('timeRange')!) : undefined,
      clientIP: searchParams.get('clientIP') || undefined,
      userId: searchParams.get('userId') || undefined
    };

    // Remove undefined values
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof typeof filter] === undefined) {
        delete filter[key as keyof typeof filter];
      }
    });

    const events = getSecurityEvents(Object.keys(filter).length > 0 ? filter : undefined);
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to get security events:', error);
    return NextResponse.json(
      { error: 'Failed to get security events' },
      { status: 500 }
    );
  }
}