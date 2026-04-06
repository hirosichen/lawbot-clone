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

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
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
    <div className="animate-pulse rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
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
      className="group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
              裁判
            </span>
            <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-400 group-hover:underline truncate">
              <HighlightText text={buildRulingTitle(ruling)} query={highlightQuery} />
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(ruling.jdate)}
            {semantic && (
              <>
                <span className="mx-2">|</span>
                <span className="text-primary-600 dark:text-primary-400 font-medium">
                  相似度 {(semantic.score * 100).toFixed(1)}%
                </span>
                {semantic.section && (
                  <>
                    <span className="mx-2">|</span>
                    <span>{semantic.section}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isFav ? '移除書籤' : '加入書籤'}
        >
          {isFav ? <BookmarkCheck size={18} className="text-primary-600 dark:text-primary-400" /> : <Bookmark size={18} />}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <HighlightText text={truncate(summary, 200)} query={highlightQuery} />
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
      {/* Mode Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => handleModeSwitch('keyword')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'keyword'
              ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          關鍵字搜尋
        </button>
        <button
          onClick={() => handleModeSwitch('semantic')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'semantic'
              ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          語意搜尋
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        {mode === 'keyword' ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋判決書..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Document Type Filter */}
            <div ref={typeDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  docType !== '全部'
                    ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">{docType === '全部' ? '文件類型' : docType}</span>
                <ChevronDown size={14} />
              </button>
              {showTypeDropdown && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                  {docTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        docType === type
                          ? 'text-primary-600 dark:text-primary-400 font-medium'
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
                className={`flex items-center px-3 py-3 rounded-xl border text-sm transition-colors ${
                  showHistory
                    ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="搜尋紀錄"
              >
                <Clock size={16} />
              </button>
              {showHistory && history.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">最近搜尋</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory();
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
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
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <Clock size={12} className="text-gray-400 shrink-0" />
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
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
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
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
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
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    if (urlQuery) updateUrl({ date_to: e.target.value, page: '1' });
                  }}
                  placeholder="結束日期"
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                />
              </>
            )}
          </div>
        )}
      </form>

      {/* Search History (shown when no active query and no dropdown history) */}
      {!urlQuery && !showHistory && history.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
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
                className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Semantic loading hint */}
      {urlMode === 'semantic' && isLoading && semanticFirstLoad && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-sm text-primary-700 dark:text-primary-300">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
                <div className="flex items-center justify-center gap-4 mt-8 pb-4">
                  <button
                    onClick={() => handlePageChange(urlPage - 1)}
                    disabled={urlPage <= 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                    上一頁
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {urlPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(urlPage + 1)}
                    disabled={urlPage >= totalPages}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    下一頁
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
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
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          請輸入關鍵字開始搜尋
        </div>
      )}
    </div>
  );
}
