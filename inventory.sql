-- Inventory table for parts and tools
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    category TEXT CHECK (category IN ('part', 'tool', 'consumable')),
    image_url TEXT,
    added_by UUID REFERENCES auth.users,
    created_at TIMESTAMPTZ WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view inventory (select)
DROP POLICY IF EXISTS "Public select inventory" ON public.inventory_items;
CREATE POLICY "Public select inventory"
    ON public.inventory_items
    FOR SELECT
    USING ( true );

-- Only allow service role (via admin-proxy) to modify inventory
-- We rely on the fact that only service role can modify; we will not create public insert/update/delete policies.
-- This means inserts/updates/deletes must go through a trusted service (like our admin-proxy endpoint).