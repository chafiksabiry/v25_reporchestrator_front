import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildTrackingPath } from '@/lib/tracking/pageMeta';
import { syncVisitorTracking } from '@/lib/tracking/visitorTracking';

export default function VisitorTracker() {
  const location = useLocation();

  useEffect(() => {
    syncVisitorTracking(buildTrackingPath());
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onHashChange = () => syncVisitorTracking(buildTrackingPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return null;
}
