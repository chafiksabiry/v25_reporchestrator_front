import { useEffect } from 'react';
import { buildTrackingPath } from './pageMeta';
import { syncPageHead, updatePageHead } from './visitorTracking';

/** Override the browser tab title for the current view; restores route title on unmount. */
export function usePageTitle(title: string | null | undefined, description?: string) {
  useEffect(() => {
    if (!title?.trim()) return;

    updatePageHead({
      title,
      description: description ?? '',
    });

    return () => {
      syncPageHead(buildTrackingPath());
    };
  }, [title, description]);
}
