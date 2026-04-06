export interface Ruling {
  jid: string;
  jyear: string;
  jcase: string;
  jno: string;
  jdate: string;
  jtitle: string;
  jfull: string;
  jcourt: string;
  jtype: string;
  period?: string;
}

export interface SemanticResult extends Ruling {
  chunk_index: number;
  section: string;
  chunk_text: string;
  distance: number;
  score: number;
}

export interface SearchResponse {
  results: Ruling[];
  total: number;
  has_more: boolean;
  page: number;
  limit: number;
  source: string;
}

export interface SemanticSearchResponse {
  results: SemanticResult[];
  total: number;
  query: string;
}

export interface StatsResponse {
  total_rulings: number;
  courts: number;
}

export interface Citation {
  id: number;
  from_jid: string;
  cited_year: string;
  cited_case: string;
  cited_no: string;
  cited_full: string;
  cite_type: string;
}

export interface Favorite {
  jid: string;
  title: string;
  date: string;
  court: string;
  folder: string;
  addedAt: string;
}

export interface Law {
  pcode: string;
  law_name: string;
  law_level: string;
  law_category: string;
  law_url: string;
  modified_date: string;
  effective_date: string;
  effective_note: string;
  is_abolished: boolean;
  has_eng_version: boolean;
  eng_law_name: string;
  law_foreword: string;
  law_histories: string;
}

export interface LawArticle {
  article_type: 'A' | 'C';
  article_no: string;
  article_no_normalized: string;
  ordinal: number;
  article_content: string;
}

export interface LawWithArticles extends Law {
  articles: LawArticle[];
}

export interface LawsStatsResponse {
  total_laws: number;
  active_laws: number;
  total_articles: number;
  by_level: Array<{ level: string; count: number }>;
}

// ===== Project & sub-item types =====

export type EntityType = 'person' | 'org' | 'date' | 'amount' | 'place';
export type Priority = 'high' | 'medium' | 'low';

export interface Attachment {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  charCount?: number;
  parseMethod?: string;
  preview?: string;
  uploadedAt: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  role?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  stance?: string;
  priority: Priority;
  createdAt: string;
}

export interface Gap {
  id: string;
  description: string;
  suggestion?: string;
  priority: Priority;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  content: string;
  linkedFromChatId?: string;
  createdAt: string;
}

export interface ProjectReference {
  id: string;
  source: 'lawbot' | 'custom';
  title: string;
  url?: string;
  content?: string;
  addedAt: string;
}

// ===== Search-related types =====

export type DocType =
  | 'all'
  | 'law'
  | 'judgment'
  | 'constitutional'
  | 'interpretation'
  | 'resolution'
  | 'legalQA'
  | 'letter';
export type SearchMode = 'keyword' | 'semantic';
export type SearchSort = 'relevance' | 'date';

export interface LawItem {
  id: string; // slug like 'civil-law'
  name: string; // 民法
  category?: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  mode: SearchMode;
  docTypes?: DocType[];
  dateRange?: [number, number];
  createdAt: string; // ISO
}

export interface Project {
  id: string;
  title: string;
  facts: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
  entities?: Entity[];
  issues?: Issue[];
  gaps?: Gap[];
  documents?: ProjectDocument[];
  references?: ProjectReference[];
}
