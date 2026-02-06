import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function getTimestampField(
  visibleColumns: string[],
  allDateFields: string[],
  fallbackTimestampField?: string
): string | undefined {
  if (allDateFields.length === 0) return undefined;
  const selectedDateField = visibleColumns.find((col) => allDateFields.includes(col));
  return selectedDateField || fallbackTimestampField;
}

export function parseRelativeTime(relative: string): { from: Date; to: Date } {
  const now = new Date();
  if (!relative || relative === 'now') return { from: now, to: now };

  // Handle both "now-15m" and just "15m"
  const cleanRelative = relative.startsWith('now-') ? relative.substring(4) : relative;
  const match = cleanRelative.match(/^(\d+)([smhdwMy])$/);

  if (!match) return { from: now, to: now };

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const from = new Date(now);

  switch (unit) {
    case 's':
      from.setSeconds(now.getSeconds() - value);
      break;
    case 'm':
      from.setMinutes(now.getMinutes() - value);
      break;
    case 'h':
      from.setHours(now.getHours() - value);
      break;
    case 'd':
      from.setDate(now.getDate() - value);
      break;
    case 'w':
      from.setDate(now.getDate() - value * 7);
      break;
    case 'M':
      from.setMonth(now.getMonth() - value);
      break;
    case 'y':
      from.setFullYear(now.getFullYear() - value);
      break;
  }

  return { from, to: now };
}
