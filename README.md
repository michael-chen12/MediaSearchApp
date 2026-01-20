# Movie Explorer

A modern movie search and discovery application built with React, powered by The Movie Database (TMDB) API.

## Tech Stack

- **Frontend**: Vite + React (JavaScript)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **Backend**: Vercel Serverless Functions (proxy to hide API key)

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

```
TMDB_API_KEY=your_actual_tmdb_api_key_here
```

**Important**: Do NOT use `VITE_` prefix for the API key. The key must remain server-side only.

### 4. Running the Application

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
