import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../lib/analytics';

/**
 * Analytics Tracker Component
 * 
 * Corporate Pattern: Automatic page view tracking
 * This component tracks route changes and sends page view events
 * to all configured analytics providers.
 * 
 * Usage: Place this component inside BrowserRouter
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever the route changes
    trackPageView(location.pathname + location.search, {
      // Add additional context (corporate pattern: enrich events)
      referrer: document.referrer,
      // You can add custom dimensions here
    });
  }, [location]);

  // This component doesn't render anything
  return null;
}
