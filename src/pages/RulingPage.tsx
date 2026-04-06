import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Link2,
  Download,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useFavorites } from '../stores/favorites';
import { getCourtName } from '../utils/court';
import { parseRulingText, type RulingSection } from '../utils/ruling-parser';
import type { Ruling, Citation } from '../types';

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`}
    />
  );
}

function RulingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-px w-full mt-6" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section navigation (sidebar on desktop, tabs on mobile)            */
/* ------------------------------------------------------------------ */
function SectionNav({
  sections,
  activeId,
  onJump,
}: {
  sections: RulingSection[];
  activeId: string;
  onJump: (id: string) => void;
}) {
  return (
    <>
      {/* Mobile: horizontal scrollable tabs */}
      <div className="lg:hidden flex gap-1 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-thin">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeId === s.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden lg:block sticky top-6 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          目錄
        </h3>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeId === s.id
                ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ChevronRight
              size={14}
              className={activeId === s.id ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600'}
            />
            {s.title}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Citations panel                                                    */
/* ------------------------------------------------------------------ */
function CitationsPanel({ jid, ruling }: { jid: string; ruling: Ruling }) {
  const [tab, setTab] = useState<'forward' | 'reverse'>('forward');

  const { data: forwardData, isLoading: forwardLoading } = useQuery({
    queryKey: ['citations', jid],
    queryFn: () => api.getCitations(jid).then((r) => r.data),
  });

  const { data: reverseData, isLoading: reverseLoading } = useQuery({
    queryKey: ['citations-reverse', ruling.jyear, ruling.jcase, ruling.jno],
    queryFn: () =>
      api
        .getReverseCitations({
          cited_year: ruling.jyear,
          cited_case: ruling.jcase,
          cited_no: ruling.jno,
        })
        .then((r) => r.data),
  });

  const forwardCitations: Citation[] = Array.isArray(forwardData?.citations)
    ? forwardData.citations
    : Array.isArray(forwardData?.results)
      ? forwardData.results
      : Array.isArray(forwardData) ? forwardData : [];
  const reverseCitations: Citation[] = Array.isArray(reverseData?.citations)
    ? reverseData.citations
    : Array.isArray(reverseData?.results)
      ? reverseData.results
      : Array.isArray(reverseData) ? reverseData : [];

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('forward')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'forward'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          引用判決 ({forwardLoading ? '...' : forwardCitations.length})
        </button>
        <button
          onClick={() => setTab('reverse')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'reverse'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          被引用 ({reverseLoading ? '...' : reverseCitations.length})
        </button>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {tab === 'forward' && (
          <>
            {forwardLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : forwardCitations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                此判決未引用其他判決
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {forwardCitations.map((c, i) => (
                  <li key={c.id ?? i}>
                    <Link
                      to={`/ruling/${encodeURIComponent(c.cited_full)}`}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {c.cited_full}
                      </span>
                      <ExternalLink size={14} className="text-gray-400 shrink-0 ml-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'reverse' && (
          <>
            {reverseLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : reverseCitations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                此判決尚未被其他判決引用
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {reverseCitations.map((c, i) => (
                  <li key={c.id ?? i}>
                    <Link
                      to={`/ruling/${encodeURIComponent(c.from_jid)}`}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {c.from_jid}
                      </span>
                      <ExternalLink size={14} className="text-gray-400 shrink-0 ml-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bookmark button with folder picker                                 */
/* ------------------------------------------------------------------ */
function BookmarkButton({ ruling }: { ruling: Ruling }) {
  const { isFavorite, addFavorite, removeFavorite, getFolders } = useFavorites();
  const [showFolders, setShowFolders] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const saved = isFavorite(ruling.jid);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowFolders(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = () => {
    if (saved) {
      removeFavorite(ruling.jid);
    } else {
      addFavorite({
        jid: ruling.jid,
        title: ruling.jtitle || ruling.jid,
        date: ruling.jdate,
        court: ruling.jcourt,
        folder: '預設',
      });
    }
  };

  const folders = getFolders().filter((f) => f !== '預設');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowFolders(!showFolders);
        }}
        title={saved ? '移除書籤' : '加入書籤（右鍵選擇資料夾）'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          saved
            ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <Star size={16} className={saved ? 'fill-current' : ''} />
        {saved ? '已收藏' : '收藏'}
      </button>

      {showFolders && folders.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => {
                addFavorite({
                  jid: ruling.jid,
                  title: ruling.jtitle || ruling.jid,
                  date: ruling.jdate,
                  court: ruling.jcourt,
                  folder: f,
                });
                setShowFolders(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function RulingPage() {
  const { jid: rawJid } = useParams<{ jid: string }>();
  const jid = rawJid ? decodeURIComponent(rawJid) : '';
  const navigate = useNavigate();

  const {
    data: rulingData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ruling', jid],
    queryFn: () => api.getRuling(jid).then((r) => r.data),
    enabled: !!jid,
  });

  const ruling: Ruling | undefined = rulingData?.ruling ?? rulingData;
  const sections = ruling ? parseRulingText(ruling.jfull || '') : [];
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Intersection observer for scroll spy
  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    for (const s of sections) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpTo = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const downloadTxt = () => {
    if (!ruling) return;
    const text = `${ruling.jtitle || ruling.jid}\n${getCourtName(ruling.jcourt)}\n${formatDate(ruling.jdate)}\n\n${ruling.jfull}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ruling.jid.replace(/,/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* --- Error states --- */
  if (!jid) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">無效的判決代號</p>
      </div>
    );
  }

  if (isError) {
    const is404 =
      (error as { response?: { status?: number } })?.response?.status === 404;
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {is404 ? '找不到判決' : '載入失敗'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {is404
            ? `判決 ${jid} 不存在或尚未收錄`
            : '無法連線到伺服器，請稍後再試'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft size={16} />
        返回搜尋結果
      </button>

      {isLoading || !ruling ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <RulingSkeleton />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {ruling.jtitle || ruling.jid}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{getCourtName(ruling.jcourt)}</span>
                <span>{formatDate(ruling.jdate)}</span>
                {ruling.jtype && <span>{ruling.jtype}</span>}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <BookmarkButton ruling={ruling} />
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Link2 size={16} />
                  複製連結
                </button>
                <button
                  onClick={downloadTxt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download size={16} />
                  下載全文
                </button>
              </div>
            </div>

            {/* Mobile section nav */}
            {sections.length > 1 && (
              <SectionNav
                sections={sections}
                activeId={activeSection || sections[0]?.id}
                onJump={jumpTo}
              />
            )}

            {/* Ruling full text */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              {sections.map((section) => (
                <div
                  key={section.id}
                  id={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                  className="mb-8 last:mb-0 scroll-mt-24"
                >
                  {section.title !== '全文' && (
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                      {section.title}
                    </h2>
                  )}
                  <div className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-[Georgia,'Noto Serif TC',serif]">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Citations panel */}
            <div className="mt-4">
              <CitationsPanel jid={jid} ruling={ruling} />
            </div>
          </div>

          {/* Desktop sidebar nav */}
          {sections.length > 1 && (
            <div className="hidden lg:block w-48 shrink-0">
              <SectionNav
                sections={sections}
                activeId={activeSection || sections[0]?.id}
                onJump={jumpTo}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // jdate format: "YYYYMMDD" or "YYYY-MM-DD"
  const clean = dateStr.replace(/-/g, '');
  if (clean.length === 8) {
    const y = parseInt(clean.slice(0, 4), 10);
    const rocYear = y - 1911;
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `民國 ${rocYear} 年 ${parseInt(m, 10)} 月 ${parseInt(d, 10)} 日`;
  }
  return dateStr;
}
