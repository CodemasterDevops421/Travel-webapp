# Phase 01: User Setup Required

**Generated:** 2026-02-23
**Phase:** 01-platform-foundation-and-security
**Status:** Incomplete

Complete these items for Google OAuth sign-in to function in this phase.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `GOOGLE_CLIENT_ID` | Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs | `.env.local` |
| [ ] | `GOOGLE_CLIENT_SECRET` | Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client Secret | `.env.local` |

## Dashboard Configuration

- [ ] **Register auth callback URL**
  - Location: Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs -> Authorized redirect URIs
  - Set to: `http://localhost:3000/auth/callback` for local development (and your production callback URL when deployed)

## Verification

After completing setup, verify with:

```bash
npm run test -- tests/auth/oauth
```

Expected results:
- OAuth callback tests pass
- Google sign-in redirects back to `/auth/callback` and then to the target page

---

**Once all items complete:** Mark status as "Complete" at top of file.
