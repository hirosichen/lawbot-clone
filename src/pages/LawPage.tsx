import { useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { LawWithArticles, LawArticle } from '../types';

/** A TOC node: either a chapter/section heading or an article */
interface TOCNode {
  type: 'heading';
  title: string;
  children: TOCArticleNode[];
}
interface TOCArticleNode {
  type: 'article';
  article_no: string;
  ordinal: number;
}

/** Build a tree from the flat articles array */
function buildTOC(articles: LawArticle[]): TOCNode[] {
  const nodes: TOCNode[] = [];
  let currentHeading: TOCNode | null = null;

  for (const a of articles) {
    if (a.article_type === 'C') {
      currentHeading = { type: 'heading', title: a.article_content.trim(), children: [] };
      nodes.push(currentHeading);
    } else if (a.article_type === 'A') {
      const articleNode: TOCArticleNode = { type: 'article', article_no: a.article_no, ordinal: a.ordinal };
      if (currentHeading) {
        currentHeading.children.push(articleNode);
      } else {
        // Articles before any heading: create a default group
        if (nodes.length === 0 || nodes[nodes.length - 1].type !== 'heading' || nodes[nodes.length - 1].title !== '') {
          currentHeading = { type: 'heading', title: '', children: [] };
          nodes.push(currentHeading);
        }
        currentHeading = nodes[nodes.length - 1];
        currentHeading.children.push(articleNode);
      }
    }
  }
  return nodes;
}

export default function LawPage() {
  const { lawId } = useParams<{ lawId: string }>();
  const pcode = lawId ?? '';

  const { data: law, isLoading, isError, error } = useQuery<LawWithArticles>({
    queryKey: ['law', pcode],
    queryFn: async () => {
      const res = await api.getLaw(pcode);
      return res.data;
    },
    enabled: !!pcode,
  });

  const toc = useMemo(() => (law ? buildTOC(law.articles) : []), [law]);
  const articles = useMemo(() => (law ? law.articles.filter((a) => a.article_type === 'A') : []), [law]);

  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(new Set());
  const [starredArticles, setStarredArticles] = useState<Set<string>>(new Set());
  const [copiedArticle, setCopiedArticle] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'ai' | 'related' | 'laws'>('laws');

  // Expand all TOC headings once data loads
  const expandedInit = useRef(false);
  if (toc.length > 0 && !expandedInit.current) {
    expandedInit.current = true;
    setExpandedHeadings(new Set(toc.map((n) => n.title)));
  }

  const contentRef = useRef<HTMLDivElement>(null);

  const toggleHeading = (title: string) => {
    setExpandedHeadings((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleStar = (articleNo: string) => {
    setStarredArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleNo)) next.delete(articleNo);
      else next.add(articleNo);
      return next;
    });
  };

  const handleCopy = useCallback((articleNo: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedArticle(articleNo);
      setTimeout(() => setCopiedArticle(null), 2000);
    });
  }, []);

  const scrollToArticle = (articleNo: string) => {
    const el = document.getElementById(`article-${articleNo}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Error state */
  if (isError || !law) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {isError ? '無法載入法規' : '找不到法規'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isError && error instanceof Error ? error.message : `法規代碼 "${pcode}" 不存在或無法存取。`}
        </p>
      </div>
    );
  }

  /* Group articles by their preceding heading for main content rendering */
  const contentGroups: { heading: string; articles: LawArticle[] }[] = [];
  let currentGroup: { heading: string; articles: LawArticle[] } | null = null;
  for (const a of law.articles) {
    if (a.article_type === 'C') {
      currentGroup = { heading: a.article_content.trim(), articles: [] };
      contentGroups.push(currentGroup);
    } else if (a.article_type === 'A') {
      if (!currentGroup) {
        currentGroup = { heading: '', articles: [] };
        contentGroups.push(currentGroup);
      }
      currentGroup.articles.push(a);
    }
  }

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{law.law_name}</h1>
              {law.is_abolished && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                  已廢止
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {law.law_category} | {law.law_level}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              <span>修正日期：{law.modified_date}</span>
            </div>
            {law.law_url && (
              <a
                href={law.law_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                原始連結
              </a>
            )}
          </div>
        </div>
        {law.effective_note && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">生效說明：</span>
              {law.effective_note}
            </p>
          </div>
        )}
        {law.law_foreword && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">前言：</span>
              {law.law_foreword}
            </p>
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="flex gap-6">
        {/* Left Sidebar - TOC */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                目錄（共 {articles.length} 條）
              </span>
            </div>
            <div className="p-2">
              {toc.map((node, idx) => (
                <div key={node.title || idx} className="mb-1">
                  {node.title && (
                    <button
                      onClick={() => toggleHeading(node.title)}
                      className="flex items-center gap-1 w-full px-2 py-1.5 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      {expandedHeadings.has(node.title) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="truncate text-left">{node.title}</span>
                    </button>
                  )}
                  {(expandedHeadings.has(node.title) || !node.title) && (
                    <div className={node.title ? 'ml-4' : ''}>
                      {node.children.map((child) => (
                        <button
                          key={child.article_no}
                          onClick={() => scrollToArticle(child.article_no)}
                          className="w-full text-left px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors truncate"
                        >
                          第 {child.article_no} 條
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {contentGroups.map((group, gi) => (
            <div key={group.heading || gi} className="mb-8">
              {group.heading && (
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                  {group.heading}
                </h2>
              )}
              <div className="space-y-3">
                {group.articles.map((article) => {
                  const fullText = `第 ${article.article_no} 條\n${article.article_content}`;
                  return (
                    <div
                      key={article.article_no}
                      id={`article-${article.article_no}`}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 scroll-mt-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          第 {article.article_no} 條
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleStar(article.article_no)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              starredArticles.has(article.article_no)
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            title="收藏"
                          >
                            <Star
                              size={16}
                              fill={starredArticles.has(article.article_no) ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            onClick={() => handleCopy(article.article_no, fullText)}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                            title={copiedArticle === article.article_no ? '已複製' : '複製'}
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
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {article.article_content}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                { key: 'laws' as const, label: '法規資訊', icon: LinkIcon },
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
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">法規類別</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{law.law_category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">法規位階</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{law.law_level}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">生效日期</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{law.effective_date}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">最後修正</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{law.modified_date}</p>
                  </div>
                  {law.has_eng_version && law.eng_law_name && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">英文名稱</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{law.eng_law_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">條文數</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{articles.length} 條</p>
                  </div>
                  {law.law_url && (
                    <a
                      href={law.law_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <BookOpen size={14} className="shrink-0" />
                      <span>全國法規資料庫</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
