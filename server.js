/**
 * Local Development Server
 * Simulates the Vercel serverless function locally
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

app.use(cors());

app.get('/api/tmdb', async (req, res) => {
  const { endpoint, ...restParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ 
      message: 'Query parameter "endpoint" is required',
      examples: [
        '/api/tmdb?endpoint=movie/550',
        '/api/tmdb?endpoint=search/movie&query=matrix',
        '/api/tmdb?endpoint=trending/movie/week'
      ]
    });
  }

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      ...restParams
    });

    const url = `${TMDB_BASE_URL}/${endpoint}?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        message: 'TMDB API error',
        status: response.status,
        error: error
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error calling TMDB API:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying TMDB API requests`);
});
