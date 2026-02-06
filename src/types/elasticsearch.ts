export interface LogEntry {
  _id: string;
  _source: Record<string, any>;
}

export interface ElasticsearchField {
  name: string;
  type: string;
}
