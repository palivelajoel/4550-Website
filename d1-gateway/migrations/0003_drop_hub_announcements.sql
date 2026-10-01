-- 0003 - Drop the Team Announcements feature.
-- The hub_announcements table and its /member-hub/announcements page are retired.
-- Related indexes go away with the table. The table name is also removed from the
-- gateway allowlist (d1-gateway/src/index.js) and from the proxy table lists (api/proxy.js).

DROP TABLE IF EXISTS hub_announcements;
