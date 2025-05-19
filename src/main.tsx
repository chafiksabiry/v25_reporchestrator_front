import React from 'react';
import './public-path';  // For proper Qiankun integration
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { StrictMode } from 'react';


// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function render(props: { container?: HTMLElement }) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement) {
    console.log('[App-rep-orchestrator] Rendering in container:', rootElement);
    // Create the root instance if it doesn't exist
    if (!root) {
      root = createRoot(rootElement);
    }
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    console.warn('[App-rep-orchestrator] Root element not found!');
  }
}

export async function bootstrap() {
  console.time('[App-rep-orchestrator] bootstrap');
  console.log('[App-rep-orchestrator] Bootstrapping...');
  return Promise.resolve();
}

export async function mount(props: any) {
  console.log('[App-rep-orchestrator] Mounting...', props);
  const { container } = props;
  if (container) {
    console.log('[App-rep-orchestrator] Found container for mounting:', container);
  } else {
    console.warn('[App-rep-orchestrator] No container found for mounting');
  }
  render(props);
  return Promise.resolve();
}

export async function unmount(props: any) {
  console.log('[App-rep-orchestrator] Unmounting...', props);
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    console.log('[App-rep-orchestrator] Unmounting from container:', rootElement);
    root.unmount();
    root = null;  // Reset the root instance
  } else {
    console.warn('[App-rep-orchestrator] Root element not found for unmounting!');
  }
  return Promise.resolve();
}

// Standalone mode: If the app is running outside Qiankun, it will use this code
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[App-rep-orchestrator] Running in standalone mode');
  render({});
} else {
  console.log('[App-rep-orchestrator] Running inside Qiankun');
  // Qiankun will control the lifecycle
  render({});
}