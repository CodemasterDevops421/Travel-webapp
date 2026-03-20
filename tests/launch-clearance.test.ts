import { describe, expect, it } from 'vitest';
import { evaluateLaunchClearance } from '@/server/ops/launch-clearance';

describe('launch clearance evaluator', () => {
  it('returns Cleared only when all gates are clean', () => {
    const decision = evaluateLaunchClearance([
      {
        gate: 'migration_rpc_verification',
        clean: true,
        blockingSignal: null,
        rollbackRequired: false,
        artifactPath: '/tmp/migration.json'
      },
      {
        gate: 'failure_proof',
        clean: true,
        blockingSignal: null,
        rollbackRequired: false,
        artifactPath: '/tmp/failure.json'
      },
      {
        gate: 'readiness_alert_validation',
        clean: true,
        blockingSignal: null,
        rollbackRequired: false,
        artifactPath: '/tmp/readiness.json'
      }
    ]);

    expect(decision.status).toBe('Cleared');
    expect(decision.rollbackDecision).toBe('rollback not required');
    expect(decision.blockingSignals).toEqual([]);
  });

  it('returns Blocked with rollback when a blocking gate requires it', () => {
    const decision = evaluateLaunchClearance([
      {
        gate: 'migration_rpc_verification',
        clean: true,
        blockingSignal: null,
        rollbackRequired: false,
        artifactPath: '/tmp/migration.json'
      },
      {
        gate: 'failure_proof',
        clean: false,
        blockingSignal: 'failure-proof artifact bundle contains failed scenarios',
        rollbackRequired: true,
        artifactPath: '/tmp/failure.json'
      },
      {
        gate: 'readiness_alert_validation',
        clean: true,
        blockingSignal: null,
        rollbackRequired: false,
        artifactPath: '/tmp/readiness.json'
      }
    ]);

    expect(decision.status).toBe('Blocked');
    expect(decision.rollbackDecision).toBe('rollback required');
    expect(decision.blockingSignals).toContain('failure-proof artifact bundle contains failed scenarios');
    expect(decision.failedArtifacts).toContain('/tmp/failure.json');
  });
});
