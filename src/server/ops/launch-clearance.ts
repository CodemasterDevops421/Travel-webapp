import 'server-only';

export type LaunchGateName =
  | 'migration_rpc_verification'
  | 'failure_proof'
  | 'readiness_alert_validation';

export type LaunchGateResult = {
  gate: LaunchGateName;
  clean: boolean;
  blockingSignal: string | null;
  rollbackRequired: boolean;
  artifactPath: string | null;
};

export type LaunchClearanceDecision = {
  status: 'Cleared' | 'Blocked';
  rollbackDecision: 'rollback required' | 'rollback not required';
  blockingSignals: string[];
  failedArtifacts: string[];
  gates: LaunchGateResult[];
};

export function evaluateLaunchClearance(gates: LaunchGateResult[]): LaunchClearanceDecision {
  const blockingSignals = gates
    .filter((gate) => !gate.clean && gate.blockingSignal)
    .map((gate) => gate.blockingSignal as string);
  const failedArtifacts = gates
    .filter((gate) => !gate.clean && gate.artifactPath)
    .map((gate) => gate.artifactPath as string);
  const allClean = gates.every((gate) => gate.clean);
  const rollbackRequired = gates.some((gate) => !gate.clean && gate.rollbackRequired);

  return {
    status: allClean ? 'Cleared' : 'Blocked',
    rollbackDecision: rollbackRequired ? 'rollback required' : 'rollback not required',
    blockingSignals,
    failedArtifacts,
    gates
  };
}
