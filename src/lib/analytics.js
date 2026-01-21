/**
 * Analytics Service
 * 
 * This module provides a unified interface for tracking user behavior and events.
 * It supports both privacy-friendly analytics (Plausible) and enterprise analytics (Google Analytics 4).
 * 
 * Corporate Best Practices Implemented:
 * 1. Abstract analytics providers behind a single API
 * 2. Support multiple providers simultaneously
 * 3. Respect user privacy (DNT header, consent)
 * 4. Fail gracefully if analytics is blocked
 * 5. Type-safe event tracking with named events
 * 6. Environment-based configuration
 * 7. Performance monitoring capabilities
 */

// Check if user has Do Not Track enabled
const isDNTEnabled = () => {
  return navigator.doNotTrack === '1' || 
         window.doNotTrack === '1' || 
         navigator.msDoNotTrack === '1';
};

// Configuration from environment variables
const config = {
  plausible: {
    enabled: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    domain: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    apiHost: import.meta.env.VITE_PLAUSIBLE_API_HOST || 'https://plausible.io',
  },
  ga: {
    enabled: import.meta.env.VITE_GA_MEASUREMENT_ID,
    measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  },
  respectDNT: import.meta.env.VITE_RESPECT_DNT !== 'false', // Default true
  debug: import.meta.env.DEV, // Auto-enable in development
};

/**
 * Initialize Plausible Analytics
 * Plausible is privacy-friendly: no cookies, no personal data, GDPR/CCPA compliant
 */
const initPlausible = () => {
  if (!config.plausible.enabled) return;

  // Check if already loaded
  if (window.plausible) return;

  // Load Plausible script
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = config.plausible.domain;
  script.src = `${config.plausible.apiHost}/js/script.js`;
  
  // Add optional features
  // script.src = `${config.plausible.apiHost}/js/script.outbound-links.js`; // Track external links
  // script.dataset.apiHost = config.plausible.apiHost; // For self-hosted Plausible
  
  document.head.appendChild(script);

  // Create placeholder function until script loads
  window.plausible = window.plausible || function() { 
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };

  if (config.debug) {
    console.log('📊 Plausible Analytics initialized');
  }
};

/**
 * Initialize Google Analytics 4
 * GA4 is the corporate standard with advanced features but requires more privacy considerations
 */
const initGA4 = () => {
  if (!config.ga.enabled) return;

  // Check if already loaded
  if (window.gtag) return;

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga.measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  
  // Configure GA4
  window.gtag('config', config.ga.measurementId, {
    // Privacy-focused configuration
    anonymize_ip: true, // Anonymize IP addresses
    allow_google_signals: false, // Disable Google Signals (cross-device tracking)
    allow_ad_personalization_signals: false, // Disable ad personalization
    // You can add more config here based on your privacy policy
  });

  if (config.debug) {
    console.log('📊 Google Analytics 4 initialized');
  }
};

/**
 * Initialize all enabled analytics providers
 * Call this once when your app starts
 */
export const initAnalytics = () => {
  // Respect Do Not Track
  if (config.respectDNT && isDNTEnabled()) {
    console.log('📊 Analytics disabled: Do Not Track is enabled');
    return;
  }

  // Initialize providers
  initPlausible();
  initGA4();
};

/**
 * Track a page view
 * Corporate pattern: Always track page views for funnel analysis
 * 
 * @param {string} path - The page path (e.g., '/movie/123')
 * @param {object} options - Additional properties
 */
export const trackPageView = (path, options = {}) => {
  if (config.respectDNT && isDNTEnabled()) return;

  const pageData = {
    page_path: path,
    page_title: document.title,
    ...options,
  };

  // Plausible automatically tracks page views, but we can trigger manual ones
  if (config.plausible.enabled && window.plausible) {
    window.plausible('pageview', { 
      props: options // Custom properties
    });
  }

  // Google Analytics 4
  if (config.ga.enabled && window.gtag) {
    window.gtag('event', 'page_view', pageData);
  }

  if (config.debug) {
    console.log('📊 Page View:', path, options);
  }
};

/**
 * Track a custom event
 * Corporate pattern: Use event tracking for user interactions and conversions
 * 
 * @param {string} eventName - Name of the event (e.g., 'add_to_watchlist')
 * @param {object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
  if (config.respectDNT && isDNTEnabled()) return;

  // Plausible custom events
  if (config.plausible.enabled && window.plausible) {
    window.plausible(eventName, { props: properties });
  }

  // Google Analytics 4 events
  if (config.ga.enabled && window.gtag) {
    window.gtag('event', eventName, properties);
  }

  if (config.debug) {
    console.log('📊 Event:', eventName, properties);
  }
};

/**
 * Predefined events following corporate naming conventions
 * These follow GA4 recommended events and industry standards
 */
export const events = {
  // Search events
  search: (query, mediaType, resultsCount) => 
    trackEvent('search', { 
      search_term: query,
      media_type: mediaType,
      results_count: resultsCount,
    }),

  // Content interaction events
  viewContent: (contentType, contentId, contentName) =>
    trackEvent('view_item', {
      content_type: contentType, // 'movie', 'tv_show', 'person'
      item_id: contentId,
      item_name: contentName,
    }),

  // Watchlist events (corporate: track conversions)
  addToWatchlist: (mediaType, itemId, itemName) =>
    trackEvent('add_to_watchlist', {
      media_type: mediaType,
      item_id: itemId,
      item_name: itemName,
    }),

  removeFromWatchlist: (mediaType, itemId, itemName) =>
    trackEvent('remove_from_watchlist', {
      media_type: mediaType,
      item_id: itemId,
      item_name: itemName,
    }),

  // Favorites events
  addToFavorites: (mediaType, itemId, itemName) =>
    trackEvent('add_to_favorites', {
      media_type: mediaType,
      item_id: itemId,
      item_name: itemName,
    }),

  removeFromFavorites: (mediaType, itemId, itemName) =>
    trackEvent('remove_from_favorites', {
      media_type: mediaType,
      item_id: itemId,
      item_name: itemName,
    }),

  // Engagement events
  switchTab: (tabName, location) =>
    trackEvent('switch_tab', {
      tab_name: tabName,
      location: location,
    }),

  toggleTheme: (theme) =>
    trackEvent('toggle_theme', {
      theme: theme,
    }),

  clickSimilarItem: (itemType, itemId) =>
    trackEvent('click_similar_item', {
      item_type: itemType,
      item_id: itemId,
    }),

  // Navigation events
  clickExternalLink: (destination, linkText) =>
    trackEvent('click_external_link', {
      destination: destination,
      link_text: linkText,
    }),

  // Error tracking
  error: (errorType, errorMessage, location) =>
    trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      location: location,
    }),

  // Performance tracking (corporate: monitor app health)
  timing: (category, variable, value) =>
    trackEvent('timing_complete', {
      name: category,
      variable: variable,
      value: value, // milliseconds
    }),
};

/**
 * Create a React hook for analytics (optional, for easier integration)
 */
export const useAnalytics = () => {
  return {
    trackPageView,
    trackEvent,
    events,
  };
};

// Auto-initialize in production (some companies do this)
// In development, you might want manual control
if (import.meta.env.PROD) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
}

export default {
  init: initAnalytics,
  trackPageView,
  trackEvent,
  events,
};
