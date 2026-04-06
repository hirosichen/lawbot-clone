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
