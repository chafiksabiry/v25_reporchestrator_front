import { useState, useEffect } from 'react';

/**
 * Hook to get URL parameters from query string
 * @param paramName - Name of the parameter to get
 * @returns The parameter value or null if not found
 */
export const useUrlParam = (paramName: string): string | null => {
  const [paramValue, setParamValue] = useState<string | null>(null);

  useEffect(() => {
    const getUrlParam = () => {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get(paramName);
    };

    // Get initial value
    setParamValue(getUrlParam());

    // Listen for URL changes (for when using browser navigation)
    const handleUrlChange = () => {
      setParamValue(getUrlParam());
    };

    // Listen for popstate events (back/forward button)
    window.addEventListener('popstate', handleUrlChange);

    // Also listen for custom events if the URL is changed programmatically
    window.addEventListener('locationchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('locationchange', handleUrlChange);
    };
  }, [paramName]);

  return paramValue;
};

/**
 * Hook to get all URL parameters
 * @returns Object with all URL parameters
 */
export const useUrlParams = (): Record<string, string> => {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const getUrlParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const paramsObj: Record<string, string> = {};
      
      for (const [key, value] of searchParams.entries()) {
        paramsObj[key] = value;
      }
      
      return paramsObj;
    };

    // Get initial values
    setParams(getUrlParams());

    // Listen for URL changes
    const handleUrlChange = () => {
      setParams(getUrlParams());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('locationchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('locationchange', handleUrlChange);
    };
  }, []);

  return params;
};
