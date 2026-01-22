# Movie Explorer

Search movies, build watchlists, track what you want to see. 
Syncs across devices with auth, works offline without it.

## What I Built

- Full-text movie/TV search powered by TMDB's database
- Personal watchlists + custom lists (notes, tags, drag-to-reorder)
- Auth with Supabase that syncs your data across devices
- Graceful fallback to localStorage if you skip the signup
- Serverless API proxy so my TMDB key stays hidden
- Optional analytics (Plausible, Google Analytics) that respects DNT

## Why I Built It

- Wanted to actually *use* something I built (I have 47 unwatched movies saved)
- Sick of apps that force signup before you can try anything
- Chance to wire up a full auth flow with real backend sync, but keep it simple


## Tech Stack

**Frontend:** React, Vite, TanStack Query, React Router  
**Styling:** Tailwind CSS  
**Backend:** Vercel serverless functions (proxies to TMDB)  
**Auth/DB:** Supabase (Postgres + RLS, optional)  
**Analytics:** Plausible

## Architecture

```
Browser
   ↓ calls /api/tmdb/search, /api/tmdb/movie, etc.
Vercel Functions (keeps TMDB_API_KEY server-side)
   ↓ proxies to
TMDB API
```

No direct calls from the client to TMDB. The API key lives only in Vercel env vars.

Lists live in Supabase (with RLS policies) if you're signed in, otherwise localStorage. On first login, any local watchlist data migrates to Supabase once.

## Run Locally

1. Get a [TMDB API key](https://www.themoviedb.org/settings/api)
2. Clone and install:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in:
   ```env
   TMDB_API_KEY=your_key_here
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```
4. Create Supabase tables (see SQL below) or skip for localStorage-only mode
5. Run with Vercel CLI:
   ```bash
   npm install -g vercel
   vercel dev
   ```

Open `http://localhost:3000`

### Supabase Setup (Optional)

If you want auth + cloud sync, create a Supabase project and run this SQL:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('watchlist', 'custom')),
  position int default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  media_id int not null,
  title text,
  poster_path text,
  release_date text,
  added_at timestamptz default now(),
  notes text,
  tags text[],
  position int default 0,
  unique (list_id, media_type, media_id)
);

alter table lists enable row level security;
alter table list_items enable row level security;
alter table profiles enable row level security;

-- RLS policies: users can only see/edit their own data
create policy "Own data only" on lists for all using (auth.uid() = user_id);
create policy "Own data only" on list_items for all using (
  exists (select 1 from lists where lists.id = list_items.list_id and lists.user_id = auth.uid())
);
create policy "Own data only" on profiles for all using (auth.uid() = id);
```

## Tradeoffs / Lessons Learned

**Vercel serverless proxy:** Adds latency vs. calling TMDB directly, but keeps my key secure and gives me a stable API surface if I want to switch providers later.

**localStorage fallback:** Makes onboarding frictionless but means I have to handle migration logic. Worth it—most people just want to try the app without creating an account.

**Supabase RLS:** Took a few tries to get the policies right (especially the nested `list_items` check), but now I don't have to write a single auth middleware function. Postgres does the security.

**TanStack Query:** Overkill for a small app, but caching is automatic and I don't have to think about loading states. Would use again.

## Next Improvements

- [ ] Recommendations based on your watchlist (collaborative filtering or genre matching)
- [ ] Share lists publicly with a read-only link
- [ ] PWA support for offline access
- [ ] Drag-and-drop list reordering on mobile
- [ ] Filter by genre, year, rating before searching
