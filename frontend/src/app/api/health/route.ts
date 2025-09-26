import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'FastNext Framework Frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}