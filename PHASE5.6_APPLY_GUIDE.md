# Phase 5.6 - Full Invoice Posting Integration

Added migration 09_full_invoice_posting_integration.sql.

Before enabling automatic posting in production, verify account mapping for:
- Sales
- Inventory
- COGS
- Customer receivable
- Supplier payable
- Cash

After verification, wire create_invoice_full() to create journal_entries and journal_lines inside the same transaction.
