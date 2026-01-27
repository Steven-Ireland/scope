import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    (window as any).electron !== undefined ||
    window.navigator.userAgent.includes('Electron') ||
    (window as any).process?.versions?.electron !== undefined
  );
};
