import './public-path'; // For proper Qiankun integration
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

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

// Register the qiankun lifecycle so the host (process_connections) can
// bootstrap/mount/unmount this micro-app. Without renderWithQiankun the
// lifecycle is never registered and single-spa throws timeout #31.
renderWithQiankun({
  bootstrap() {
    console.log('[reporchestrator] Bootstrapping...');
  },
  mount(props: any) {
    console.log('[reporchestrator] Mounting...', props);
    render(props);
  },
  unmount(props: any) {
    console.log('[reporchestrator] Unmounting...', props);
    const { container } = props || {};
    const rootElement = container
      ? container.querySelector('#root')
      : document.getElementById('root');
    if (rootElement && root) {
      root.unmount();
      root = null;
    }
  },
  update(props: any) {
    console.log('[reporchestrator] Updating...', props);
  },
});

// Standalone mode: render directly when not powered by qiankun.
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[reporchestrator] Running in standalone mode');
  render();
}
