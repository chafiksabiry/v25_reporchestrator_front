/// <reference types="vite/client" />

declare module '*.jsx' {
  import type { ComponentType } from 'react';
  const component: ComponentType<Record<string, unknown>>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_RUN_MODE: string;
  readonly VITE_API_URL: string;
  readonly VITE_REP_API_URL: string;
  readonly VITE_AUTH_API_URL: string;
  readonly VITE_API_URL_CALL: string;
  readonly VITE_MATCHING_API_URL: string;
  readonly VITE_TRAINING_BACKEND_URL: string;
  readonly VITE_BACKEND_KNOWLEDGEBASE_API: string;
  readonly VITE_COMPORCHESTRATOR_BACK_URL: string;
  readonly VITE_REP_DASHBOARD_URL: string;
  readonly VITE_REP_DASHBOARD_URL_STANDALONE: string;
  readonly VITE_REP_ORCHESTRATOR_URL: string;
  readonly VITE_REP_ORCHESTRATOR_URL_STANDALONE: string;
  readonly VITE_STANDALONE_USER_ID: string;
  readonly VITE_STANDALONE_AGENT_ID: string;
  readonly VITE_STANDALONE_TOKEN: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_LINKEDIN_CLIENT_ID: string;
  readonly VITE_LINKEDIN_CLIENT_SECRET: string;
  readonly VITE_LINKEDIN_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
