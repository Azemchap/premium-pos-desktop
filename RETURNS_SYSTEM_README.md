# Comprehensive Returns Management System

## Overview
This system replaces the old basic returns functionality with a comprehensive, real-time returns management system that supports multiple return types and online/offline synchronization with Supabase.

## Features

### Return Types
- **Sales Returns**: Returns from customer sales with refund processing
- **Purchase Returns**: Returns to suppliers with credit processing  
- **Inventory Returns**: Returns to warehouse/branch locations
- **Transfer Returns**: Returns between different locations

### Real-Time Synchronization
- **Online-First**: Data is saved to Supabase first when online
- **Offline Fallback**: Local SQLite storage when offline
- **Auto-Sync**: Automatic synchronization every 5 minutes
- **Real-Time Updates**: Live updates when other users make changes
- **Conflict Resolution**: Automatic handling of sync conflicts

### Return Management
- **Approval Workflow**: Multi-step approval process
- **Status Tracking**: Pending → Approved → Processing → Completed
- **Item-Level Details**: Track individual return items with reasons and conditions
- **Disposition Actions**: Restock, Dispose, Return to Supplier, Transfer, Repair, Write Off

## Architecture

### Frontend (TypeScript/React)
- `src/pages/Returns.tsx` - Main returns management interface
- `src/services/returnsSync.ts` - Real-time synchronization service

### Backend (Rust/Tauri)
- `src-tauri/src/commands/returns.rs` - Core returns commands
- SQLite local database for offline storage

### Cloud Database (Supabase)
- `supabase-returns-schema.sql` - Database schema
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data protection

## Database Schema

### Returns Table
```sql
CREATE TABLE returns (
    id BIGINT PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    return_type TEXT NOT NULL,
    reference_id BIGINT,
    reference_number TEXT,
    supplier_id BIGINT,
    from_location_id BIGINT,
    to_location_id BIGINT,
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    refund_method TEXT,
    credit_method TEXT,
    expected_credit_date DATE,
    status TEXT NOT NULL DEFAULT 'Pending',
    processed_by BIGINT NOT NULL,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    reason TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'synced',
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Return Items Table
```sql
CREATE TABLE return_items (
    id BIGINT PRIMARY KEY,
    return_id BIGINT REFERENCES returns(id),
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    reason TEXT NOT NULL,
    condition TEXT NOT NULL,
    disposition TEXT NOT NULL,
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Synchronization Flow

### Online Mode
1. User creates return → Supabase → Local SQLite
2. Real-time updates pushed to all connected clients
3. Local cache kept in sync

### Offline Mode
1. User creates return → Local SQLite (marked as 'pending')
2. When back online → Sync pending returns to Supabase
3. Update local status to 'synced'

### Conflict Resolution
- Last write wins for simple fields
- Manual review required for status conflicts
- Audit trail maintained in notes field

## API Commands

### Core Operations
- `create_return` - Create new return (online-first)
- `get_returns` - List returns with filters
- `get_return_items` - Get items for a specific return
- `approve_return` - Approve a return
- `complete_return` - Complete a return

### Sync Operations
- `create_return_offline` - Create return when offline
- `sync_return_from_supabase` - Sync from cloud to local
- `get_pending_returns` - Get returns pending sync
- `mark_return_as_synced` - Mark return as successfully synced
- `mark_return_as_error` - Mark return with sync error

## Setup Instructions

### 1. Database Setup
```sql
-- Run the schema in Supabase
-- File: supabase-returns-schema.sql
```

### 2. Environment Configuration
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Build and Run
```bash
# Build backend
cd src-tauri && cargo build

# Run frontend
npm run dev
```

## Usage

### Creating a Return
1. Navigate to Returns → New Return
2. Select return type (Sales, Purchase, Inventory, Transfer)
3. Add return items with reasons and conditions
4. Set reference (sale, purchase, location)
5. Review and create

### Managing Returns
1. View all returns in the main list
2. Filter by type, status, date range
3. Click on a return to view details
4. Approve or complete returns as needed

### Monitoring Sync Status
- Online status shown in header
- Pending sync count displayed
- Error notifications for failed syncs
- Manual sync option available

## Migration from Old System

### Data Migration
- Old returns data can be migrated using the migration script
- Maintain existing return numbers for continuity
- Map old status to new workflow

### Feature Mapping
- Old basic returns → Sales Returns
- Enhanced tracking and approval workflow
- Real-time collaboration features added

## Troubleshooting

### Common Issues
1. **Sync Errors**: Check network connection and Supabase credentials
2. **Offline Mode**: Ensure local SQLite database is accessible
3. **Real-time Updates**: Verify Supabase real-time subscriptions

### Debug Tools
- Use "Test DB" button to verify table existence
- Check browser console for sync errors
- Review Supabase logs for database issues

## Performance Considerations

### Optimization
- Local SQLite for immediate response
- Batch sync operations to reduce API calls
- Indexed queries for fast filtering
- Pagination for large datasets

### Caching Strategy
- Cache frequently accessed data locally
- Invalidate cache on real-time updates
- Background refresh for stale data

## Security

### Data Protection
- Row Level Security (RLS) in Supabase
- Client-side validation
- Server-side business rules
- Audit logging for all changes

### Access Control
- Role-based permissions
- User authentication required
- Supplier data isolation
- Location-based access restrictions

## Future Enhancements

### Planned Features
- Mobile app support
- Advanced reporting and analytics
- Integration with accounting systems
- Automated disposition workflows
- Supplier portal for returns processing

### Scalability
- Multi-warehouse support
- Advanced inventory tracking
- Return policy automation
- Customer self-service returns
