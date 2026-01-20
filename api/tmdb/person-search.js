/**
 * Vercel Serverless Function
 * Proxies TMDB /search/person endpoint
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

  // Validate input
  const { q, page = '1' } = req.query;

  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ message: 'Query parameter "q" is required' });
  }

  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not configured');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const url = new URL(`${TMDB_BASE_URL}/search/person`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('query', q);
    url.searchParams.append('page', page);
    url.searchParams.append('include_adult', 'false');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TMDB API error:', response.status, errorText);
      return res.status(response.status).json({
        message: `TMDB API error: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error proxying person search request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
