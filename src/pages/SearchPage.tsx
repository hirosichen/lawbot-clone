import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  Trash2,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { getCourtName } from '../utils/court';
import { useFavorites } from '../stores/favorites';
import type { Ruling, SemanticResult, SearchResponse, SemanticSearchResponse } from '../types';

// --------------- Search History (localStorage) ---------------

const HISTORY_KEY = 'lawbot-search-history';
const MAX_HISTORY = 10;

let historyListeners: Array<() => void> = [];
let cachedHistoryRaw: string | null = null;
let cachedHistorySnapshot: string[] = [];

function emitHistoryChange() {
  cachedHistoryRaw = null; // invalidate cache
  historyListeners.forEach((l) => l());
}

function getHistorySnapshot(): string[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw === cachedHistoryRaw) return cachedHistorySnapshot;
  cachedHistoryRaw = raw;
  try {
    cachedHistorySnapshot = raw ? JSON.parse(raw) : [];
  } catch {
    cachedHistorySnapshot = [];
  }
  return cachedHistorySnapshot;
}

function addHistory(q: string) {
  const current = getHistorySnapshot().filter((h) => h !== q);
  const next = [q, ...current].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  emitHistoryChange();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  emitHistoryChange();
}

function subscribeHistory(listener: () => void) {
  historyListeners = [...historyListeners, listener];
  return () => {
    historyListeners = historyListeners.filter((l) => l !== listener);
  };
}

function useSearchHistory() {
  const history = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistorySnapshot);
  return { history, addHistory, clearHistory };
}

// --------------- Helpers ---------------

function formatDate(jdate: string): string {
  if (!jdate) return '';
  // jdate may be YYYYMMDD or YYYY-MM-DD
  const clean = jdate.replace(/-/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}/${clean.slice(4, 6)}/${clean.slice(6, 8)}`;
  }
  return jdate;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function buildRulingTitle(r: Ruling | SemanticResult): string {
  const court = getCourtName(r.jcourt);
  return `${court} ${r.jyear}年度${r.jcase}字第${r.jno}號`;
}

// --------------- HighlightText Component ---------------

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;

  // Split query into individual terms for better Chinese character matching
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// --------------- Components ---------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border-l-[3px] border-l-gray-200 dark:border-l-gray-700 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
    </div>
  );
}

function ResultCard({
  ruling,
  isSemantic,
  onToggleFavorite,
  isFav,
  highlightQuery,
}: {
  ruling: Ruling | SemanticResult;
  isSemantic: boolean;
  onToggleFavorite: () => void;
  isFav: boolean;
  highlightQuery: string;
}) {
  const navigate = useNavigate();
  const semantic = isSemantic ? (ruling as SemanticResult) : null;
  const summary = semantic?.chunk_text || ruling.jfull || '';

  return (
    <div
      onClick={() => navigate(`/ruling/${encodeURIComponent(ruling.jid)}`)}
      className="group cursor-pointer rounded-xl border-l-[3px] border-l-blue-500 dark:border-l-blue-400 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shrink-0">
              裁判
            </span>
            {ruling.jtitle && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800 shrink-0">
                {ruling.jtitle}
              </span>
            )}
            {semantic && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 shrink-0">
                相似度 {(semantic.score * 100).toFixed(1)}%
              </span>
            )}
            {semantic?.section && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shrink-0">
                {semantic.section}
              </span>
            )}
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate transition-colors">
              <HighlightText text={buildRulingTitle(ruling)} query={highlightQuery} />
            </h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {getCourtName(ruling.jcourt) && <span>{getCourtName(ruling.jcourt)}</span>}
            {getCourtName(ruling.jcourt) && ruling.jdate && <span className="mx-1.5">·</span>}
            {ruling.jdate && <span>{formatDate(ruling.jdate)}</span>}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="shrink-0 p-2 rounded-lg text-gray-300 hover:text-indigo-600 dark:text-gray-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 hover:scale-110"
          title={isFav ? '移除書籤' : '加入書籤'}
        >
          {isFav ? <BookmarkCheck size={18} className="text-indigo-600 dark:text-indigo-400" /> : <Bookmark size={18} />}
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-[1.7]">
        <HighlightText text={truncate(summary, 200)} query={isSemantic ? '' : highlightQuery} />
      </p>
    </div>
  );
}

// --------------- Main Page ---------------

type SearchMode = 'keyword' | 'semantic';
type DocType = '全部' | '裁判' | '法條';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the source of truth
  const urlQuery = searchParams.get('q') || '';
  const urlMode = (searchParams.get('mode') as SearchMode) || 'keyword';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlSort = searchParams.get('sort') || 'relevance';
  const urlDateFrom = searchParams.get('date_from') || '';
  const urlDateTo = searchParams.get('date_to') || '';
  const urlType = (searchParams.get('type') as DocType) || '全部';

  // Only the text input needs local state (for typing before submit)
  const [query, setQuery] = useState(urlQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [semanticFirstLoad, setSemanticFirstLoad] = useState(true);

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const historyBtnRef = useRef<HTMLDivElement>(null);

  const { history, addHistory, clearHistory } = useSearchHistory();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  // Sync URL query text to local input when navigating back/forward
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (historyBtnRef.current && !historyBtnRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived from URL
  const mode = urlMode;
  const sort = urlSort;
  const dateFrom = urlDateFrom;
  const dateTo = urlDateTo;
  const docType = urlType;

  const LIMIT = 20;

  // Build search params for URL
  const updateUrl = useCallback(
    (overrides: Record<string, string>) => {
      setSearchParams((prev) => {
        const params: Record<string, string> = {};
        const q = overrides.q ?? prev.get('q') ?? '';
        if (q) params.q = q;
        const m = overrides.mode ?? prev.get('mode') ?? 'keyword';
        if (m !== 'keyword') params.mode = m;
        const p = overrides.page ?? prev.get('page') ?? '1';
        if (p !== '1') params.page = p;
        const s = overrides.sort ?? prev.get('sort') ?? 'relevance';
        if (s !== 'relevance' && m === 'keyword') params.sort = s;
        const df = overrides.date_from ?? prev.get('date_from') ?? '';
        if (df) params.date_from = df;
        const dt = overrides.date_to ?? prev.get('date_to') ?? '';
        if (dt) params.date_to = dt;
        const t = overrides.type ?? prev.get('type') ?? '全部';
        if (t !== '全部') params.type = t;
        return params;
      }, { replace: false });
    },
    [setSearchParams],
  );

  // Keyword search query
  const keywordQuery = useQuery<SearchResponse>({
    queryKey: ['search', 'keyword', urlQuery, urlPage, urlSort, urlDateFrom, urlDateTo, urlType],
    queryFn: async () => {
      const { data } = await api.search({
        q: urlQuery,
        page: urlPage,
        limit: LIMIT,
        ...(urlSort === 'date' ? { mode: 'date' } : {}),
        ...(urlDateFrom ? { date_from: urlDateFrom } : {}),
        ...(urlDateTo ? { date_to: urlDateTo } : {}),
        ...(urlType !== '全部' ? { type: urlType } : {}),
      });
      return data;
    },
    enabled: !!urlQuery && urlMode === 'keyword',
  });

  // Semantic search query
  const semanticQuery = useQuery<SemanticSearchResponse>({
    queryKey: ['search', 'semantic', urlQuery],
    queryFn: async () => {
      const { data } = await api.semanticSearch({ q: urlQuery, limit: LIMIT });
      setSemanticFirstLoad(false);
      return data;
    },
    enabled: !!urlQuery && urlMode === 'semantic',
  });

  const isLoading =
    (urlMode === 'keyword' && keywordQuery.isFetching) ||
    (urlMode === 'semantic' && semanticQuery.isFetching);

  const error =
    (urlMode === 'keyword' && keywordQuery.error) ||
    (urlMode === 'semantic' && semanticQuery.error);

  const results: (Ruling | SemanticResult)[] =
    urlMode === 'keyword'
      ? keywordQuery.data?.results || []
      : semanticQuery.data?.results || [];

  const total =
    urlMode === 'keyword'
      ? keywordQuery.data?.total ?? 0
      : semanticQuery.data?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    addHistory(q);
    updateUrl({ q, page: '1' });
  };

  const handleModeSwitch = (newMode: SearchMode) => {
    updateUrl({ mode: newMode, page: '1' });
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    addHistory(q);
    updateUrl({ q, page: '1' });
    setShowHistory(false);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeChange = (type: DocType) => {
    updateUrl({ type, page: '1' });
    setShowTypeDropdown(false);
  };

  const toggleFavorite = (r: Ruling | SemanticResult) => {
    if (isFavorite(r.jid)) {
      removeFavorite(r.jid);
    } else {
      addFavorite({
        jid: r.jid,
        title: buildRulingTitle(r),
        date: r.jdate,
        court: r.jcourt,
        folder: '未分類',
      });
    }
  };

  const docTypes: DocType[] = ['全部', '裁判', '法條'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Mode Tabs - Segmented Control */}
      <div className="flex gap-0 mb-5 bg-gray-100 dark:bg-gray-800/80 rounded-full p-1 w-fit">
        <button
          onClick={() => handleModeSwitch('keyword')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === 'keyword'
              ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          關鍵字搜尋
        </button>
        <button
          onClick={() => handleModeSwitch('semantic')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === 'semantic'
              ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          語意搜尋
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-5">
        {mode === 'keyword' ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋判決書..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-600 shadow-sm transition-all duration-200"
              />
            </div>

            {/* Document Type Filter */}
            <div ref={typeDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className={`flex items-center gap-1.5 px-3.5 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  docType !== '全部'
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'
                }`}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">{docType === '全部' ? '文件類型' : docType}</span>
                <ChevronDown size={14} />
              </button>
              {showTypeDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1.5 overflow-hidden">
                  {docTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        docType === type
                          ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search History Toggle */}
            <div ref={historyBtnRef} className="relative">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center px-3.5 py-3.5 rounded-xl border text-sm transition-all duration-200 ${
                  showHistory
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'
                }`}
                title="搜尋紀錄"
              >
                <Clock size={16} />
              </button>
              {showHistory && history.length > 0 && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1.5 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">最近搜尋</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory();
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={10} />
                      清除
                    </button>
                  </div>
                  {history.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHistoryClick(h)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                    >
                      <Clock size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />
                      <span className="truncate">{h}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <Search size={20} className="absolute left-4 top-4 text-gray-400" />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="輸入想查詢的法律問題、概念或情境..."
              rows={3}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-600 shadow-sm resize-none transition-all duration-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
            />
          </div>
        )}

        {/* Filters (keyword mode only) */}
        {mode === 'keyword' && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowUpDown size={14} />
              篩選
            </button>
            {showFilters && (
              <>
                <select
                  value={sort}
                  onChange={(e) => {
                    if (urlQuery) updateUrl({ sort: e.target.value, page: '1' });
                  }}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="relevance">依關聯度</option>
                  <option value="date">依日期</option>
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    if (urlQuery) updateUrl({ date_from: e.target.value, page: '1' });
                  }}
                  placeholder="開始日期"
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/40"
                />
                <span className="text-gray-300 dark:text-gray-600 text-sm">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    if (urlQuery) updateUrl({ date_to: e.target.value, page: '1' });
                  }}
                  placeholder="結束日期"
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/40"
                />
              </>
            )}
          </div>
        )}
      </form>

      {/* Search History (shown when no active query and no dropdown history) */}
      {!urlQuery && !showHistory && history.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Clock size={14} />
              最近搜尋
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              清除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => handleHistoryClick(h)}
                className="text-sm px-4 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Semantic loading hint */}
      {urlMode === 'semantic' && isLoading && semanticFirstLoad && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
          語意搜尋模型載入中，首次查詢約需 20 秒...
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-16">
          <p className="text-red-500 dark:text-red-400 mb-2">搜尋時發生錯誤</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">請稍後再試，或嘗試不同的搜尋詞</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && urlQuery && (
        <>
          {results.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                共 {total.toLocaleString()} 筆結果
                {docType !== '全部' && (
                  <span className="ml-1">（{docType}）</span>
                )}
                {urlMode === 'keyword' && totalPages > 1 && (
                  <span>，第 {urlPage} / {totalPages} 頁</span>
                )}
              </p>
              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard
                    key={urlMode === 'semantic' ? `${r.jid}-${(r as SemanticResult).chunk_index}` : r.jid}
                    ruling={r}
                    isSemantic={urlMode === 'semantic'}
                    isFav={isFavorite(r.jid)}
                    onToggleFavorite={() => toggleFavorite(r)}
                    highlightQuery={urlQuery}
                  />
                ))}
              </div>

              {/* Pagination (keyword only, semantic returns all at once) */}
              {urlMode === 'keyword' && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8 pb-4">
                  <button
                    onClick={() => handlePageChange(urlPage - 1)}
                    disabled={urlPage <= 1}
                    className="flex items-center gap-1 px-5 py-2.5 rounded-full text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    <ChevronLeft size={16} />
                    上一頁
                  </button>
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-medium px-2">
                    {urlPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(urlPage + 1)}
                    disabled={urlPage >= totalPages}
                    className="flex items-center gap-1 px-5 py-2.5 rounded-full text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    下一頁
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-1">找不到相關結果</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                請嘗試其他關鍵字或切換搜尋模式
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state (no query) */}
      {!urlQuery && history.length === 0 && (
        <div className="text-center py-16">
          <Search size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-3">
            {mode === 'keyword' ? '使用關鍵字搜尋判決書標題或全文' : '切換到語意搜尋，用自然語言描述法律問題'}
          </p>
          <div className="text-sm text-gray-400 dark:text-gray-500 space-y-1.5 max-w-md mx-auto">
            {mode === 'keyword' ? (
              <>
                <p>輸入案件類型、法條名稱或關鍵詞</p>
                <p>例如：「車禍損害賠償」、「竊盜 緩刑」、「民法第184條」</p>
              </>
            ) : (
              <>
                <p>用自然語言描述您的法律問題</p>
                <p>例如：「房東不退押金怎麼辦」、「被公司無故資遣可以求償嗎」</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
