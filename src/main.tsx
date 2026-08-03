import './public-path'; // For proper Qiankun integration
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initVisitorTrackingScripts } from '@/lib/tracking/initVisitorTrackingScripts';
import { syncPageHead } from '@/lib/tracking/visitorTracking';

initVisitorTrackingScripts();

// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function resolveRootElement(container?: HTMLElement): HTMLElement | null {
  if (container) {
    let el = container.querySelector('#root') as HTMLElement | null;
    // Qiankun injects entry HTML into #container-reps; harden if #root is missing
    if (!el) {
      el = document.createElement('div');
      el.id = 'root';
      container.appendChild(el);
    }
    return el;
  }
  return document.getElementById('root');
}

function render(props: { container?: HTMLElement } = {}) {
  const { container } = props;
  // Never fall back to the host document #root while inside qiankun — that
  // replaces the shell and removes #container-reps ("container not existed after mounted").
  if (qiankunWindow.__POWERED_BY_QIANKUN__ && !container) {
    return;
  }

  const rootElement = resolveRootElement(container);

  if (rootElement) {
    syncPageHead();
    if (!root) {
      root = createRoot(rootElement);
    }
    root.render(<App />);
  } else {
    console.warn('[reporchestrator] Root element not found!');
  }
}

function destroy(props: { container?: HTMLElement } = {}) {
  const { container } = props;
  const rootElement = container
    ? (container.querySelector('#root') as HTMLElement | null)
    : document.getElementById('root');

  if (rootElement && root) {
    root.unmount();
    root = null;
  } else if (root) {
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
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
    // Remount so AuthContext re-reads token after login/logout in another MF
    if (root) {
      try {
        root.unmount();
      } catch {
        /* ignore */
      }
      root = null;
    }
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

// Standalone only — in qiankun, wait for mount(props) with the real container
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[reporchestrator] Running in standalone mode');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => render());
  } else {
    render();
  }
} else {
  console.log('[reporchestrator] Running inside Qiankun — waiting for mount()');
}
