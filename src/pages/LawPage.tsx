import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Star,
  Copy,
  Info,
  BookOpen,
  MessageSquare,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import { mockLaws } from '../data/mock-laws';
import type { LawSection, LawChapter } from '../data/mock-laws';

export default function LawPage() {
  const { lawId } = useParams<{ lawId: string }>();
  const law = mockLaws[lawId ?? ''] ?? mockLaws['civil-code'];

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(law.sections.map((s) => s.title)),
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(law.sections.flatMap((s) => s.chapters.map((c) => c.title))),
  );
  const [starredArticles, setStarredArticles] = useState<Set<number>>(new Set());
  const [copiedArticle, setCopiedArticle] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<'ai' | 'related' | 'laws'>('laws');

  const contentRef = useRef<HTMLDivElement>(null);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleChapter = (title: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleStar = (num: number) => {
    setStarredArticles((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const handleCopy = useCallback((num: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedArticle(num);
      setTimeout(() => setCopiedArticle(null), 2000);
    });
  }, []);

  const scrollToArticle = (num: number) => {
    const el = document.getElementById(`article-${num}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const relatedLaws = [
    { name: '民法總則施行法', id: 'civil-code-general' },
    { name: '民法債編施行法', id: 'civil-code-obligation' },
    { name: '民法物權編施行法', id: 'civil-code-property' },
    { name: '民法親屬編施行法', id: 'civil-code-family' },
    { name: '民法繼承編施行法', id: 'civil-code-succession' },
  ];

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{law.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{law.category}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              <span>{law.lastModified}</span>
              <ChevronDown size={14} />
            </div>
            <button className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              詳情
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">生效說明：</span>
            {law.effectNote}
          </p>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex gap-6">
        {/* Left Sidebar - TOC */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">目錄</span>
            </div>
            <div className="p-2">
              {law.sections.map((section) => (
                <TOCSection
                  key={section.title}
                  section={section}
                  expanded={expandedSections.has(section.title)}
                  expandedChapters={expandedChapters}
                  onToggleSection={toggleSection}
                  onToggleChapter={toggleChapter}
                  onClickArticle={scrollToArticle}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {law.sections.map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                {section.title}
              </h2>
              {section.chapters.map((chapter) => (
                <div key={chapter.title} className="mb-6">
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                    {chapter.title}
                  </h3>
                  <div className="space-y-3">
                    {chapter.articles.map((article) => {
                      const fullText = `第 ${article.number} 條（${article.title}）\n${article.content.join('\n')}`;
                      return (
                        <div
                          key={article.number}
                          id={`article-${article.number}`}
                          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 scroll-mt-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                第 {article.number} 條
                              </span>
                              {article.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => toggleStar(article.number)}
                                className={`p-1.5 rounded transition-colors cursor-pointer ${
                                  starredArticles.has(article.number)
                                    ? 'text-yellow-500 hover:text-yellow-600'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                                title="收藏"
                              >
                                <Star
                                  size={16}
                                  fill={starredArticles.has(article.number) ? 'currentColor' : 'none'}
                                />
                              </button>
                              <button
                                onClick={() => handleCopy(article.number, fullText)}
                                className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                title={copiedArticle === article.number ? '已複製' : '複製'}
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                title="詳情"
                              >
                                <Info size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {article.content.map((para, i) => (
                              <p key={i}>
                                {article.content.length > 1 && (
                                  <span className="text-gray-400 mr-1">{i + 1}.</span>
                                )}
                                {para}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="hidden xl:block w-72 shrink-0">
          <div className="sticky top-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {([
                { key: 'ai' as const, label: 'AI助手', icon: MessageSquare },
                { key: 'related' as const, label: '相關資料', icon: FileText },
                { key: 'laws' as const, label: '相關法條', icon: LinkIcon },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setRightTab(key)}
                  className={`flex-1 px-2 py-3 text-xs font-medium transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                    rightTab === key
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {rightTab === 'ai' && (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AI 助手功能即將推出
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    可針對法條進行 AI 問答
                  </p>
                </div>
              )}

              {rightTab === 'related' && (
                <div className="text-center py-8">
                  <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    相關資料功能即將推出
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    顯示相關判決與學說
                  </p>
                </div>
              )}

              {rightTab === 'laws' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    相關法規
                  </p>
                  {relatedLaws.map((rl) => (
                    <a
                      key={rl.id}
                      href={`/law/${rl.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <BookOpen size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{rl.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- TOC Sub-components ---- */

function TOCSection({
  section,
  expanded,
  expandedChapters,
  onToggleSection,
  onToggleChapter,
  onClickArticle,
}: {
  section: LawSection;
  expanded: boolean;
  expandedChapters: Set<string>;
  onToggleSection: (title: string) => void;
  onToggleChapter: (title: string) => void;
  onClickArticle: (num: number) => void;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={() => onToggleSection(section.title)}
        className="flex items-center gap-1 w-full px-2 py-1.5 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="truncate">{section.title}</span>
      </button>
      {expanded && (
        <div className="ml-2">
          {section.chapters.map((chapter) => (
            <TOCChapter
              key={chapter.title}
              chapter={chapter}
              expanded={expandedChapters.has(chapter.title)}
              onToggle={onToggleChapter}
              onClickArticle={onClickArticle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TOCChapter({
  chapter,
  expanded,
  onToggle,
  onClickArticle,
}: {
  chapter: LawChapter;
  expanded: boolean;
  onToggle: (title: string) => void;
  onClickArticle: (num: number) => void;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={() => onToggle(chapter.title)}
        className="flex items-center gap-1 w-full px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="truncate">{chapter.title}</span>
      </button>
      {expanded && (
        <div className="ml-4">
          {chapter.articles.map((article) => (
            <button
              key={article.number}
              onClick={() => onClickArticle(article.number)}
              className="w-full text-left px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors truncate"
            >
              第 {article.number} 條
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
