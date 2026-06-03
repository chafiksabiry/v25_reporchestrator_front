import './public-path'; // For proper Qiankun integration
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function render(props: { container?: HTMLElement }) {
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
  console.log('[reporchestrator] Bootstrapping...');
  return Promise.resolve();
}

export async function mount(props: any) {
  console.log('[reporchestrator] Mounting...', props);
  render(props);
  return Promise.resolve();
}

export async function unmount(props: any) {
  console.log('[reporchestrator] Unmounting...', props);
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
  return Promise.resolve();
}

// Standalone mode: render directly when not powered by qiankun.
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[reporchestrator] Running in standalone mode');
  render({});
}
