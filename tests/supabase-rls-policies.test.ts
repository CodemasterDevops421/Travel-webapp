import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('supabase rls access policies', () => {
  const migrationSource = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260316_enable_rls_and_access_policies.sql'),
    'utf8'
  );

  it('enables RLS on sensitive operational tables', () => {
    expect(migrationSource).toContain('alter table public.bookings enable row level security;');
    expect(migrationSource).toContain('alter table public.payment_logs enable row level security;');
    expect(migrationSource).toContain('alter table public.commission_tracking enable row level security;');
    expect(migrationSource).toContain('alter table public.admin_users enable row level security;');
    expect(migrationSource).toContain('alter table public.search_logs enable row level security;');
  });

  it('protects booking and payment data with owner-or-admin policies', () => {
    expect(migrationSource).toContain('create policy bookings_select_owner_or_admin');
    expect(migrationSource).toContain("or user_id = auth.uid()");
    expect(migrationSource).toContain("metadata #>> '{holder,email}'");
    expect(migrationSource).toContain('create policy payment_logs_select_owner_or_admin');
    expect(migrationSource).toContain('from public.bookings b');
  });

  it('uses an admin helper for privileged policies', () => {
    expect(migrationSource).toContain('create or replace function public.is_active_admin');
    expect(migrationSource).toContain('grant execute on function public.is_active_admin(uuid) to authenticated;');
    expect(migrationSource).toContain('create policy bookings_admin_write');
    expect(migrationSource).toContain('create policy admin_users_admin_write');
  });
});
