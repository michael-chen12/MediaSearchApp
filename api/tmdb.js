/**
 * Unified Vercel Serverless Function
 * Proxies all TMDB API endpoints through a single function
 * Routes based on path parameter
 */

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Extract the endpoint path from query parameters
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
    // Build query parameters
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
}
