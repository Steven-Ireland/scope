export {};

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      platform: string;
      saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      loadConfig: () => Promise<any>;
      selectFile: (title?: string) => Promise<string | null>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}
