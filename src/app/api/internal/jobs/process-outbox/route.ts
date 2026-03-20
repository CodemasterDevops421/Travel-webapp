import { NextRequest, NextResponse } from 'next/server';
import { processLifecycleOutboxBatch } from '@/server/booking/outbox';
import { isAuthorizedInternalJobRequest } from '@/server/ops/internal-jobs';
import { recordRecoveryObservation } from '@/server/ops/recovery-observability';

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalJobRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processLifecycleOutboxBatch(20);
  recordRecoveryObservation('sweep_recovered', result.processed);
  recordRecoveryObservation('reconciliation_failures', result.failed);
  return NextResponse.json(result);
}
