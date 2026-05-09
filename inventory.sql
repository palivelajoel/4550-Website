-- Migration: Add password_hash to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Inventory table for parts and tools (must exist before ALTER below)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    category TEXT CHECK (category IN ('part', 'tool', 'consumable')),
    image_url TEXT,
    added_by UUID,
    created_at TIMESTAMPTZ WITH TIME ZONE DEFAULT NOW()
);

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