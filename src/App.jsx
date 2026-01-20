import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import MovieDetail from './pages/MovieDetail';

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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
