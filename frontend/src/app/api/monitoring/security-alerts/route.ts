import { NextRequest, NextResponse } from 'next/server';
import { getSecurityAlerts } from '@/lib/monitoring/security-monitor';

export async function POST(request: NextRequest) {
  try {
    const alert = await request.json();
    
    // Here you would implement alert handling logic
    // For example, sending emails, Slack notifications, etc.
    
    console.log('Security alert received:', alert);
    
    // Example: Send to external alerting service
    if (process.env.WEBHOOK_URL) {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${alert.eventType}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Event Type', value: alert.eventType, short: true },
              { title: 'Count', value: alert.count.toString(), short: true },
              { title: 'Affected IPs', value: alert.affectedIPs.join(', '), short: false },
              { title: 'Time Window', value: `${alert.timeWindow / 1000}s`, short: true }
            ]
          }]
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process security alert:', error);
    return NextResponse.json(
      { error: 'Failed to process security alert' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const alerts = getSecurityAlerts();
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Failed to get security alerts:', error);
    return NextResponse.json(
      { error: 'Failed to get security alerts' },
      { status: 500 }
    );
  }
}