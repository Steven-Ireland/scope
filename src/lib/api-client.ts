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
    }
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
    headers['x-scope-url'] = server.url;
    if (server.username) headers['x-scope-username'] = server.username;
    if (server.password) headers['x-scope-password'] = server.password;
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

  async getValues(params: { index: string; field: string; query?: string; type?: string }, server?: ServerConfig) {
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
  }
};
