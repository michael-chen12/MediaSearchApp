# Movie Explorer

A modern movie search and discovery application built with React, powered by The Movie Database (TMDB) API.

## Tech Stack

- **Frontend**: Vite + React (JavaScript)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **Backend**: Vercel Serverless Functions (proxy to hide API key)
- **Auth & Sync**: Supabase (email/password)

## Project Structure

```
MediaSearchApp/
├── api/                      # Vercel serverless functions
│   └── tmdb/
│       ├── search.js         # Proxy for movie search
│       ├── movie.js          # Proxy for movie details
│       ├── trending.js       # Proxy for trending movies
│       ├── credits.js        # Proxy for movie credits
│       └── similar.js        # Proxy for similar movies
├── src/
│   ├── lib/
│   │   ├── http.js           # Reusable fetch wrapper
│   │   └── tmdbClient.js     # API client (calls proxy endpoints)
│   ├── components/           # React components (for future UI)
│   ├── pages/                # Page components (for future UI)
│   ├── App.jsx               # Main app with routing
│   └── main.jsx              # Entry point with providers
└── public/
```

## Setup Instructions

### 1. Get TMDB API Key

1. Go to [The Movie Database](https://www.themoviedb.org/)
2. Create an account and sign in
3. Go to Settings > API
4. Request an API key (choose "Developer" option)
5. Copy your API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your TMDB API key:

```env
# Required: TMDB API Key
TMDB_API_KEY=your_actual_tmdb_api_key_here

# Required for auth + synced lists
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Analytics Configuration
VITE_PLAUSIBLE_DOMAIN=yourdomain.com
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_RESPECT_DNT=true
```

**Important**: 
- Do NOT use `VITE_` prefix for the TMDB API key (must remain server-side only)
- Analytics keys can be left empty if you don't want tracking
- See [docs/ANALYTICS.md](docs/ANALYTICS.md) for analytics setup guide

### 4. Supabase Setup (Auth + Synced Lists)

1. Create a Supabase project and enable Email/Password auth.
2. Run the SQL below in the Supabase SQL editor to create tables and policies.
3. If Supabase env vars are missing, the app falls back to localStorage-only lists.
4. On first login, existing local watchlist/favorites are migrated once to Supabase.

```sql
create extension if not exists \"pgcrypto\";

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('watchlist', 'favorites')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, type)
);

create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  media_id int not null,
  title text,
  poster_path text,
  release_date text,
  added_at timestamptz default now(),
  notes text,
  extra jsonb,
  unique (list_id, media_type, media_id)
);

create index if not exists list_items_list_id_idx on list_items (list_id);
create index if not exists list_items_media_idx on list_items (media_type, media_id);

alter table lists enable row level security;
alter table list_items enable row level security;

create policy \"Lists are viewable by owner\" on lists
  for select using (auth.uid() = user_id);
create policy \"Lists are insertable by owner\" on lists
  for insert with check (auth.uid() = user_id);
create policy \"Lists are updatable by owner\" on lists
  for update using (auth.uid() = user_id);
create policy \"Lists are deletable by owner\" on lists
  for delete using (auth.uid() = user_id);

create policy \"List items are viewable by owner\" on list_items
  for select using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy \"List items are insertable by owner\" on list_items
  for insert with check (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy \"List items are updatable by owner\" on list_items
  for update using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy \"List items are deletable by owner\" on list_items
  for delete using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
```

### 5. Running the Application

You need to run **both** the frontend dev server and the Vercel functions locally.

#### Option A: Using Vercel CLI (Recommended)

Install Vercel CLI globally:

```bash
npm install -g vercel
```

Run both frontend and serverless functions:

```bash
vercel dev
```

This will:
- Start the Vite dev server
- Start the Vercel serverless functions
- Make everything available at `http://localhost:3000`

#### Option B: Separate processes

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Serverless functions (requires Vercel CLI):
```bash
vercel dev --listen 3001
```

Then configure your frontend to proxy API requests to port 3001.

## Available Routes

- `/` - Home page (placeholder)
- `/search` - Search page (placeholder)
- `/login` - Log in
- `/signup` - Create account
- `/favorites` - Favorites list
- `/watchlist` - Watchlist

## API Endpoints (Serverless Proxy)

All endpoints are under `/api/tmdb/`:

- `GET /api/tmdb/search?q=<query>&page=<page>` - Search movies
- `GET /api/tmdb/movie?id=<movieId>` - Get movie details
- `GET /api/tmdb/trending?timeWindow=<day|week>&page=<page>` - Get trending movies
- `GET /api/tmdb/credits?id=<movieId>` - Get movie credits
- `GET /api/tmdb/similar?id=<movieId>&page=<page>` - Get similar movies

## Development Notes

### Why Serverless Proxy?

The TMDB API key is kept secure on the server side. Client code calls our Vercel functions, which then proxy requests to TMDB. This prevents the API key from being exposed in the browser.

### Architecture

```
Browser → Vercel Functions (/api/tmdb/*) → TMDB API
          (API key here, secure)
```

Client code uses `src/lib/tmdbClient.js` which calls our proxy endpoints, never TMDB directly.

## Next Steps

This is the foundation setup. Future development will add:
- Full search UI with movie cards
- Movie detail pages with cast, reviews, etc.
- Responsive design and dark mode
- Advanced filtering and discovery features

## License

MIT
