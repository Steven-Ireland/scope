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

export const apiClient = {
  async search(params: any) {
    if (isElectron() && window.electron) {
      try {
        return await window.electron.search(params);
      } catch (err) {
        console.error('Electron IPC Search Error:', err);
        throw err;
      }
    }
    
    const res = await fetch('/api/search', {
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
    if (isElectron() && window.electron) {
      try {
        return await window.electron.getIndices();
      } catch (err) {
        console.error('Electron IPC GetIndices Error:', err);
        throw err;
      }
    }
    
    const res = await fetch('/api/indices');
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch indices: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getFields(index: string) {
    if (isElectron() && window.electron) {
      try {
        return await window.electron.getFields(index);
      } catch (err) {
        console.error('Electron IPC GetFields Error:', err);
        throw err;
      }
    }
    
    const res = await fetch(`/api/fields?index=${index}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch fields: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  },

  async getValues(params: { index: string; field: string; query?: string; type?: string }) {
    if (isElectron() && window.electron) {
      try {
        return await window.electron.getValues(params);
      } catch (err) {
        console.error('Electron IPC GetValues Error:', err);
        throw err;
      }
    }
    
    const { index, field, query = '', type = '' } = params;
    const res = await fetch(`/api/values?index=${index}&field=${field}&query=${query}&type=${type}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch values: ${res.status} ${text.slice(0, 100)}`);
    }
    return res.json();
  }
};