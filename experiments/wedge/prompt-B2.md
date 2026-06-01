You are a senior frontend engineer working inside this exact codebase.

TARGET STACK (non-negotiable):
- Next.js 15 (App Router)
- TypeScript, strict mode
- Tailwind CSS
- Existing design-system components already in this repo — import them, do not recreate
- Zustand for any client state

TASK:
Generate the production code for the screen below.

OUTPUT RULES:
- Output complete files, each prefixed with its correct path (e.g. app/(app)/settings/page.tsx).
- Code must compile under TypeScript strict mode: no `any`, no unused vars, no missing types.
- Reuse components that already exist in this repo by importing them. Only create a new
  component if none exists for the purpose.
- Output only the files. No explanation.

THE SCREEN (frozen design representation):
```json
{
  "screen": "Team",
  "frame": { "name": "Team / Settings", "width": 1200, "background": "#FFFFFF" },
  "pageHeader": {
    "title": { "text": "Team", "fontSize": 28, "fontWeight": 600 },
    "subtitle": { "text": "Manage who has access to this workspace", "fontSize": 14, "fontWeight": 400, "color": "#6B7280" },
    "primaryButton": { "text": "Invite member", "leadingIcon": "plus (16x16)", "fill": "#111827", "textColor": "#FFFFFF", "radius": 8 }
  },
  "toolbar": {
    "search": { "placeholder": "Search members", "leadingIcon": "search (16x16)", "width": 280 },
    "roleFilter": { "text": "All roles", "trailingIcon": "chevron-down (16x16)" }
  },
  "table": {
    "columns": ["Member", "Role", "Status", "Last active", ""],
    "rows": [
      { "avatar": "AS", "name": "Ana Silva",      "email": "ana@acme.com",   "role": "Owner",  "status": "Active",  "lastActive": "Just now",   "menu": "more (16x16)" },
      { "avatar": "BC", "name": "Bruno Costa",    "email": "bruno@acme.com", "role": "Admin",  "status": "Active",  "lastActive": "2h ago",     "menu": "more (16x16)" },
      { "avatar": "CD", "name": "Carla Dias",     "email": "carla@acme.com", "role": "Member", "status": "Pending", "lastActive": "—",          "menu": "more (16x16)" },
      { "avatar": "DF", "name": "Diego Faria",    "email": "diego@acme.com", "role": "Member", "status": "Active",  "lastActive": "Yesterday",  "menu": "more (16x16)" }
    ]
  },
  "badges": {
    "role":   { "Owner": "#EEF2FF/#4F46E5", "Admin": "#ECFDF5/#059669", "Member": "#F3F4F6/#374151" },
    "status": { "Active": "#ECFDF5/#059669", "Pending": "#FEF3C7/#B45309" }
  },
  "notes": "Standard admin table: page header with a primary 'Invite member' action, a search + role filter toolbar, then a table of member rows. Each row: [avatar initials] [name + email] [role badge] [status badge] [last active] [row menu]. Rows share an identical structure."
}
```

SEMANTIC CONTEXT:
- Purpose: Workspace admin "Team" screen. Lists the members who have access to the current
  workspace and lets an admin invite new ones. Authenticated, lives inside the dashboard.
- Route: /settings/team  ->  app/(dashboard)/settings/team/page.tsx
- Auth: REQUIRED. Check the session server-side; if there is no authenticated user, redirect
  to /login. Use the existing Supabase server client at `@/lib/supabase/server`
  (`createClient()` — it returns null when Supabase is not configured).
- Data fetching: fetch the member list from the API — do NOT hardcode the rows shown in the
  design (those are sample data). The list is loaded for the current workspace.
- API contract (exact shapes — wire to these):
    GET /api/team
      200 -> { members: Array<{
                 id: string; name: string; email: string; avatarUrl: string | null;
                 role: 'owner' | 'admin' | 'member';
                 status: 'active' | 'pending';
                 lastActiveAt: string | null   // ISO 8601, null if never
              }> }
      401 -> { error: 'unauthorized' }
    POST /api/team/invite
      body 201 <- { email: string; role: 'admin' | 'member' }
      201  -> { invite: { id: string; email: string; role: 'admin' | 'member'; status: 'pending' } }
      409  -> { error: 'already_member' }
      422  -> { error: 'invalid_email' }
- States to handle explicitly:
    - loading: skeleton / placeholder rows while fetching.
    - error: fetch failed -> show an error message with a Retry action.
    - empty: members array is empty -> empty state with a "Invite member" call to action.
- Repeated pattern: render ONE reusable <MemberRow> mapped over the fetched members — do not
  inline 4 near-identical rows. Map role/status to a small <Badge> with the right color set.
- Interactivity: the data list is fetched server-side (Server Component). The "Invite member"
  action opens a modal/form that POSTs to /api/team/invite — that interactive part is a
  Client Component ("use client"). Keep the list rendering on the server.

Use this context to place files correctly, enforce auth, fetch from and wire to the exact
API contract above, handle the loading/error/empty states, and extract the repeated row.
