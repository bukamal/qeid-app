# Phase 100 Stock Invoice Fix

Adds stock synchronization helper for purchase and sale invoices.

Apply after:
- 02_rpc_functions.sql
- 99_fix_invoice_engine.sql

Test:
1. Create purchase invoice and verify item quantity.
2. Create sale invoice and verify item deduction.
