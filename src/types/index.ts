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
