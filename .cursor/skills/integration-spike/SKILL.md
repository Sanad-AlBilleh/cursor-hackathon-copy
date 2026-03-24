---
name: integration-spike
description: >-
  Integrates one external API or library quickly with a minimal wrapper, one
  happy-path example, and one fallback when auth or setup fails. Use when adding
  third-party APIs, SDKs, OAuth, webhooks, or when the user says integration
  spike or external API.
---

# Integration spike

## Goal

Prove **one integration** works end-to-end **before** wrapping it in abstractions.

## Steps

1. **Identify** the API/library, required **credentials**, and the **single happy path** (one request or one SDK call that proves connectivity).
2. **Minimal wrapper**: one module or file with:
   - typed or documented inputs/outputs
   - centralized error handling
   - no premature “framework” around it
3. **Happy-path example**: one script, route, or test that runs the real call with **safe defaults** (timeouts, no infinite retries).
4. **Fallback path** when auth/setup fails:
   - static mock, recorded fixture, or env flag that **skips the network** and still lets the app run
   - log a **clear** message so the user knows they are in fallback mode
5. **Document** in README or a short comment block: how to get keys, how to run the spike, and what “success” looks like.

## Output checklist

- [ ] Happy path works with real credentials
- [ ] Fallback works without credentials
- [ ] Secrets only via env (never committed)
- [ ] One place to change base URL / version later

## Constraints

- Do **not** add retries, queues, or caching until the spike is green.
- Prefer **official SDK** or **fetch** over bespoke HTTP unless the SDK is worse.
