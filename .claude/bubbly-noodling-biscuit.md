# MediaSearchApp Implementation Plan

## Overview
Transform MediaSearchApp into a full-featured media discovery platform supporting Movies, TV Shows, People, and Collections with tab-based navigation, trending content, and favorites/watchlist functionality.

## User Requirements Summary
- **Content Types**: Movies, TV Shows, People, Collections
- **Discovery**: Trending content (daily/weekly) on home page
- **Detail Pages**: Cast & Crew, Similar content
- **UI Style**: Poster-focused cards with clean design
- **Navigation**: Tab-based (Movies, TV Shows, People)
- **Search**: Basic search across all content types
- **User Features**: Favorites/Watchlist stored locally
- **TV Shows**: Show seasons/episodes (different layout from movies)
- **People Pages**: Display filmography (movies + TV shows)
- **Priority**: Core experience first - perfect Movies & TV Shows, then expand

## Current State
✅ **Working**: Complete movie pages (Home, SearchResults, MovieDetail), component library, Layout system, dark mode, secure serverless proxy for movies

✅ **Phase 1 Complete**: Foundation fixed, routing working, secure API migration complete, TabNavigation component added, trending tabs working

✅ **Phase 2 Complete**: Full TV Shows support - 6 serverless API endpoints, client functions, TVShowCard component, TVShowDetail page with seasons, Home and SearchResults pages updated with TV tabs

✅ **Phase 3 Complete**: Full People support - 4 serverless API endpoints, client functions, PersonCard component, PersonDetail page with filmography, SearchResults updated with People tab, routing for /person/:id

⚠️ **Next Priority**: Phase 4 (Collections Support) or Phase 5 (Favorites & Watchlist)

---

## PHASE 1: Fix Foundation & Perfect Movies (CRITICAL)

**Goal**: Get existing movie functionality working securely with proper routing

### 1.1 Fix Routing & Wire Up Pages

**File**: `src/App.jsx`

Current state: Has placeholder div components
Actions:
- Import real pages: `Home`, `SearchResults`, `MovieDetail` from `src/pages/`
- Import `Layout` from `src/components/layout/Layout`
- Wrap routes in `<Layout>` component
- Add route: `/movie/:id` → `<MovieDetail />`
- Keep existing routes: `/` → `<Home />`, `/search` → `<SearchResults />`, `*` → `<NotFound />`

### 1.2 Migrate to Secure API (Security Critical)

**Problem**: Pages currently import from `src/api/tmdb.js` which calls TMDB directly with `VITE_TMDB_API_KEY` (exposes key in browser bundle)

**Solution**: Change imports to use `src/lib/tmdbClient.js` (calls secure proxy endpoints)

**Files to Update**:
1. `src/pages/Home.jsx` - Line 2: Change `import { getTrendingMovies } from '../api/tmdb'` to `import { getTrendingMovies } from '../lib/tmdbClient'`
2. `src/pages/SearchResults.jsx` - Change imports from `../api/tmdb` to `../lib/tmdbClient`
3. `src/pages/MovieDetail.jsx` - Change imports from `../api/tmdb` to `../lib/tmdbClient` (includes `getMovieDetails`, `getMovieCredits`, `getSimilarMovies`, `getImageUrl`)
4. `src/components/common/MovieCard.jsx` - Change `getImageUrl` import from `../../api/tmdb` to `../../lib/tmdbClient`

**After migration**: Delete `src/api/tmdb.js` (deprecated)

### 1.3 Add Tab Navigation Component

**New File**: `src/components/common/TabNavigation.jsx`

Purpose: Reusable tab component for Movies/TV/People switching

Features:
- Props: `tabs` (array of {id, label, count?}), `activeTab` (string), `onTabChange` (callback)
- URL state management using `useSearchParams`
- Active tab highlighting with primary color
- Mobile responsive (scrollable on small screens)
- Dark mode support
- Pattern: Follow structure similar to `Pagination.jsx` component

Styling:
- Active tab: `bg-primary-600 text-white dark:bg-primary-500`
- Inactive tab: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`
- Tab container: `flex gap-2 border-b border-gray-200 dark:border-gray-700`

### 1.4 Enhance Home Page with Trending Tabs

**File**: `src/pages/Home.jsx`

Add daily/weekly trending tabs:
- Use `useSearchParams` to manage `timeWindow` param (`day` or `week`, default `week`)
- Add TabNavigation component above movie grid with tabs: [{id: 'week', label: 'This Week'}, {id: 'day', label: 'Today'}]
- Update `useQuery` queryKey to include timeWindow: `['trendingMovies', timeWindow]`
- Update page title dynamically: "Trending Today" or "Trending This Week"
- Maintain existing grid layout and responsive design

### 1.5 Verification for Phase 1

Test that:
- ✅ Navigate to `/` shows trending movies with daily/weekly tabs
- ✅ Click movie card navigates to `/movie/:id` with full details
- ✅ Search in header navigates to `/search?q=query` with results
- ✅ Pagination works on search results
- ✅ All pages use Layout (header, footer visible)
- ✅ Dark mode works across all pages
- ✅ No `VITE_TMDB_API_KEY` appears in browser DevTools → Sources
- ✅ Network tab shows requests to `/api/tmdb/*` (not direct to TMDB)

---

## PHASE 2: Add TV Shows Support

**Goal**: Full TV show support with seasons/episodes

### 2.1 Create TV Show Serverless API Endpoints

**Pattern**: Copy existing movie endpoints, change TMDB API path

**New Files** (in `api/tmdb/` directory):

1. **`tv-search.js`** (copy `search.js`)
   - TMDB endpoint: `https://api.themoviedb.org/3/search/tv?api_key=...&query={q}&page={page}`
   - Query params: `q` (required), `page` (default 1)

2. **`tv-details.js`** (copy `movie.js`)
   - TMDB endpoint: `https://api.themoviedb.org/3/tv/{id}?api_key=...`
   - Query params: `id` (required)

3. **`tv-trending.js`** (copy `trending.js`)
   - TMDB endpoint: `https://api.themoviedb.org/3/trending/tv/{timeWindow}?api_key=...&page={page}`
   - Query params: `timeWindow` (day/week), `page`

4. **`tv-credits.js`** (copy `credits.js`)
   - TMDB endpoint: `https://api.themoviedb.org/3/tv/{id}/credits?api_key=...`
   - Query params: `id`

5. **`tv-similar.js`** (copy `similar.js`)
   - TMDB endpoint: `https://api.themoviedb.org/3/tv/{id}/similar?api_key=...&page={page}`
   - Query params: `id`, `page`

6. **`tv-season.js`** (new pattern)
   - TMDB endpoint: `https://api.themoviedb.org/3/tv/{id}/season/{season_number}?api_key=...`
   - Query params: `id`, `seasonNumber`
   - Returns: Episode list for the season

All endpoints follow same pattern:
```javascript
export default async function handler(req, res) {
  const API_KEY = process.env.TMDB_API_KEY;
  // Extract params, call TMDB, return JSON
}
```

### 2.2 Extend Client API Functions

**File**: `src/lib/tmdbClient.js`

Append these functions (follow existing patterns):

```javascript
// Search TV shows
export async function searchTVShows(query, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return http(`${API_BASE}/tv-search?${params}`);
}

// Get TV show details
export async function getTVShowDetails(tvId) {
  return http(`${API_BASE}/tv-details?id=${tvId}`);
}

// Get trending TV shows
export async function getTrendingTVShows(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({ timeWindow, page: String(page) });
  return http(`${API_BASE}/tv-trending?${params}`);
}

// Get TV show credits (cast & crew)
export async function getTVShowCredits(tvId) {
  return http(`${API_BASE}/tv-credits?id=${tvId}`);
}

// Get similar TV shows
export async function getSimilarTVShows(tvId, page = 1) {
  const params = new URLSearchParams({ id: String(tvId), page: String(page) });
  return http(`${API_BASE}/tv-similar?${params}`);
}

// Get TV season details with episodes
export async function getTVSeasonDetails(tvId, seasonNumber) {
  const params = new URLSearchParams({
    id: String(tvId),
    seasonNumber: String(seasonNumber)
  });
  return http(`${API_BASE}/tv-season?${params}`);
}
```

### 2.3 Create TV Show Card Component

**New File**: `src/components/common/TVShowCard.jsx`

**Pattern**: Copy `MovieCard.jsx` structure with TV-specific adjustments

Key differences:
- Use `name` instead of `title` (TMDB TV shows use "name")
- Use `first_air_date` instead of `release_date`
- Link to `/tv/:id` instead of `/movie/:id`
- Keep same styling, poster aspect ratio, hover effects
- Use `formatYear(tv.first_air_date)` for year display

### 2.4 Create TV Show Detail Page

**New File**: `src/pages/TVShowDetail.jsx`

**Pattern**: Copy `MovieDetail.jsx` structure with TV-specific sections

Structure:
1. **Header Section** (backdrop + poster):
   - Show backdrop image with gradient overlay
   - Poster (desktop only)
   - Title (`name`), first air date, rating, genres
   - Show `number_of_seasons` and `number_of_episodes`
   - Show "Created by" instead of director

2. **Overview Section**: TV show description

3. **Metadata Section**:
   - First Air Date
   - Status (e.g., "Returning Series", "Ended")
   - Number of Seasons
   - Number of Episodes
   - Rating (vote_average)
   - No budget/revenue (TV shows don't have these)

4. **Cast Section**: Top 8 actors with profile photos (same as movies)

5. **Seasons Section** (NEW):
   - List all seasons with poster thumbnails
   - Show: Season number, episode count, air date
   - Optional: Expandable to show episode list (use `getTVSeasonDetails`)
   - Layout: Vertical list or grid of season cards

6. **Similar TV Shows Section**: 6 similar shows using TVShowCard

TanStack Query keys:
- `['tvShowDetails', id]`
- `['tvShowCredits', id]`
- `['similarTVShows', id]`
- `['tvSeasonDetails', id, seasonNumber]` (if implementing expandable episodes)

### 2.5 Add TV Shows to Home Page

**File**: `src/pages/Home.jsx`

Add Movies/TV Shows tabs:
- Use `useSearchParams` for `mediaType` param (`movie` or `tv`, default `movie`)
- Add TabNavigation above trending tabs: [{id: 'movie', label: 'Movies'}, {id: 'tv', label: 'TV Shows'}]
- Two-level tabs: Media type (Movies/TV) → Time window (Day/Week)
- Conditional data fetching based on mediaType:
  - If `movie`: `useQuery(['trendingMovies', timeWindow], () => getTrendingMovies(timeWindow))`
  - If `tv`: `useQuery(['trendingTVShows', timeWindow], () => getTrendingTVShows(timeWindow))`
- Conditional rendering: MovieCard for movies, TVShowCard for TV shows
- Update page title: "Trending Movies" or "Trending TV Shows"

### 2.6 Add TV Shows to Search Results

**File**: `src/pages/SearchResults.jsx`

Add Movies/TV Shows tabs:
- Use `useSearchParams` for `mediaType` param (`movie` or `tv`, default `movie`)
- Add TabNavigation above results: [{id: 'movie', label: 'Movies'}, {id: 'tv', label: 'TV Shows'}]
- Each tab has independent pagination
- Conditional queries:
  - `['searchMovies', query, page]` or `['searchTVShows', query, page]`
- Conditional rendering: MovieCard vs TVShowCard
- Show result counts: "X movies found" or "X TV shows found"

### 2.7 Update Routing

**File**: `src/App.jsx`

Add TV show route:
```jsx
<Route path="/tv/:id" element={<TVShowDetail />} />
```

### 2.8 Utilities for TV Shows

**File**: `src/utils/format.js`

Add TV-specific formatters (append to existing file):

```javascript
// Format season/episode as "S01E05"
export function formatEpisode(season, episode) {
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  return `S${s}E${e}`;
}

// Format air date (alias for clarity)
export function formatAirDate(dateString) {
  return formatDate(dateString);
}
```

### 2.9 Verification for Phase 2

Test that:
- ✅ Home page has Movies/TV Shows tabs, TV trending loads correctly
- ✅ Click TV show card navigates to `/tv/:id` with details
- ✅ TV detail page shows: name, air date, seasons, episodes, cast, similar shows
- ✅ Search page has Movies/TV tabs, TV search returns results
- ✅ All TV show images load correctly
- ✅ Seasons section displays properly (with episode counts)

---

## PHASE 3: Add People Support ✅ COMPLETE

**Goal**: People search with filmography pages

### 3.1 Create People Serverless API Endpoints ✅

**New Files** (in `api/tmdb/` directory):

1. ✅ **`person-search.js`**
   - TMDB endpoint: `https://api.themoviedb.org/3/search/person?api_key=...&query={q}&page={page}`

2. ✅ **`person-details.js`**
   - TMDB endpoint: `https://api.themoviedb.org/3/person/{id}?api_key=...`

3. ✅ **`person-credits.js`**
   - TMDB endpoint: `https://api.themoviedb.org/3/person/{id}/combined_credits?api_key=...`
   - Returns: Combined movie and TV credits (filmography)

4. ✅ **`person-trending.js`** (optional for home page)
   - TMDB endpoint: `https://api.themoviedb.org/3/trending/person/{timeWindow}?api_key=...&page={page}`

### 3.2 Extend Client API Functions ✅

**File**: `src/lib/tmdbClient.js`

✅ Added all people functions:
- `searchPeople(query, page)`
- `getPersonDetails(personId)`
- `getPersonCredits(personId)`
- `getTrendingPeople(timeWindow, page)`

### 3.3 Create Person Card Component ✅

**File**: `src/components/common/PersonCard.jsx`

✅ Completed with:
- Profile photo display with fallback icon
- Name and known_for_department
- Link to `/person/:id`
- Dark mode support

### 3.4 Create Person Detail Page ✅

**File**: `src/pages/PersonDetail.jsx`

✅ Completed with:
- Header section (profile photo, name, birthday, age)
- Biography section
- Filmography section split into Movies and TV Shows
- Sorted by date descending (most recent first)
- Uses MovieCard/TVShowCard components

### 3.5 Add People to Search Results ✅

**File**: `src/pages/SearchResults.jsx`

✅ Completed:
- Added "People" tab to search
- Added conditional query for people
- Renders PersonCard for people results
- Shows result count: "X people found"

### 3.6 Add People to Home Page (Optional) ⏭️ SKIPPED

**File**: `src/pages/Home.jsx`

⏭️ Skipped for now - can be added later if needed

### 3.7 Update Routing ✅

**File**: `src/App.jsx`

✅ Added person route:
```jsx
<Route path="/person/:id" element={<PersonDetail />} />
```

### 3.8 Verification for Phase 3

Test that:
- ✅ Search page has People tab, people search works
- ✅ Click person card navigates to `/person/:id`
- ✅ Person page shows biography and filmography (movies + TV)
- ✅ Filmography links work (click movie/TV show navigates to detail)
- ⏭️ Home page People tab (skipped - optional)

---

## PHASE 4: Add Collections Support

**Goal**: Movie collections (e.g., "Marvel Cinematic Universe")

### 4.1 Create Collection API

**New File**: `api/tmdb/collection.js`
- TMDB endpoint: `https://api.themoviedb.org/3/collection/{id}?api_key=...`

**File**: `src/lib/tmdbClient.js`
```javascript
export async function getCollectionDetails(collectionId) {
  return http(`${API_BASE}/collection?id=${collectionId}`);
}
```

### 4.2 Create Collection Detail Page

**New File**: `src/pages/CollectionDetail.jsx`

Structure:
- Collection backdrop
- Collection name and overview
- Grid of movies in collection (use MovieCard)
- Sort by release date

Query key: `['collectionDetails', id]`

### 4.3 Update Movie Detail to Show Collection

**File**: `src/pages/MovieDetail.jsx`

If movie has `belongs_to_collection`:
- Add "Part of Collection" section
- Show collection name with link to `/collection/:id`
- Display collection poster thumbnail

### 4.4 Update Routing

**File**: `src/App.jsx`
```jsx
<Route path="/collection/:id" element={<CollectionDetail />} />
```

### 4.5 Verification for Phase 4

Test that:
- ✅ Movie detail shows collection link (test with Marvel movies)
- ✅ Click collection navigates to `/collection/:id`
- ✅ Collection page shows all movies in order

---

## PHASE 5: Favorites & Watchlist

**Goal**: User can save favorites and watchlist (stored in localStorage)

### 5.1 Create Favorites Context

**New File**: `src/context/FavoritesContext.jsx`

**Pattern**: Copy structure from `ThemeContext.jsx`

State structure:
```javascript
{
  movies: [{ id, title, poster_path, release_date }],
  tvShows: [{ id, name, poster_path, first_air_date }]
}
```

Functions:
- `addFavorite(item, mediaType)` - mediaType: 'movie' | 'tv'
- `removeFavorite(id, mediaType)`
- `isFavorite(id, mediaType)` - returns boolean
- `getFavorites(mediaType)` - returns array

localStorage key: `cinematic_favorites`

Export: `FavoritesProvider`, `useFavorites()` hook

### 5.2 Create Watchlist Context

**New File**: `src/context/WatchlistContext.jsx`

Same pattern as FavoritesContext
localStorage key: `cinematic_watchlist`
Export: `WatchlistProvider`, `useWatchlist()` hook

### 5.3 Update Provider Hierarchy

**File**: `src/main.jsx`

Wrap app with new contexts (add outer layers):
```jsx
<FavoritesProvider>
  <WatchlistProvider>
    <QueryClientProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </WatchlistProvider>
</FavoritesProvider>
```

### 5.4 Add Action Buttons to Detail Pages

**Files**: `src/pages/MovieDetail.jsx`, `src/pages/TVShowDetail.jsx`

Add two floating action buttons in header section:
1. **Favorite button** (heart icon):
   - Use `useFavorites()` hook
   - Toggle on/off with `addFavorite` / `removeFavorite`
   - Visual states: filled heart (favorited) vs outline (not favorited)
   - Show with hover effect

2. **Watchlist button** (bookmark icon):
   - Use `useWatchlist()` hook
   - Toggle on/off
   - Visual states: filled bookmark vs outline

Styling: Fixed position (top-right or floating), accessible on mobile

### 5.5 Create Favorites Page

**New File**: `src/pages/Favorites.jsx`

Structure:
- Page title: "My Favorites"
- Tabs: Movies | TV Shows (using TabNavigation)
- Grid of MovieCard or TVShowCard based on active tab
- Empty state: "No favorites yet. Start adding movies and TV shows you love!"
- Data source: `getFavorites('movie')` or `getFavorites('tv')`

### 5.6 Create Watchlist Page

**New File**: `src/pages/Watchlist.jsx`

Same pattern as Favorites page
Title: "My Watchlist"

### 5.7 Update Header Navigation

**File**: `src/components/layout/Header.jsx`

Add navigation links (between search and theme toggle):
- Link to `/favorites` (heart icon, show count badge if >0)
- Link to `/watchlist` (bookmark icon, show count badge if >0)

Use hooks to get counts:
```javascript
const { getFavorites } = useFavorites();
const favoritesCount = getFavorites('movie').length + getFavorites('tv').length;
```

### 5.8 Update Routing

**File**: `src/App.jsx`
```jsx
<Route path="/favorites" element={<Favorites />} />
<Route path="/watchlist" element={<Watchlist />} />
```

### 5.9 Verification for Phase 5

Test that:
- ✅ Click favorite button on movie/TV detail toggles state
- ✅ Refresh page, favorites persist (localStorage)
- ✅ Navigate to `/favorites`, see saved movies/TV shows
- ✅ Click item in favorites navigates to detail
- ✅ Remove from favorites works (both from detail page and favorites page)
- ✅ Same for watchlist
- ✅ Badge counts in header update correctly

---

## Implementation Sequence Summary

1. **Phase 1** (Foundation): Fix routing, migrate to secure API, add tab component, enhance home - **START HERE**
2. **Phase 2** (TV Shows): Add all TV show support - **CORE EXPERIENCE**
3. **Phase 3** (People): Add people search and filmography
4. **Phase 4** (Collections): Add collection pages
5. **Phase 5** (Favorites): Add user preferences (localStorage)

Complete Phase 1 and Phase 2 fully before moving to Phase 3 (per user's "core experience" priority).

---

## Critical Files Reference

### Routing
- `src/App.jsx` - Main routing setup

### Existing Pages (to migrate)
- `src/pages/Home.jsx` - Trending content
- `src/pages/SearchResults.jsx` - Search with pagination
- `src/pages/MovieDetail.jsx` - Movie details

### New Pages to Create
- `src/pages/TVShowDetail.jsx` - TV show details (Phase 2)
- `src/pages/PersonDetail.jsx` - Person filmography (Phase 3)
- `src/pages/CollectionDetail.jsx` - Collection page (Phase 4)
- `src/pages/Favorites.jsx` - Favorites list (Phase 5)
- `src/pages/Watchlist.jsx` - Watchlist (Phase 5)

### API Client
- `src/lib/tmdbClient.js` - Client functions (extend with TV, people, collections)
- `src/lib/http.js` - HTTP wrapper (no changes needed)

### API Endpoints (serverless)
- `api/tmdb/*.js` - Existing movie endpoints
- Create: `tv-*.js`, `person-*.js`, `collection.js` endpoints

### Components
- `src/components/common/TabNavigation.jsx` - NEW: Tab component
- `src/components/common/TVShowCard.jsx` - NEW: TV show card
- `src/components/common/PersonCard.jsx` - NEW: Person card
- `src/components/common/MovieCard.jsx` - Existing (fix import)
- `src/components/layout/Layout.jsx` - Existing layout wrapper
- `src/components/layout/Header.jsx` - Update with favorites/watchlist links

### Context
- `src/context/ThemeContext.jsx` - Existing (no changes)
- `src/context/FavoritesContext.jsx` - NEW (Phase 5)
- `src/context/WatchlistContext.jsx` - NEW (Phase 5)

### Utilities
- `src/utils/format.js` - Extend with TV formatters
- `src/hooks/useDebounce.js` - Existing (no changes)

### Files to Delete
- `src/api/tmdb.js` - Delete after Phase 1 migration complete

---

## Design Patterns to Follow

### TanStack Query Keys
- Movies: `['trendingMovies', timeWindow]`, `['searchMovies', query, page]`, `['movieDetails', id]`
- TV: `['trendingTVShows', timeWindow]`, `['searchTVShows', query, page]`, `['tvShowDetails', id]`
- People: `['trendingPeople', timeWindow]`, `['searchPeople', query, page]`, `['personDetails', id]`

### URL State Management
- Use `useSearchParams` from react-router-dom
- Home: `/?mediaType=movie&timeWindow=week`
- Search: `/search?q=query&mediaType=movie&page=1`

### Dark Mode
All components must support dark mode using Tailwind variants:
- Text: `text-gray-900 dark:text-gray-100`
- Backgrounds: `bg-white dark:bg-gray-800`
- Borders: `border-gray-200 dark:border-gray-700`
- Primary accent: `text-primary-600 dark:text-primary-400`

### Responsive Grids
- Cards: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Cast: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`

### Image Handling
- Always check if path exists before calling `getImageUrl()`
- Provide fallback UI for missing images (SVG placeholders)
- Use appropriate image types: 'poster', 'backdrop', 'profile'

### Error Handling
- Use existing `ErrorMessage` component with retry button
- Use `EmptyState` component for no results
- Use `LoadingSkeleton` components for loading states

---

## Testing & Verification Checklist

### After Phase 1 (Movies)
- [ ] Home page loads trending movies with day/week tabs
- [ ] Search works with pagination
- [ ] Movie detail page shows all sections (cast, similar)
- [ ] All pages use Layout (header + footer)
- [ ] Dark mode works everywhere
- [ ] API key NOT exposed in browser (check DevTools → Sources)
- [ ] Network requests go to `/api/tmdb/*` (not TMDB directly)

### After Phase 2 (TV Shows)
- [ ] Home page has Movies/TV tabs
- [ ] TV detail page shows seasons and episodes
- [ ] Search has TV shows tab with results
- [ ] TV show images load correctly
- [ ] Cast section works on TV shows

### After Phase 3 (People)
- [ ] Search has People tab
- [ ] Person detail shows filmography (movies + TV)
- [ ] Filmography links navigate to correct detail pages

### After Phase 4 (Collections)
- [ ] Movie detail shows collection link (if applicable)
- [ ] Collection page displays all movies in order

### After Phase 5 (Favorites/Watchlist)
- [ ] Can add/remove favorites from detail pages
- [ ] Favorites persist after page refresh
- [ ] Favorites page shows saved items with tabs
- [ ] Header shows badge counts
- [ ] Same for watchlist

### Cross-cutting Concerns (Test Throughout)
- [ ] All images have fallbacks for missing posters/profiles
- [ ] Loading states show skeleton screens
- [ ] Error states show retry buttons
- [ ] 404 page works for invalid routes
- [ ] Mobile responsive (test at 375px, 768px, 1024px)
- [ ] Dark mode toggle works on all pages
- [ ] Accessibility: keyboard navigation, ARIA labels, semantic HTML

---

## Additional Notes

### TMDB API Pagination
- TMDB returns max 500 pages
- Pagination component already enforces this limit

### Serverless Function Pattern
All serverless functions follow this structure:
```javascript
export default async function handler(req, res) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Extract query params
    const { param1, param2 } = req.query;

    // Validate params
    if (!param1) {
      return res.status(400).json({ error: 'param1 is required' });
    }

    // Call TMDB API
    const tmdbUrl = `https://api.themoviedb.org/3/endpoint?api_key=${API_KEY}&param1=${param1}`;
    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Return response with CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Context Provider Pattern (for Favorites/Watchlist)
```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('cinematic_favorites');
    return stored ? JSON.parse(stored) : { movies: [], tvShows: [] };
  });

  useEffect(() => {
    localStorage.setItem('cinematic_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (item, mediaType) => {
    setFavorites(prev => ({
      ...prev,
      [mediaType === 'movie' ? 'movies' : 'tvShows']: [
        ...prev[mediaType === 'movie' ? 'movies' : 'tvShows'],
        item
      ]
    }));
  };

  // ... other functions

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, /* ... */ }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
```

---

## End of Plan

This plan provides a complete roadmap for transforming MediaSearchApp into a full-featured media discovery platform. Start with Phase 1 to establish a secure foundation, then proceed through each phase sequentially, testing thoroughly at each stage.
