import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedInternalJobRequest } from '@/server/ops/internal-jobs';
import { runRecoverySweeps } from '@/server/ops/reconciliation-sweeps';

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalJobRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runRecoverySweeps();
  return NextResponse.json(result);
}
