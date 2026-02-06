export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  color?: string;
  certPath?: string;
  keyPath?: string;
  allowInsecureSSL?: boolean;
  majorVersion?: number;
  indexPatterns?: string[];
}
