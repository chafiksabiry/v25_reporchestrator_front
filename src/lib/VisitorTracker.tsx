import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { buildTrackingPath } from '@/lib/tracking/pageMeta';
import { syncVisitorTracking } from '@/lib/tracking/visitorTracking';

const isQiankunChild = Boolean(qiankunWindow.__POWERED_BY_QIANKUN__);

export default function VisitorTracker() {
  const location = useLocation();

  useEffect(() => {
    if (isQiankunChild) return;
    syncVisitorTracking(buildTrackingPath());
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (isQiankunChild) return;
    const onHashChange = () => syncVisitorTracking(buildTrackingPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return null;
}
