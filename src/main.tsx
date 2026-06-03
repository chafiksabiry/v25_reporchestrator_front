import './public-path'; // For proper Qiankun integration
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
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

export async function bootstrap() {
  return Promise.resolve();
}

export async function mount(props: any) {
  render(props);
  return Promise.resolve();
}

export async function unmount(props: any) {
  const { container } = props || {};
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    root.unmount();
    root = null;
  } else {
    console.warn('[reporchestrator] Root element not found for unmounting!');
  }
  return Promise.resolve();
}

// Render immediately in both standalone and qiankun modes. The host
// (process_connections) loads this micro-app as a script and the immediate
// render guarantees the UI shows; qiankun's deferred lifecycle is used only
// as a loader, mirroring the working `company` micro-app.
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
