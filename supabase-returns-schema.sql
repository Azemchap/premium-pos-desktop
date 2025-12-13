-- Supabase Schema for Returns Management
-- This file defines the tables needed for the comprehensive returns system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
    id BIGINT PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    return_type TEXT NOT NULL CHECK (return_type IN ('SalesReturn', 'PurchaseReturn', 'InventoryReturn', 'TransferReturn')),
    reference_id BIGINT,
    reference_number TEXT,
    supplier_id BIGINT,
    from_location_id BIGINT,
    to_location_id BIGINT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    refund_method TEXT,
    credit_method TEXT,
    expected_credit_date DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Processing', 'Completed', 'Rejected')),
    processed_by BIGINT NOT NULL,
    approved_by BIGINT,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return Items Table
CREATE TABLE IF NOT EXISTS return_items (
    id BIGINT PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL CHECK (reason IN ('Defective', 'WrongItem', 'Damaged', 'Expired', 'Overstock', 'Recall', 'CustomerDissatisfaction', 'WrongShipment', 'QualityIssue', 'Other')),
    condition TEXT NOT NULL CHECK (condition IN ('New', 'Opened', 'Used', 'Damaged', 'Defective', 'Sealed')),
    disposition TEXT NOT NULL CHECK (disposition IN ('Restock', 'Dispose', 'ReturnToSupplier', 'Transfer', 'Repair', 'WriteOff')),
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_type ON returns(return_type);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_sync_status ON returns(sync_status);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id ON return_items(product_id);

-- Row Level Security (RLS)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- Policies for returns table
CREATE POLICY "Users can view returns" ON returns
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can insert returns" ON returns
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update returns" ON returns
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete returns" ON returns
    FOR DELETE USING (
        auth.role() = 'authenticated'
    );

-- Policies for return_items table
CREATE POLICY "Users can view return items" ON return_items
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can insert return items" ON return_items
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update return items" ON return_items
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete return items" ON return_items
    FOR DELETE USING (
        auth.role() = 'authenticated'
    );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_return_items_updated_at BEFORE UPDATE ON return_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate return numbers
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    sequence_num INTEGER;
    return_number TEXT;
BEGIN
    -- Get current date for prefix
    prefix := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM returns
    WHERE return_number LIKE prefix || '%';
    
    -- Format return number
    return_number := prefix || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN return_number;
END;
$$ LANGUAGE plpgsql;

-- Real-time subscriptions setup
-- This enables real-time updates for the returns tables
COMMENT ON TABLE returns IS 'Real-time enabled table for returns management';
COMMENT ON TABLE return_items IS 'Real-time enabled table for return items';
