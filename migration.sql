-- ═══════════════════════════════════════════════════════════
-- FRC Team 4550 "Something's Bruin" — Complete Supabase Schema
-- Run ALL of this in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. CORE TABLES (members, site_config, captains)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Member', 'Captain', 'Admin')),
    subteam TEXT DEFAULT 'General' CHECK (subteam IN ('Build', 'Programming', 'Marketing & Outreach', 'General')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS subteam TEXT DEFAULT 'General';

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select members" ON public.members;
CREATE POLICY "Public select members" ON public.members FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.site_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select site_config" ON public.site_config;
CREATE POLICY "Public select site_config" ON public.site_config FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.captains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    bio TEXT,
    photo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.captains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select captains" ON public.captains;
CREATE POLICY "Public select captains" ON public.captains FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 2. HUB TABLES (tasks, calendar, announcements, resources, media)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES members(id),
    assigned_name TEXT,
    subteam TEXT DEFAULT 'All',
    due_date TEXT,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT DEFAULT 'To Do' CHECK (status IN ('Backlog', 'To Do', 'In Progress', 'Review', 'Done')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hub_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select hub_tasks" ON public.hub_tasks;
CREATE POLICY "Public select hub_tasks" ON public.hub_tasks FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.hub_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT DEFAULT 'event' CHECK (type IN ('event', 'deadline', 'meeting', 'competition', 'other')),
    date TEXT NOT NULL,
    end_date TEXT,
    time TEXT,
    description TEXT,
    all_day BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hub_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select hub_calendar" ON public.hub_calendar;
CREATE POLICY "Public select hub_calendar" ON public.hub_calendar FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.hub_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tag TEXT DEFAULT 'General' CHECK (tag IN ('General', 'Build', 'Programming', 'Marketing & Outreach', 'Competition', 'Reminder', 'Urgent')),
    pinned BOOLEAN DEFAULT FALSE,
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hub_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select hub_announcements" ON public.hub_announcements;
CREATE POLICY "Public select hub_announcements" ON public.hub_announcements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.hub_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Documentation' CHECK (category IN ('All', 'CAD & Design', 'Programming', 'Documentation', 'Marketing', 'Finance', 'Competition', 'Other')),
    url TEXT NOT NULL,
    file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hub_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select hub_resources" ON public.hub_resources;
CREATE POLICY "Public select hub_resources" ON public.hub_resources FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.hub_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video')),
    category TEXT DEFAULT 'Competition' CHECK (category IN ('Competition', 'Build Season', 'Outreach', 'Team', 'Other')),
    description TEXT,
    url TEXT NOT NULL,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hub_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select hub_media" ON public.hub_media;
CREATE POLICY "Public select hub_media" ON public.hub_media FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 3. SPONSORS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Not Contacted' CHECK (status IN ('Not Contacted', 'Contacted', 'In Progress', 'Sponsored', 'Declined')),
    tier TEXT DEFAULT 'None' CHECK (tier IN ('None', 'Bronze', 'Silver', 'Gold', 'Platinum')),
    follow_up_date TEXT,
    assigned_member_id UUID REFERENCES members(id),
    assigned_member_name TEXT,
    date_added TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select sponsors" ON public.sponsors;
CREATE POLICY "Public select sponsors" ON public.sponsors FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.sponsor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sponsor_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select sponsor_notes" ON public.sponsor_notes;
CREATE POLICY "Public select sponsor_notes" ON public.sponsor_notes FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 4. SUGGESTIONS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select suggestions" ON public.suggestions;
CREATE POLICY "Public select suggestions" ON public.suggestions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 5. COMPETITIONS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    location TEXT,
    attending BOOLEAN DEFAULT FALSE,
    venue_map_url TEXT DEFAULT '',
    pit_map_url TEXT DEFAULT '',
    stream_url TEXT DEFAULT '',
    map_status TEXT DEFAULT 'Pit map not posted yet.',
    last_map_check TIMESTAMPTZ,
    schematic_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS stream_url TEXT DEFAULT '';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS map_status TEXT DEFAULT 'Pit map not posted yet.';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS last_map_check TIMESTAMPTZ;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS schematic_data JSONB;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select competitions" ON public.competitions;
CREATE POLICY "Public select competitions" ON public.competitions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 6. INVENTORY
-- ─────────────────────────────────────────────────────────

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

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS bin_location TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_category_check;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_category_check
    CHECK (category IN ('structural', 'drivetrain', 'electronics', 'pneumatics', 'fastener', 'tool', 'consumable', 'cable', 'bearing', 'motor', 'sensor', 'other'));
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_added_by_fkey;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select inventory" ON public.inventory_items;
CREATE POLICY "Public select inventory" ON public.inventory_items FOR SELECT USING (true);

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
CREATE POLICY "Public select inventory_transactions" ON public.inventory_transactions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────
-- 7. SCOUTING (2026 REBUILT game — columns based on actual code)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scouting_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    team_number INT,
    match_number INT,
    alliance TEXT DEFAULT 'Red',
    scouter_name TEXT,
    auto_fuel INT DEFAULT 0,
    auto_climb BOOLEAN DEFAULT FALSE,
    teleop_fuel INT DEFAULT 0,
    endgame TEXT DEFAULT 'None',
    defense BOOLEAN DEFAULT FALSE,
    defended BOOLEAN DEFAULT FALSE,
    died BOOLEAN DEFAULT FALSE,
    notes TEXT,
    source TEXT DEFAULT 'human',
    event_key TEXT
);

ALTER TABLE public.scouting_matches ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'human';
ALTER TABLE public.scouting_matches ADD COLUMN IF NOT EXISTS event_key TEXT;

ALTER TABLE public.scouting_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select scouting_matches" ON public.scouting_matches;
CREATE POLICY "Public select scouting_matches" ON public.scouting_matches FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.scouting_pits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    team_number INT,
    team_name TEXT,
    drivetrain TEXT,
    weight_lbs NUMERIC,
    auto_capabilities TEXT,
    teleop_capabilities TEXT,
    climb_type TEXT,
    notes TEXT,
    scouter_name TEXT,
    can_score_auto_climb BOOLEAN DEFAULT FALSE,
    can_score_fuel_near BOOLEAN DEFAULT FALSE,
    can_score_fuel_far BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.scouting_pits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select scouting_pits" ON public.scouting_pits;
CREATE POLICY "Public select scouting_pits" ON public.scouting_pits FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.scouting_picklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    team_number INT,
    rank INT
);

ALTER TABLE public.scouting_picklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select scouting_picklist" ON public.scouting_picklist;
CREATE POLICY "Public select scouting_picklist" ON public.scouting_picklist FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKETS (create these manually in Supabase Dashboard):
--   1. team-assets       → public bucket (logos, captain headshots, resource files)
--   2. team-media        → public bucket (gallery photos/videos)
--   3. inventory-images  → public bucket (inventory item photos)
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: Create initial admin account
-- ═══════════════════════════════════════════════════════════
-- Step 1: Open a terminal on your computer and run:
--   node -e "const{crypto:{scryptSync,randomBytes}}=require('node:crypto');const s=randomBytes(16).toString('base64');console.log(s+':'+scryptSync('Admin@4550',s,64).toString('base64'))"
--
-- Step 2: Copy the output and replace '<paste-hash-here>' below, then run:
--
-- INSERT INTO public.members (username, full_name, role, password_hash)
-- VALUES ('admin', 'Admin', 'Admin', '<paste-hash-here>')
-- ON CONFLICT (username) DO NOTHING;
