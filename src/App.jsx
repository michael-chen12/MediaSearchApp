import { Routes, Route } from 'react-router-dom';

// Placeholder pages for smoke test
function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Movie Explorer - Home</h1>
      <p>Foundation setup complete. Serverless proxy ready.</p>
      <p>
        <a href="/search">Go to Search</a>
      </p>
    </div>
  );
}

function SearchPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Movie Explorer - Search</h1>
      <p>Search page placeholder. API proxy configured.</p>
      <p>
        <a href="/">Go to Home</a>
      </p>
    </div>
  );
}

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
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
