// Extend the global `Window` interface to include qiankun-specific properties
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

// Declare the Webpack `__webpack_public_path__` variable
declare let __webpack_public_path__: string;

// Dynamically set the public path when running inside qiankun so that
// chunks/assets resolve against the micro-app origin, not the host origin.
if (window.__POWERED_BY_QIANKUN__) {
  if (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__) {
    __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  } else {
    console.warn('[Qiankun] __INJECTED_PUBLIC_PATH_BY_QIANKUN__ is not defined!');
  }
}

export {};
