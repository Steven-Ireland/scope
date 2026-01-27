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
      return window.electron.search(params);
    }
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getIndices() {
    if (isElectron() && window.electron) {
      return window.electron.getIndices();
    }
    const res = await fetch('/api/indices');
    return res.json();
  },

  async getFields(index: string) {
    if (isElectron() && window.electron) {
      return window.electron.getFields(index);
    }
    const res = await fetch(`/api/fields?index=${index}`);
    return res.json();
  },

  async getValues(params: { index: string; field: string; query?: string; type?: string }) {
    if (isElectron() && window.electron) {
      return window.electron.getValues(params);
    }
    const { index, field, query = '', type = '' } = params;
    const res = await fetch(`/api/values?index=${index}&field=${field}&query=${query}&type=${type}`);
    return res.json();
  }
};
