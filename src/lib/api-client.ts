import { isElectron } from './utils';
import { ServerConfig } from '@/types/server';

declare global {
  interface Window {
    electron?: {
      search: (params: any) => Promise<any>;
      getIndices: () => Promise<any>;
      getFields: (index: string) => Promise<any>;
      getValues: (params: any) => Promise<any>;
      isElectron: boolean;
      saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      loadConfig: () => Promise<any>;
      selectFile: (title?: string) => Promise<string | null>;
    };
  }
}

const getBaseUrl = () => {
  if (isElectron()) {
    return 'http://localhost:3001';
  }
  return '';
};

const BASE_URL = getBaseUrl();

const getHeaders = (server?: ServerConfig) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (server) {
    headers['x-scope-server-id'] = server.id;
  }
  return headers;
};

export const apiClient = {
  async search(params: any, server?: ServerConfig) {
    const res = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: getHeaders(server),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Search failed: ${res.status} ${text.slice(0, 100)}`);
    }

    return res.json();
  },

  async getIndices(server?: ServerConfig) {
    const res = await fetch(`${BASE_URL}/api/indices`, {
      headers: getHeaders(server),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch indices: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getFields(index: string, server?: ServerConfig) {
    const res = await fetch(`${BASE_URL}/api/fields?index=${index}`, {
      headers: getHeaders(server),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch fields: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getValues(
    params: { index: string; field: string; query?: string; type?: string },
    server?: ServerConfig
  ) {
    const { index, field, query = '', type = '' } = params;
    const queryString = new URLSearchParams({ index, field, query, type }).toString();
    const res = await fetch(`${BASE_URL}/api/values?${queryString}`, {
      headers: getHeaders(server),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch values: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async verifyServer(server: Omit<ServerConfig, 'id'> | ServerConfig, signal?: AbortSignal) {
    const res = await fetch(`${BASE_URL}/api/verify-server`, {
      headers: getHeaders(server as ServerConfig),
      signal,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Verification failed: ${res.status}`);
    }
    return res.json();
  },
};
