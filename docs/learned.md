# What we learned

**Purpose:** Short, concrete entries so we do not repeat the same mistakes. Format: **symptom → cause → fix → rule for next time.**

_Add entries after non-obvious bugs or integration wins._

## Entries

_(Example:)_  
- **Symptom:** API returned 401 on demo. **Cause:** token in `.env.local` not loaded in production build. **Fix:** documented `VITE_*` prefix / build-time env. **Rule:** verify env in the same mode you demo (dev vs prod build).
