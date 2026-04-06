import axios from 'axios';

const API_BASE = 'https://law-api.onlymake.ai';

export const api = {
  getStats: () => axios.get(`${API_BASE}/api/stats`),
  search: (params: {
    q: string;
    mode?: string;
    court?: string;
    year?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => axios.get(`${API_BASE}/api/search`, { params }),
  semanticSearch: (params: { q: string; limit?: number; probes?: number }) =>
    axios.get(`${API_BASE}/api/semantic-search`, { params }),
  getRuling: (jid: string) =>
    axios.get(`${API_BASE}/api/ruling/${encodeURIComponent(jid)}`),
  getCitations: (jid: string) =>
    axios.get(`${API_BASE}/api/citations`, { params: { jid } }),
  getReverseCitations: (params: {
    cited_year: string;
    cited_case: string;
    cited_no: string;
  }) => axios.get(`${API_BASE}/api/citations/reverse`, { params }),
  getLawsStats: () => axios.get(`${API_BASE}/api/laws/stats`),
  getLaws: (params: { q?: string; category?: string; level?: string; is_abolished?: string; page?: number; limit?: number }) =>
    axios.get(`${API_BASE}/api/laws`, { params }),
  getLaw: (pcode: string) => axios.get(`${API_BASE}/api/laws/${pcode}`),
  getLawArticles: (pcode: string, params?: { article_no?: string; q?: string }) =>
    axios.get(`${API_BASE}/api/laws/${pcode}/articles`, { params }),
};
