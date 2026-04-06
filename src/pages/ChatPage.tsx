import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Share2,
  Plus,
  FileText,
  X,
  ChevronRight,
  Zap,
  Loader2,
  MessageSquarePlus,
  SlidersHorizontal,
  Upload,
  Brain,
  Compass,
  Bot,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { useConversations, useStreamingState } from '../stores/chat';
import type { ChatMessage, ChatReference, ChatSettings, ChatOptions } from '../stores/chat';
import { useProjects } from '../stores/projects';

// --------------- Helpers ---------------

function truncateRef(label: string, max = 20): string {
  return label.length > max ? label.slice(0, max) + '...' : label;
}

// --------------- Sub-components ---------------

function ReferenceChips({ references }: { references: ChatReference[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 3;
  const visible = expanded ? references : references.slice(0, VISIBLE);
  const remaining = references.length - VISIBLE;

  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">
        法學資料
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((ref, i) =>
          ref.link ? (
            <Link
              key={i}
              to={ref.link}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200"
            >
              <FileText size={11} className="shrink-0" />
              {truncateRef(ref.label, 30)}
            </Link>
          ) : (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all duration-200"
            >
              <FileText size={11} className="shrink-0" />
              {truncateRef(ref.label, 30)}
            </span>
          ),
        )}
        {!expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          >
            查看更多 ({remaining})
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// Inject citation badges into text nodes
function injectCitations(text: string): ReactNode[] {
  const parts = text.split(/(\[(?:法|判)\d+\]|\[\d+\])/g);
  return parts.map((part, j) => {
    const match = part.match(/^\[(?:法|判)?(\d+)\]$/);
    if (match) {
      return (
        <span
          key={j}
          className="inline-flex items-center justify-center min-w-[1.25rem] h-5 mx-0.5 px-1 text-[10px] font-bold rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 align-middle"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_hr]:my-3 [&_hr]:border-gray-200 [&_hr]:dark:border-gray-700 [&_blockquote]:border-l-3 [&_blockquote]:border-indigo-300 [&_blockquote]:dark:border-indigo-700 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-400 [&_blockquote]:italic [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
      <Markdown
        components={{
          // Inject citation badges into all text
          p: ({ children }) => (
            <p className="my-1.5">
              {typeof children === 'string'
                ? injectCitations(children)
                : Array.isArray(children)
                  ? children.map((child, i) =>
                      typeof child === 'string' ? <span key={i}>{injectCitations(child)}</span> : child
                    )
                  : children}
            </p>
          ),
          li: ({ children }) => (
            <li>
              {typeof children === 'string'
                ? injectCitations(children)
                : Array.isArray(children)
                  ? children.map((child, i) =>
                      typeof child === 'string' ? <span key={i}>{injectCitations(child)}</span> : child
                    )
                  : children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">{children}</h3>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-5 mb-2">{children}</h2>
          ),
          hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-indigo-300 dark:border-indigo-700 pl-3 my-2 text-gray-600 dark:text-gray-400 italic text-sm">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

function ActionButtons({ onCopy, content }: { onCopy: () => void; content: string }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        title="複製"
      >
        <Copy size={13} />
        {copied ? '已複製' : '複製'}
      </button>
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          liked === 'up'
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        title="有用"
      >
        <ThumbsUp size={13} />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          liked === 'down'
            ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        title="沒有幫助"
      >
        <ThumbsDown size={13} />
      </button>
      <button
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        title="重新生成"
      >
        <RefreshCw size={13} />
      </button>
      <button
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        title="分享"
      >
        <Share2 size={13} />
      </button>
    </div>
  );
}

function FollowUpQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (q: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">相關延伸問題</p>
      <div className="flex flex-col gap-1.5">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left px-3 py-2 rounded-lg text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] md:max-w-[70%]">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-5 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  onFollowUp,
}: {
  message: ChatMessage;
  onFollowUp: (q: string) => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] md:max-w-[80%]">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
          {message.references && message.references.length > 0 && (
            <ReferenceChips references={message.references} />
          )}
          <MessageContent content={message.content} />
          <ActionButtons onCopy={() => {}} content={message.content} />
          {message.followUpQuestions && message.followUpQuestions.length > 0 && (
            <FollowUpQuestions questions={message.followUpQuestions} onSelect={onFollowUp} />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={16} className="animate-spin text-indigo-500" />
          <span>正在搜尋法學資料並分析中...</span>
        </div>
      </div>
    </div>
  );
}

function StreamingBubble({ onFollowUp }: { onFollowUp: (q: string) => void }) {
  const streaming = useStreamingState();

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] md:max-w-[80%]">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
          {streaming.references.length > 0 && (
            <ReferenceChips references={streaming.references} />
          )}
          {streaming.content ? (
            <MessageContent content={streaming.content} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span>AI 正在生成回覆...</span>
            </div>
          )}
          {streaming.content && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              <span>生成中...</span>
            </div>
          )}
          {streaming.followUpQuestions.length > 0 && (
            <FollowUpQuestions questions={streaming.followUpQuestions} onSelect={onFollowUp} />
          )}
        </div>
      </div>
    </div>
  );
}

// Suggestion card icons/emojis
const SUGGESTION_META = [
  { emoji: '\u{1F697}', gradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', border: 'border-orange-200 dark:border-orange-800' },
  { emoji: '\u{1F3E0}', gradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20', border: 'border-blue-200 dark:border-blue-800' },
  { emoji: '\u{1F4BC}', gradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', border: 'border-purple-200 dark:border-purple-800' },
  { emoji: '\u{1F4F1}', gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', border: 'border-green-200 dark:border-green-800' },
];

// --------------- Settings Panel ---------------

const DOC_TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'law', label: '法律' },
  { value: 'ruling', label: '裁判' },
  { value: 'constitutional', label: '憲法法庭' },
  { value: 'interpretation', label: '司法解釋' },
  { value: 'resolution', label: '決議' },
  { value: 'legalQuestion', label: '法律問題' },
  { value: 'letter', label: '函釋' },
];

function SettingsPanel({
  settings,
  onSettingsChange,
  onClose,
}: {
  settings: ChatSettings;
  onSettingsChange: (s: ChatSettings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<ChatSettings>({ ...settings });

  const handleDocTypeToggle = (value: string) => {
    if (value === 'all') {
      setLocal((s) => ({
        ...s,
        docTypes: s.docTypes.includes('all') ? [] : ['all'],
      }));
    } else {
      setLocal((s) => {
        const without = s.docTypes.filter((d) => d !== 'all' && d !== value);
        const has = s.docTypes.includes(value);
        const next = has ? without : [...without, value];
        return { ...s, docTypes: next.length === 0 ? ['all'] : next };
      });
    }
  };

  const handleReset = () => {
    const defaults: ChatSettings = {
      docTypes: ['all'],
      dateFrom: 1945,
      dateTo: 2026,
      format: 'format1',
    };
    setLocal(defaults);
    onSettingsChange(defaults);
  };

  const handleClose = () => {
    onSettingsChange(local);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={handleClose}
      />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 animate-slide-in-right overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI 自定義</h3>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Doc types */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">文件類型</p>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      opt.value === 'all'
                        ? local.docTypes.includes('all')
                        : local.docTypes.includes(opt.value)
                    }
                    onChange={() => handleDocTypeToggle(opt.value)}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">日期範圍</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">從</label>
                <input
                  type="number"
                  value={local.dateFrom}
                  onChange={(e) => setLocal((s) => ({ ...s, dateFrom: Number(e.target.value) }))}
                  min={1945}
                  max={local.dateTo}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
                />
              </div>
              <span className="text-gray-400 mt-5">~</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">到</label>
                <input
                  type="number"
                  value={local.dateTo}
                  onChange={(e) => setLocal((s) => ({ ...s, dateTo: Number(e.target.value) }))}
                  min={local.dateFrom}
                  max={2026}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Format */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">書狀格式</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="format"
                  checked={local.format === 'format1'}
                  onChange={() => setLocal((s) => ({ ...s, format: 'format1' }))}
                  className="mt-0.5 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">格式一 (預設)</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    壹、大標題 → 一、中標題 → (一)小標題 → 1.細項
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="format"
                  checked={local.format === 'format2'}
                  onChange={() => setLocal((s) => ({ ...s, format: 'format2' }))}
                  className="mt-0.5 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">格式二</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    大標題無編號 → 一、中標題 → (一)小標題 → 1.細項
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            >
              重設條件
            </button>
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all duration-200 shadow-sm"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// --------------- Plus Menu Dropdown ---------------

function PlusMenuDropdown({
  features,
  agentEnabled,
  onToggleFeature,
  onToggleAgent,
  onClose,
}: {
  features: { thinkLonger: boolean; deepExplore: boolean; webSearch: boolean };
  agentEnabled: boolean;
  onToggleFeature: (key: 'thinkLonger' | 'deepExplore' | 'webSearch') => void;
  onToggleAgent: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const items = [
    {
      icon: <Upload size={15} />,
      label: '上傳附件',
      active: false,
      action: () => {
        alert('即將推出');
        onClose();
      },
    },
    {
      icon: <Brain size={15} />,
      label: '思考更長時間',
      active: features.thinkLonger,
      action: () => onToggleFeature('thinkLonger'),
    },
    {
      icon: <Compass size={15} />,
      label: '深度探索',
      active: features.deepExplore,
      action: () => onToggleFeature('deepExplore'),
    },
    {
      icon: <Bot size={15} />,
      label: 'AI 代理',
      active: agentEnabled,
      action: onToggleAgent,
    },
    {
      icon: <Globe size={15} />,
      label: '網路搜尋',
      active: features.webSearch,
      action: () => onToggleFeature('webSearch'),
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 py-1 animate-fade-in"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
            item.active
              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {item.active && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      ))}
    </div>
  );
}

// --------------- Project Dropdown ---------------

function ProjectDropdown({
  selectedProjectId,
  onSelect,
  onClose,
}: {
  selectedProjectId: string | null;
  onSelect: (project: { id: string; title: string; facts: string; notes: string } | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { projects } = useProjects();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 py-1 animate-fade-in max-h-64 overflow-y-auto"
    >
      {selectedProjectId && (
        <button
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <X size={15} />
          取消選取
        </button>
      )}
      {projects.length === 0 && (
        <p className="px-3.5 py-2 text-xs text-gray-400 dark:text-gray-500">尚無專案</p>
      )}
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            onSelect({ id: p.id, title: p.title, facts: p.facts, notes: p.notes });
            onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
            selectedProjectId === p.id
              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FolderOpen size={15} className="shrink-0" />
          <span className="truncate text-left">{p.title}</span>
        </button>
      ))}
      <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
        <button
          onClick={() => {
            onClose();
            navigate('/project');
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          <Plus size={15} />
          新增專案
        </button>
      </div>
    </div>
  );
}

// --------------- Pill Badge ---------------

function PillBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// --------------- Main Page ---------------

const DEFAULT_SETTINGS: ChatSettings = {
  docTypes: ['all'],
  dateFrom: 1945,
  dateTo: 2026,
  format: 'format1',
};

export default function ChatPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const {
    getConversation,
    createConversation,
    addUserMessage,
    sendMessage,
  } = useConversations();
  const streaming = useStreamingState();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // New state for toolbar features
  const [showSettings, setShowSettings] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>({ ...DEFAULT_SETTINGS });
  const [features, setFeatures] = useState({
    thinkLonger: false,
    deepExplore: false,
    webSearch: false,
  });
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    title: string;
    facts: string;
    notes: string;
  } | null>(null);

  const conversation = id ? getConversation(id) : null;
  const messages = conversation?.messages ?? [];
  const isNewChat = !id;
  const isStreaming = streaming.conversationId === id;

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading, streaming.content]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const buildChatOptions = useCallback((): ChatOptions => {
    const opts: ChatOptions = {};
    // Only include settings if not default
    const s = chatSettings;
    if (
      JSON.stringify(s.docTypes) !== '["all"]' ||
      s.dateFrom !== 1945 ||
      s.dateTo !== 2026 ||
      s.format !== 'format1'
    ) {
      opts.settings = s;
    }
    if (features.webSearch) opts.webSearch = true;
    if (features.thinkLonger) opts.thinkLonger = true;
    if (features.deepExplore) opts.deepExplore = true;
    if (selectedProject) {
      const parts: string[] = [];
      if (selectedProject.facts) parts.push(`案件事實: ${selectedProject.facts}`);
      if (selectedProject.notes) parts.push(`筆記: ${selectedProject.notes}`);
      opts.projectContext = parts.join('\n\n');
    }
    return opts;
  }, [chatSettings, features, selectedProject]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput('');
      setIsLoading(true);

      const options = buildChatOptions();

      try {
        if (isNewChat) {
          const title = content.length > 40 ? content.slice(0, 40) + '...' : content;
          const conv = createConversation(title, content);
          navigate(`/chat/${conv.id}`, { replace: true });
          await sendMessage(conv.id, content, options);
        } else if (id) {
          addUserMessage(id, content);
          await sendMessage(id, content, options);
        }
      } catch (err) {
        console.error('Chat error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, isNewChat, id, createConversation, addUserMessage, sendMessage, navigate, buildChatOptions],
  );

  const handleNewChat = () => {
    navigate('/chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleFeature = (key: 'thinkLonger' | 'deepExplore' | 'webSearch') => {
    setFeatures((f) => ({ ...f, [key]: !f[key] }));
  };

  // Active feature pills data
  const activePills: { key: string; label: string; onRemove: () => void }[] = [];
  if (features.thinkLonger) {
    activePills.push({ key: 'think', label: '思考更長', onRemove: () => toggleFeature('thinkLonger') });
  }
  if (features.deepExplore) {
    activePills.push({ key: 'explore', label: '深度探索', onRemove: () => toggleFeature('deepExplore') });
  }
  if (features.webSearch) {
    activePills.push({ key: 'web', label: '網路搜尋', onRemove: () => toggleFeature('webSearch') });
  }
  if (selectedProject) {
    activePills.push({
      key: 'project',
      label: selectedProject.title,
      onRemove: () => setSelectedProject(null),
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header toolbar for existing conversations */}
      {!isNewChat && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {conversation?.title ?? '對話'}
          </h2>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 cursor-pointer"
          >
            <MessageSquarePlus size={14} />
            新對話
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isNewChat && messages.length === 0 ? (
          /* New chat welcome */
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full min-h-[60vh]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-sm font-medium mb-5 border border-indigo-100 dark:border-indigo-800/50">
                <Zap size={14} />
                AI 法律助手
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3">
                加速您的法律工作流程 <span role="img" aria-label="lightning">&#9889;</span>
              </h1>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                輸入法律問題，AI 將為您分析相關法條與判決
              </p>
            </div>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {[
                '車禍肇事的損害賠償責任如何認定？',
                '房東提前終止租約需要哪些條件？',
                '遭公司違法解僱應如何救濟？',
                '網路上被人誹謗可以提告嗎？',
              ].map((q, idx) => {
                const meta = SUGGESTION_META[idx];
                return (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className={`text-left p-4 rounded-xl border bg-gradient-to-br ${meta.gradient} ${meta.border} text-sm text-gray-600 dark:text-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}
                  >
                    <span className="text-xl mb-2 block">{meta.emoji}</span>
                    <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{q}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <UserBubble key={msg.id} message={msg} />
              ) : (
                <AssistantBubble
                  key={msg.id}
                  message={msg}
                  onFollowUp={(q) => handleSend(q)}
                />
              ),
            )}
            {isLoading && !isStreaming && <LoadingBubble />}
            {isStreaming && <StreamingBubble onFollowUp={(q) => handleSend(q)} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - sticky bottom */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-400/20 dark:focus-within:ring-indigo-600/20 shadow-sm hover:shadow-md transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isNewChat
                  ? '輸入問題、生成書狀，使用AI代理處理所有問題...'
                  : '追問更多內容...'
              }
              rows={1}
              className="w-full px-5 pt-4 pb-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none"
            />

            {/* Active feature pills */}
            {activePills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1">
                {activePills.map((p) => (
                  <PillBadge key={p.key} label={p.label} onRemove={p.onRemove} />
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-0.5">
                {/* Settings button */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-all duration-200"
                  title="設定"
                >
                  <SlidersHorizontal size={16} />
                </button>

                {/* Plus button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowPlusMenu((v) => !v);
                      setShowProjectMenu(false);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-all duration-200"
                    title="附加"
                  >
                    <Plus size={16} />
                  </button>
                  {showPlusMenu && (
                    <PlusMenuDropdown
                      features={features}
                      agentEnabled={agentEnabled}
                      onToggleFeature={toggleFeature}
                      onToggleAgent={() => setAgentEnabled((v) => !v)}
                      onClose={() => setShowPlusMenu(false)}
                    />
                  )}
                </div>

                {/* Project selector */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProjectMenu((v) => !v);
                      setShowPlusMenu(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    <FolderOpen size={13} />
                    選取案件
                  </button>
                  {showProjectMenu && (
                    <ProjectDropdown
                      selectedProjectId={selectedProject?.id ?? null}
                      onSelect={(p) => setSelectedProject(p)}
                      onClose={() => setShowProjectMenu(false)}
                    />
                  )}
                </div>

                {/* Agent toggle pill */}
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => setAgentEnabled(!agentEnabled)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      agentEnabled
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    代理
                  </button>
                  {agentEnabled && (
                    <button
                      onClick={() => setAgentEnabled(false)}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                title="送出"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            AI 回答僅供參考，不構成法律意見。重要法律事務請諮詢專業律師。
          </p>
        </div>
      </div>

      {/* Settings panel overlay */}
      {showSettings && (
        <SettingsPanel
          settings={chatSettings}
          onSettingsChange={setChatSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
