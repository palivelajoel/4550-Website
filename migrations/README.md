Supabase Auth migration notes

Run the following SQL in Supabase SQL editor to add auth_id to members and make basic policies:

-- Add auth_id column to link members to Supabase auth users
ALTER TABLE members ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Ensure RLS is enabled for members and only admin server can write
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Public can select members (if you want), but restrict updates/inserts to server/admin
CREATE POLICY "Public select members" ON public.members FOR SELECT USING ( true );

-- Do NOT create public insert/update/delete policies for members.

-- If you want to allow users to sign themselves up with Supabase Auth and create a member row,
-- implement server-side creation that inserts into members with auth_id set.
