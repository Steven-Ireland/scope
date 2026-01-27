import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isElectron = () => {
  return typeof window !== 'undefined' && 
    ((window as any).process?.type === 'renderer' || !!window.navigator.userAgent.includes('Electron'));
};
