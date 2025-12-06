export interface RssItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
}

export interface AnalyzedArticle {
  title: string;
  summary: string;
  keyPoints: string[];
  category: string;
  relevanceScore: number; // 1-10
  originalLink?: string;
}

export interface IntelligenceReport {
  generatedAt: string;
  overallSummary: string;
  topTrends: string[];
  articles: AnalyzedArticle[];
}

export interface AppState {
  rssUrl: string;
  isMonitoring: boolean;
  lastUpdated: number | null; // Timestamp
  nextUpdate: number | null; // Timestamp
  report: IntelligenceReport | null;
  history: IntelligenceReport[]; // Keep a history of reports
  isLoading: boolean;
  error: string | null;
}

export enum LogType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  message: string;
}