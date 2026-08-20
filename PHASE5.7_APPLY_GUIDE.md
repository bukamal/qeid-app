# Phase 5.7 Apply Guide

Added:
- migrations/10_phase57_full_posting_rpc.sql

Purpose:
- Prepare final invoice posting integration.
- Validate journal balance before commit.

Before production:
1. Apply on staging.
2. Test sales invoice.
3. Test purchase invoice.
4. Verify journal debit equals credit.
