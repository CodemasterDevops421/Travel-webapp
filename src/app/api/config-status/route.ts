import { NextResponse } from 'next/server';
import { env } from '@/server/env';

export async function GET() {
  const liteApiConfigured = Boolean(
    env.LITEAPI_API_KEY && 
    env.LITEAPI_API_KEY !== 'liteapi-placeholder-key'
  );

  return NextResponse.json({
    liteApiConfigured
  });
}
