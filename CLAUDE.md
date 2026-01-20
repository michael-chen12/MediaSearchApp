# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Recommended: Run both frontend and Vercel functions together
vercel dev

# Alternative: Frontend only (requires separate serverless function setup)
npm run dev
```

**Important**: The app requires BOTH the Vite dev server AND Vercel serverless functions. Use `vercel dev` to run both together. The frontend alone will not work as it needs the `/api/tmdb/*` proxy endpoints.

### Build and Preview
```bash
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

### Environment Setup
```bash
cp .env.example .env
# Then add your TMDB_API_KEY (without VITE_ prefix)
```

## Architecture Overview

### Serverless Proxy Pattern

This app uses a **3-tier architecture** to keep the TMDB API key secure:

```
Browser Client → Vercel Functions (/api/tmdb/*) → TMDB API
                 (API key lives here)
```

**Critical**: Client code NEVER calls TMDB directly. All requests go through our proxy.

- **Client layer**: `src/lib/tmdbClient.js` - calls proxy endpoints
- **Proxy layer**: `api/tmdb/*.js` - Vercel serverless functions with API key
- **External API**: The Movie Database (TMDB)

### API Key Security

- `TMDB_API_KEY` is stored in `.env` (NO `VITE_` prefix)
- Only serverless functions (`api/tmdb/*.js`) access it via `process.env.TMDB_API_KEY`
- Using `VITE_` prefix would expose the key in the client bundle (security issue)
- The key never reaches the browser

### Provider Hierarchy

In `src/main.jsx`, providers are stacked in this order (outer to inner):
1. `QueryClientProvider` - TanStack Query for data fetching
2. `ThemeProvider` - Dark mode with localStorage persistence
3. `BrowserRouter` - React Router for navigation

### Data Fetching Pattern

All API calls use TanStack Query (React Query) with this pattern:

```javascript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['resourceName', ...params],
  queryFn: () => apiClientFunction(params),
  enabled: !!dependency  // conditional fetching
});
```

**Important config** (in `src/main.jsx`):
- `staleTime: 5 minutes` - data fresh for 5 min
- `gcTime: 10 minutes` - cache retained for 10 min
- `retry: 2` - retry failed requests twice
- `refetchOnWindowFocus: false` - don't refetch on tab focus

### Dark Mode Implementation

- Uses Tailwind's `class` strategy (not media query)
- `ThemeProvider` manages state in localStorage + React context
- Root element gets `dark` class added/removed
- Components use `dark:` variants (e.g., `dark:bg-gray-900`)
- Respects system preference on first load

### Routing Structure

Current routes (defined in `src/App.jsx`):
- `/` - Home page (trending movies)
- `/search` - Search results with pagination
- `/movie/:id` - Movie detail page
- `*` - 404 Not Found

**Note**: The current `src/App.jsx` has placeholder components. The actual page implementations are in `src/pages/` (Home.jsx, SearchResults.jsx, MovieDetail.jsx) but are not yet wired up in App.jsx routing.

### Image Handling

TMDB images are served via CDN with configurable sizes:

```javascript
getImageUrl(path, type, size)
// type: 'poster' | 'backdrop' | 'profile'
// size: 'small' | 'medium' | 'large' | 'original'
```

Defined in `src/lib/tmdbClient.js` with hardcoded size mappings (e.g., poster medium = w342).

## Key Files and Their Roles

### API/Data Layer
- `src/lib/http.js` - Generic fetch wrapper with standardized error handling
- `src/lib/tmdbClient.js` - Client functions that call proxy endpoints (search, details, trending, etc.)
- `api/tmdb/*.js` - Serverless functions that proxy to TMDB API
- `src/api/tmdb.js` - **DEPRECATED** (calls TMDB directly with VITE_ key, should be removed/replaced)

### State Management
- `src/context/ThemeContext.jsx` - Dark mode context with localStorage
- TanStack Query manages all server state (no Redux/Zustand)

### Utilities
- `src/utils/format.js` - Date, runtime, currency, rating formatters
- `src/hooks/useDebounce.js` - Debounce hook for search input

### Common Components
- `src/components/common/MovieCard.jsx` - Reusable movie card with poster, title, rating
- `src/components/common/LoadingSkeleton.jsx` - Shimmer loading states
- `src/components/common/ErrorMessage.jsx` - Error display with retry
- `src/components/common/Pagination.jsx` - Paginated navigation (max 500 pages)
- `src/components/layout/` - Header, Footer, Layout wrapper

## Important Constraints

### API Pagination Limit
TMDB returns up to 500 pages max. The `Pagination` component enforces this with `maxPages = Math.min(totalPages, 500)`.

### Image Fallbacks
Always check if image paths exist before calling `getImageUrl()`. Use fallback UI for missing posters/backdrops (see MovieCard.jsx for example).

### Query Keys Convention
Use consistent query key patterns:
- `['trendingMovies']`
- `['searchMovies', query, page]`
- `['movieDetails', id]`
- `['movieCredits', id]`
- `['similarMovies', id]`

This ensures proper cache invalidation and prevents duplicate requests.

## Migration Notes

**Current Issue**: There are TWO API client implementations:
1. `src/api/tmdb.js` - OLD, calls TMDB directly with VITE_TMDB_API_KEY (insecure)
2. `src/lib/tmdbClient.js` - NEW, calls proxy endpoints (secure)

The pages in `src/pages/` currently import from `src/api/tmdb.js`. These should be updated to use `src/lib/tmdbClient.js` instead.

## Vercel Deployment

The `vercel.json` config is minimal (only rewrites). Vercel auto-detects Vite framework.

**Environment variables on Vercel**:
- Add `TMDB_API_KEY` in Vercel dashboard (Project Settings → Environment Variables)
- Ensure it's available to serverless functions (not exposed to client)


## Designing Pages and Features Pattern
- When implementing something, ALWAYS ASK ME FIRST before doing anything. This is important
-  Start by identifying what components needed in each page and pattern that we're going to create
- If the component (example: Button, Card, Avatar, Badge, Container etc.) doesn't exist, create a new custom reusable component in the @/src/components folder. Each component Folder consists of CSS and JS file

## Git setup
- Use Git as checkpoint system. If there is MCP Server that can assists me, tell me.
- If there is no Git initizialized. Tell me to do so.
- When implementing features, ask me if I want to commit to git and push.