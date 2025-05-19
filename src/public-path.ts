// Extend the global `Window` interface to include qiankun-specific properties
declare global {
    interface Window {
      __POWERED_BY_QIANKUN__?: boolean; // Optional since it might not always be defined
      __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string; // Optional for standalone mode
    }
}

// Declare the Webpack `__webpack_public_path__` variable
declare let __webpack_public_path__: string;

// Dynamically set the Webpack public path when running inside qiankun
if (window.__POWERED_BY_QIANKUN__) {
    // Ensure the injected path is defined before assigning it
    if (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__) {
        __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
    } else {
        console.warn(
            '[Qiankun] __INJECTED_PUBLIC_PATH_BY_QIANKUN__ is not defined!'
        );
    }
}