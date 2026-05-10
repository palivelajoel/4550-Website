-- Migration: Add password_hash to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Inventory table for parts and tools
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    bin_location TEXT,
    category TEXT CHECK (category IN ('structural', 'drivetrain', 'electronics', 'pneumatics', 'fastener', 'tool', 'consumable', 'cable', 'bearing', 'motor', 'sensor', 'other')),
    image_url TEXT,
    tags TEXT[],
    manufacturer TEXT,
    part_number TEXT,
    low_stock_threshold INTEGER DEFAULT 5,
    added_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for existing tables (safe to run multiple times)
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS bin_location TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_category_check;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_category_check
    CHECK (category IN ('structural', 'drivetrain', 'electronics', 'pneumatics', 'fastener', 'tool', 'consumable', 'cable', 'bearing', 'motor', 'sensor', 'other'));

-- Drop old foreign key constraint if table existed before (migration from auth.users to members.id)
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_added_by_fkey;

-- Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view inventory (select)
DROP POLICY IF EXISTS "Public select inventory" ON public.inventory_items;
CREATE POLICY "Public select inventory"
    ON public.inventory_items
    FOR SELECT
    USING ( true );

-- Only allow service role (via hub-proxy) to modify inventory
-- We rely on the fact that only service role can modify; we will not create public insert/update/delete policies.
-- This means inserts/updates/deletes must go through a trusted service (like our hub-proxy endpoint).

-- Example: set a password for an existing member (run once per member):
-- UPDATE members SET password_hash = '<run locally to generate>' WHERE username = 'someusername';
-- To generate: node -e "const{crypto:{scryptSync,randomBytes}}=require('node:crypto');const s=randomBytes(16).toString('base64');console.log(s+':'+scryptSync('thepassword',s,64).toString('base64'))"

-- Inventory transactions log (stock changes)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    change INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Public select inventory_transactions"
    ON public.inventory_transactions
    FOR SELECT
    USING ( true );