import { isElectron } from './utils';

declare global {
  interface Window {
    electron?: {
      search: (params: any) => Promise<any>;
      getIndices: () => Promise<any>;
      getFields: (index: string) => Promise<any>;
      getValues: (params: any) => Promise<any>;
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

export const apiClient = {
  async search(params: any) {
    // We can still use IPC if available, but let's prefer the Express server 
    // to fulfill the user's request of using an Express server.
    // If you want to keep IPC as a fallback, you can.
    
    const res = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Search failed: ${res.status} ${text.slice(0, 100)}`);
    }
    
    return res.json();
  },

  async getIndices() {
    const res = await fetch(`${BASE_URL}/api/indices`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch indices: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getFields(index: string) {
    const res = await fetch(`${BASE_URL}/api/fields?index=${index}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch fields: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getValues(params: { index: string; field: string; query?: string; type?: string }) {
    const { index, field, query = '', type = '' } = params;
    const res = await fetch(`${BASE_URL}/api/values?index=${index}&field=${field}&query=${query}&type=${type}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch values: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  }
};