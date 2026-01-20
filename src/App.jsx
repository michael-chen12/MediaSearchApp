import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import MovieDetail from './pages/MovieDetail';
import TVShowDetail from './pages/TVShowDetail';
import PersonDetail from './pages/PersonDetail';
import CollectionDetail from './pages/CollectionDetail';
import Favorites from './pages/Favorites';
import Watchlist from './pages/Watchlist';

function NotFound() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>404 - Page Not Found</h1>
      <p>
        <a href="/">Go to Home</a>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<TVShowDetail />} />
        <Route path="/person/:id" element={<PersonDetail />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
