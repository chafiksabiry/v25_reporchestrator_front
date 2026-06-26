import './public-path'; // For proper Qiankun integration
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initVisitorTrackingScripts } from '@harx/shared/tracking/initVisitorTrackingScripts';

initVisitorTrackingScripts();

// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function render(props: { container?: HTMLElement } = {}) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement) {
    if (!root) {
      root = createRoot(rootElement as HTMLElement);
    }
    root.render(<App />);
  } else {
    console.warn('[reporchestrator] Root element not found!');
  }
}

function destroy(props: { container?: HTMLElement } = {}) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    root.unmount();
    root = null;
  } else {
    console.warn('[reporchestrator] Root element not found for unmounting!');
  }
}

// Register the lifecycles with qiankun via the plugin helper. This is what
// actually exposes bootstrap/mount/unmount to qiankun's single-spa wrapper;
// bare `export function bootstrap` are NOT picked up with the `es` build
// format, which left the bootstrap promise unresolved forever (single-spa
// "#31 bootstrap timeout" warnings looping in the host console).
renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props: any) {
    render(props);
    return Promise.resolve();
  },
  unmount(props: any) {
    destroy(props || {});
    return Promise.resolve();
  },
  update() {
    return Promise.resolve();
  },
});

// Render immediately in both standalone and qiankun modes. The host
// (process_connections) loads this micro-app as a script and the immediate
// render guarantees the UI shows; qiankun's lifecycles above resolve the
// bootstrap/mount promises so single-spa stops warning.
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[reporchestrator] Running in standalone mode');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => render());
  } else {
    render();
  }
} else {
  console.log('[reporchestrator] Running inside Qiankun');
  render();
}
