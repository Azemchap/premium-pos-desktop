# 🚀 Batch Tracking Implementation Plan

## Overview
Transform the POS system into a batch-tracking inventory system. This is a **multi-phase implementation** to avoid breaking existing functionality.

## Phase 1: Foundation (Current - Week 1-2)
**Goal:** Add batch tracking infrastructure without breaking existing system

### Database Changes
1. ✅ Add `suppliers` table
2. ✅ Add `product_variants` table (simplified)
3. ✅ Add `inventory_batches` table
4. ✅ Migration script for existing products → variants → batches
5. ✅ Keep existing `products` and `inventory` tables for backward compatibility

### Backend Changes
1. ✅ New models: `Supplier`, `ProductVariant`, `InventoryBatch`
2. ✅ Commands: CRUD for suppliers, variants, batches
3. ✅ Auto-create default variant when product is created
4. ✅ Auto-create batch when receiving stock
5. ✅ Simple FIFO allocation for sales

### What We're NOT Doing Yet
- ❌ Full PO system (Phase 3)
- ❌ Complex UI overhauls (Phase 4-5)
- ❌ LIFO/FEFO allocation (Phase 2)
- ❌ Multi-variant UI (Phase 4)

## Phase 2: Batch Allocation Logic (Week 3-4)
- FIFO/LIFO/FEFO allocation methods
- Batch reservation system
- Advanced inventory movements

## Phase 3: Purchase Order System (Week 5-6)
- PO creation and management
- PO receiving → auto-create batches
- Supplier performance tracking

## Phase 4: Frontend - Product Management (Week 7-8)
- Multi-variant product forms
- Batch management UI
- Expiry tracking interface

## Phase 5: Frontend - POS Integration (Week 9-10)
- Variant selection in POS
- Batch allocation display in cart
- Enhanced receipt with batch info

## Success Criteria for Phase 1
- [ ] Existing products work without changes
- [ ] New products auto-create variant + initial batch
- [ ] Inventory shows batch-level detail
- [ ] Sales can deduct from specific batches
- [ ] Basic FIFO allocation works

---

**Current Focus:** Phase 1 - Database Foundation
**Next Steps:** See migration file and implementation below
