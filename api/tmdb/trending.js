/**
 * Vercel Serverless Function
 * Proxies TMDB /trending/movie/{time_window} endpoint
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
  const { timeWindow = 'week', page = '1' } = req.query;

  if (!['day', 'week'].includes(timeWindow)) {
    return res.status(400).json({ message: 'Invalid timeWindow. Must be "day" or "week"' });
  }

  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not configured');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const url = new URL(`${TMDB_BASE_URL}/trending/movie/${timeWindow}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('page', page);

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
    console.error('Error proxying trending request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
