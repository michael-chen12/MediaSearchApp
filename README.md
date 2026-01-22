# Movie Explorer

Search movies and TV shows, build watchlists, track what you want to watch.  
Works offline with localStorage or syncs across devices with optional auth.

**Live Demo:** [https://media-search-app-sepia.vercel.app/]ReelRadar

## What I Built

- Multi-tab search (movies/TV/people) with real-time results from TMDB's 1M+ title database
- Custom watchlists with drag-to-reorder using @dnd-kit (works on both desktop and mobile)
- Filter by genre, year, rating, streaming provider (Netflix, Disney+, etc.) with multi-select
- Sort by title, rating, popularity, or manual drag order
- Auth-optional design: works instantly without signup, syncs via Supabase if you log in
- Serverless proxy keeps TMDB API key server-side (single Vercel function handles all endpoints)
- Auto-enrichment: pulls missing metadata (genres, ratings) in batches when you open a list
- Plausible Analytics with DNT support (page views, search queries, tab switches)

## Why I Built It

- Wanted something I'd actually use—I track ~50 unwatched movies but hate apps that force signup
- Chance to implement auth-optional UX: full features without login, seamless cloud sync when you do
- Hands-on with Supabase RLS policies (nested checks for list items) and migration logic (localStorage → Postgres)


## Tech Stack

**Frontend:** React 19, Vite, React Router 7  
**Data:** TanStack Query (caching, optimistic updates)  
**Styling:** Tailwind CSS 4  
**Backend:** Vercel serverless function (proxies to TMDB API)  
**Auth/DB:** Supabase (Postgres + Row Level Security)  
**Analytics:** Plausible

## Architecture

```
Browser → /api/tmdb?endpoint=search/movie&query=...
            ↓
         Vercel Function (keeps TMDB_API_KEY hidden)
            ↓
         TMDB API
```

Lists stored in Supabase if authenticated, otherwise localStorage. On first login, local data migrates automatically.

## Run Locally

1. **Get TMDB API key:** Sign up at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. **Install:**
   ```bash
   git clone <repo>
   cd MediaSearchApp
   npm install
   ```
3. **Configure `.env`:**
   ```env
   TMDB_API_KEY=your_tmdb_key
   VITE_SUPABASE_URL=https://your-project.supabase.co  # optional
   VITE_SUPABASE_ANON_KEY=your_anon_key                # optional
   ```
4. **Start dev server:**
   ```bash
   npm install -g vercel  # if you don't have it
   vercel dev             # runs Vite + serverless functions at localhost:3000
   ```

**Supabase setup (optional):** See [docs/setup/SUPABASE.md](docs/setup/SUPABASE.md) for SQL schema and RLS policies.

## Tradeoffs / Lessons Learned

**Serverless proxy adds ~50ms latency** vs. calling TMDB directly. Trade-off: API key stays hidden, easier to swap providers later, no CORS issues.

**TanStack Query was overkill** for a small app but saved hours on loading states and cache invalidation. The `enabled` flag for conditional fetching is chef's kiss.

**Supabase RLS nested policies** took 3 tries to get right (checking `list_items` via `lists.user_id`). Now I don't write auth middleware—Postgres enforces it at the row level.

**Auth-optional UX means migration logic.** When users first log in, I migrate localStorage → Supabase. One-time complexity, but worth it for zero-friction onboarding.

**@dnd-kit pointer events:** Had to prevent drag handlers from firing on buttons/inputs inside draggable cards. `shouldIgnoreDrag` checks `event.target.closest('button, input, ...')`.

## Next Improvements

- [ ] Public sharable list links (read-only, no auth required)
- [ ] Recommendations engine (match by genre overlap or collaborative filtering)
- [ ] PWA manifest + service worker for offline mode
- [ ] Batch operations (multi-select → move/delete)
- [ ] Keyboard shortcuts for power users (J/K navigation, / to focus search)
