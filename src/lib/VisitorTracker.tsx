import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { buildTrackingPath } from '@/lib/tracking/pageMeta';
import { syncPageHead, syncVisitorTracking } from '@/lib/tracking/visitorTracking';

const isQiankunChild = Boolean(qiankunWindow.__POWERED_BY_QIANKUN__);

export default function VisitorTracker() {
  const location = useLocation();
  const lastPathRef = useRef('');

  const apply = (path: string) => {
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;
    if (isQiankunChild) {
      syncPageHead(path);
    } else {
      syncVisitorTracking(path);
    }
  };

  useEffect(() => {
    apply(buildTrackingPath());
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onHashChange = () => apply(buildTrackingPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return null;
}
