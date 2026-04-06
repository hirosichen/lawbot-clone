import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { getCourtName } from '../utils/court';
import { useFavorites } from '../stores/favorites';
import { addHistory } from '../stores/search';
import type {
  Ruling,
  SemanticResult,
  SearchResponse,
  SemanticSearchResponse,
  DocType,
  SearchMode,
  SearchSort,
  SearchHistoryEntry,
} from '../types';

import DocTypePopover from '../components/search/DocTypePopover';
import DateRangePopover from '../components/search/DateRangePopover';
import SearchTipsPopover from '../components/search/SearchTipsPopover';
import SortToggle from '../components/search/SortToggle';
import CommonLawsSection from '../components/search/CommonLawsSection';
import SearchHistoryDialog from '../components/search/SearchHistoryDialog';

// --------------- Helpers ---------------

const YEAR_MIN = 1945;
const YEAR_MAX = new Date().getFullYear();

function formatDate(jdate: string): string {
  if (!jdate) return '';
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

function parseDocTypes(raw: string | null): DocType[] {
  if (!raw) return ['all'];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as DocType[];
  return parts.length === 0 ? ['all'] : parts;
}

function serializeDocTypes(types: DocType[]): string {
  if (types.length === 0) return '';
  if (types.length === 1 && types[0] === 'all') return '';
  return types.join(',');
}

function parseYearFromDate(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const m = /^(\d{4})/.exec(raw);
  return m ? Number(m[1]) : fallback;
}

// --------------- HighlightText ---------------

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;
  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// --------------- Skeleton ---------------

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

// --------------- ResultCard ---------------

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
  const courtName = getCourtName(ruling.jcourt);
  const isSupreme = courtName.includes('最高法院');

  return (
    <div
      onClick={() => navigate(`/ruling/${encodeURIComponent(ruling.jid)}`)}
      className="group cursor-pointer rounded-xl border-l-[3px] border-l-blue-500 dark:border-l-blue-400 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isSupreme && (
              <Crown
                size={14}
                className="text-amber-500 dark:text-amber-400 shrink-0"
                aria-label="最高法院"
              />
            )}
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
            {courtName && <span>{courtName}</span>}
            {courtName && ruling.jdate && <span className="mx-1.5">·</span>}
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
          {isFav ? (
            <BookmarkCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Bookmark size={18} />
          )}
        </button>
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-[1.7]">
        <HighlightText text={truncate(summary, 200)} query={isSemantic ? '' : highlightQuery} />
      </p>
    </div>
  );
}

// --------------- Main Page ---------------

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the source of truth
  const urlQuery = searchParams.get('q') || '';
  const urlMode = (searchParams.get('mode') as SearchMode) || 'keyword';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlSort = (searchParams.get('sort') as SearchSort) || 'relevance';
  const urlDateFrom = searchParams.get('date_from');
  const urlDateTo = searchParams.get('date_to');
  const urlTypeRaw = searchParams.get('type');

  const docTypes = useMemo<DocType[]>(() => parseDocTypes(urlTypeRaw), [urlTypeRaw]);
  const dateRange = useMemo<[number, number]>(
    () => [
      parseYearFromDate(urlDateFrom, YEAR_MIN),
      parseYearFromDate(urlDateTo, YEAR_MAX),
    ],
    [urlDateFrom, urlDateTo],
  );

  // Only the text input needs local state (for typing before submit)
  const [query, setQuery] = useState(urlQuery);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [semanticFirstLoad, setSemanticFirstLoad] = useState(true);

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  // Sync URL query text to local input when navigating back/forward
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const LIMIT = 20;

  // Build search params for URL
  const updateUrl = useCallback(
    (overrides: Record<string, string>) => {
      setSearchParams(
        (prev) => {
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
          const t = overrides.type ?? prev.get('type') ?? '';
          if (t) params.type = t;
          return params;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  // Keyword search query
  const keywordQuery = useQuery<SearchResponse>({
    queryKey: [
      'search',
      'keyword',
      urlQuery,
      urlPage,
      urlSort,
      urlDateFrom ?? '',
      urlDateTo ?? '',
      urlTypeRaw ?? '',
    ],
    queryFn: async () => {
      const { data } = await api.search({
        q: urlQuery,
        page: urlPage,
        limit: LIMIT,
        ...(urlSort === 'date' ? { mode: 'date' } : {}),
        ...(urlDateFrom ? { date_from: urlDateFrom } : {}),
        ...(urlDateTo ? { date_to: urlDateTo } : {}),
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

  // ---- Actions ----

  const runSearch = useCallback(
    (q: string, overrides: Record<string, string> = {}) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      addHistory({
        query: trimmed,
        mode: (overrides.mode as SearchMode) || urlMode,
        docTypes,
        dateRange,
      });
      updateUrl({ q: trimmed, page: '1', ...overrides });
    },
    [urlMode, docTypes, dateRange, updateUrl],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleModeSwitch = (newMode: SearchMode) => {
    updateUrl({ mode: newMode, page: '1' });
  };

  const handleDocTypesChange = (next: DocType[]) => {
    updateUrl({ type: serializeDocTypes(next), page: '1' });
  };

  const handleDateRangeChange = (next: [number, number]) => {
    const [lo, hi] = next;
    const isDefault = lo === YEAR_MIN && hi === YEAR_MAX;
    updateUrl({
      date_from: isDefault ? '' : `${lo}-01-01`,
      date_to: isDefault ? '' : `${hi}-12-31`,
      page: '1',
    });
  };

  const handleSortChange = (next: SearchSort) => {
    updateUrl({ sort: next, page: '1' });
  };

  const handleHistorySelect = (entry: SearchHistoryEntry) => {
    setQuery(entry.query);
    updateUrl({ q: entry.query, mode: entry.mode, page: '1' });
  };

  const handleCommonLawClick = (lawName: string) => {
    setQuery(lawName);
    runSearch(lawName);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ---- Subcomponents inline ----

  const modeTabs = (compact: boolean) => (
    <div
      className={`inline-flex items-center bg-gray-100 dark:bg-gray-800/80 rounded-full p-1 ${
        compact ? '' : 'mx-auto'
      }`}
    >
      {(['keyword', 'semantic'] as const).map((m) => {
        const active = urlMode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            className={`${
              compact ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'
            } rounded-full font-medium transition-all duration-200 ${
              active
                ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {m === 'keyword' ? '關鍵字搜尋' : '語意搜尋'}
          </button>
        );
      })}
    </div>
  );

  const searchInput = (compact: boolean) =>
    urlMode === 'semantic' && !compact ? (
      <div className="relative">
        <Search
          size={20}
          className="absolute left-5 top-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
        />
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入想查詢的法律問題、概念或情境..."
          rows={3}
          className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-base text-gray-900 dark:text-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_-8px_rgba(0,0,0,0.5)] focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-indigo-500/25 resize-none transition-all duration-200"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
      </div>
    ) : (
      <form onSubmit={handleSubmit} className="relative group">
        <Search
          size={compact ? 18 : 22}
          className={`absolute ${
            compact ? 'left-4' : 'left-5'
          } top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            urlMode === 'semantic'
              ? '輸入想查詢的法律問題...'
              : '輸入關鍵字、法條號（民法70）或字號（112台上83）...'
          }
          className={`w-full ${
            compact ? 'h-12 pl-12 pr-12 text-sm' : 'h-14 pl-14 pr-14 text-base'
          } rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_-8px_rgba(0,0,0,0.5)] focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-indigo-500/25 transition-all duration-200`}
        />
        <div
          className={`absolute ${
            compact ? 'right-3' : 'right-4'
          } top-1/2 -translate-y-1/2`}
        >
          <SearchTipsPopover />
        </div>
      </form>
    );

  const filterRow = (
    <div className="flex items-center flex-wrap gap-2">
      <DocTypePopover value={docTypes} onChange={handleDocTypesChange} />
      <DateRangePopover
        value={dateRange}
        onChange={handleDateRangeChange}
        min={YEAR_MIN}
        max={YEAR_MAX}
      />
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
        aria-label="搜尋歷史"
        title="搜尋歷史"
      >
        <Clock size={14} />
        <span>歷史紀錄</span>
      </button>
    </div>
  );

  const isIdle = !urlQuery;

  return (
    <div className="min-h-[calc(100svh-64px)] bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-16 md:pt-16">
        {isIdle ? (
          <>
            {/* Hero */}
            <div className="text-center mb-10 md:mb-14 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                搜尋，
                <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                  可以很簡單
                </span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-gray-500 dark:text-gray-400">
                關鍵字、法條號、字號，一個搜尋框就夠了
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex justify-center mb-5">{modeTabs(false)}</div>

            {/* Search input */}
            <div className="mb-4">{searchInput(false)}</div>

            {/* Filter row + sort */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {filterRow}
              <SortToggle value={urlSort} onChange={handleSortChange} />
            </div>

            {/* Common laws */}
            <CommonLawsSection onLawClick={handleCommonLawClick} />
          </>
        ) : (
          <>
            {/* Compact sticky bar */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-3 backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-900">
              <div className="flex items-center gap-3 mb-3">
                {modeTabs(true)}
                <div className="flex-1">{searchInput(true)}</div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                {filterRow}
                <SortToggle value={urlSort} onChange={handleSortChange} />
              </div>
            </div>

            {/* Semantic loading hint */}
            {urlMode === 'semantic' && isLoading && semanticFirstLoad && (
              <div className="mt-5 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
                語意搜尋模型載入中，首次查詢約需 20 秒...
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-4 mt-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="text-center py-16">
                <p className="text-red-500 dark:text-red-400 mb-2">搜尋時發生錯誤</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  請稍後再試，或嘗試不同的搜尋詞
                </p>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <div className="mt-5">
                {results.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                      共 {total.toLocaleString()} 筆結果
                      {urlMode === 'keyword' && totalPages > 1 && (
                        <span>
                          ，第 {urlPage} / {totalPages} 頁
                        </span>
                      )}
                    </p>
                    <div className="space-y-3">
                      {results.map((r) => (
                        <ResultCard
                          key={
                            urlMode === 'semantic'
                              ? `${r.jid}-${(r as SemanticResult).chunk_index}`
                              : r.jid
                          }
                          ruling={r}
                          isSemantic={urlMode === 'semantic'}
                          isFav={isFavorite(r.jid)}
                          onToggleFavorite={() => toggleFavorite(r)}
                          highlightQuery={urlQuery}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
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
              </div>
            )}
          </>
        )}
      </div>

      <SearchHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />
    </div>
  );
}
