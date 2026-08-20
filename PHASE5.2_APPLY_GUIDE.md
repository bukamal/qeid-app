# Phase 5.2 Posting Engine

This phase adds the accounting posting foundation.

Included:
- journal balance validation
- preparation for invoice -> journal posting

Before enabling automatic posting:
1. Verify account mapping per user.
2. Test sales invoice.
3. Test purchase invoice.
4. Confirm journal_lines debit equals credit.

Apply SQL:
migrations/05_posting_engine.sql
