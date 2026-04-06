import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Share2,
  Settings,
  Plus,
  FileText,
  X,
  ChevronRight,
  Zap,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';
import { useConversations } from '../stores/chat';
import type { ChatMessage, ChatReference } from '../stores/chat';

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
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        法學資料
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((ref, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
          >
            <FileText size={11} className="shrink-0" />
            {truncateRef(ref.label, 30)}
          </span>
        ))}
        {!expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            查看更多 ({remaining})
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        // Replace citation markers [N] with styled badges
        const parts = line.split(/(\[\d+\])/g);
        const rendered = parts.map((part, j) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            return (
              <span
                key={j}
                className="inline-flex items-center justify-center w-4.5 h-4.5 mx-0.5 text-[10px] font-bold rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800 align-super"
              >
                {match[1]}
              </span>
            );
          }
          return part;
        });

        // Bold headings
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={i} className="font-bold text-gray-900 dark:text-white mt-4 mb-1.5">
              {rendered}
            </p>
          );
        }

        // Numbered items
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={i} className="ml-4 my-1 pl-1">
              {rendered}
            </p>
          );
        }

        // Lines starting with - (bullet)
        if (line.trim().startsWith('- ')) {
          return (
            <p key={i} className="ml-6 my-1 pl-1 relative before:content-[''] before:absolute before:left-[-8px] before:top-[10px] before:w-1 before:h-1 before:rounded-full before:bg-gray-400 dark:before:bg-gray-500">
              {rendered}
            </p>
          );
        }

        return (
          <p key={i} className="my-1">
            {rendered}
          </p>
        );
      })}
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
    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="複製"
      >
        <Copy size={13} />
        {copied ? '已複製' : '複製'}
      </button>
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className={`p-1.5 rounded transition-colors ${
          liked === 'up'
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="有用"
      >
        <ThumbsUp size={13} />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className={`p-1.5 rounded transition-colors ${
          liked === 'down'
            ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="沒有幫助"
      >
        <ThumbsDown size={13} />
      </button>
      <button
        className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="重新生成"
      >
        <RefreshCw size={13} />
      </button>
      <button
        className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">相關延伸問題</p>
      <div className="flex flex-col gap-1.5">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left px-3 py-2 rounded-lg text-sm text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
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
        <div className="bg-primary-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span>正在分析法律問題...</span>
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

// --------------- Main Page ---------------

export default function ChatPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const {
    getConversation,
    createConversation,
    addUserMessage,
    simulateResponse,
  } = useConversations();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversation = id ? getConversation(id) : null;
  const messages = conversation?.messages ?? [];
  const isNewChat = !id;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput('');
      setIsLoading(true);

      try {
        if (isNewChat) {
          const title = content.length > 40 ? content.slice(0, 40) + '...' : content;
          const conv = createConversation(title, content);
          navigate(`/chat/${conv.id}`, { replace: true });
          await simulateResponse(conv.id);
        } else if (id) {
          addUserMessage(id, content);
          await simulateResponse(id);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, isNewChat, id, createConversation, addUserMessage, simulateResponse, navigate],
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium mb-4">
                <Zap size={14} />
                AI 法律助手
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                加速您的法律工作流程
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
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
                    className={`text-left p-4 rounded-xl border bg-gradient-to-br ${meta.gradient} ${meta.border} text-sm text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-[1.02] transition-all duration-200 group`}
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
            {isLoading && <LoadingBubble />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - sticky bottom */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-primary-400 dark:focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-400 dark:focus-within:ring-primary-600 transition-all">
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
              className="w-full px-4 pt-3 pb-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none"
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="設定"
                >
                  <Settings size={16} />
                </button>
                <button
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="附加"
                >
                  <Plus size={16} />
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                  <FileText size={13} />
                  選取案件
                </button>
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => setAgentEnabled(!agentEnabled)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      agentEnabled
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    代理
                  </button>
                  {agentEnabled && (
                    <button
                      onClick={() => setAgentEnabled(false)}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
