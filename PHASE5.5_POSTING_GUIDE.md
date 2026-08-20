# Phase 5.5 Automatic Invoice Posting

Added foundation for automatic double-entry posting.

Current additions:
- 08_invoice_posting_engine.sql
- Debit/Credit balance validation helper.

Before production posting:
- Map user accounts dynamically.
- Integrate create_invoice_full with journal_entries and journal_lines.
- Test sales and purchase flows.
