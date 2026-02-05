import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getValueByPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (
      typeof obj[k] === 'object' &&
      obj[k] !== null &&
      !Array.isArray(obj[k]) &&
      Object.keys(obj[k]).length > 0
    ) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    (window as any).electron !== undefined ||
    window.navigator.userAgent.includes('Electron') ||
    (window as any).process?.versions?.electron !== undefined
  );
};
