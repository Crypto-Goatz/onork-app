
## Agency app credentials rotated — 2026-08-24

Marketplace installs of the 0nCore AGENCY app failed token exchange on every rung
with `Invalid client credentials`. Root cause: **env held an entirely superseded
key generation.**

    env client_id : 6a71919be8d7c3c038df0839-mseeodfy   (stale)
    real client_id: 6a71919be8d7c3c038df0839-mt6xgdq8

The secret in env (#022f4658) matched NEITHER the current client secret nor the
current shared secret — so this was not the "shared secret in the client slot"
failure that [[crm-app-two-secrets-wrong-slot]] describes, which is what I
predicted. A new key was issued (new client_id AND new secret) and env was never
updated. **A new key means a new client ID — updating only the secret leaves you
authenticating as an app that no longer exists.**

Also fixed: the agency app had NO shared-secret slot at all, while marketplace
and course-builder each had one. `CRM_AGENCY_SHARED_SECRET` now exists.

### NEW FACT, measured — refresh tokens survive a key rotation

A refresh token issued under the OLD client_id (`-mseeodfy`, install b9242c2d,
2026-08-04) was successfully exchanged using the NEW pair (`-mt6xgdq8`). So on
this platform a refresh token is bound to the **app_id**, not to the client-key
generation that issued it.

I predicted the opposite and said so before running it. The consequence matters:
`scripts/validate-crm-app-pair.ts` CAN validate a freshly rotated pair against a
pre-rotation token, and the same call repairs the stored token by rotating it.
Prove and repair in one shot — which is exactly what happened here.
