import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Trash2,
  Clock,
  MessageSquare,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { useConversations } from '../stores/chat';
import type { Conversation } from '../stores/chat';

// --------------- Helpers ---------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `大約 ${minutes} 分鐘前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `大約 ${hours} 小時前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `大約 ${days} 天前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `大約 ${months} 個月前`;

  return `大約 ${Math.floor(months / 12)} 年前`;
}

function getPreviewText(conv: Conversation): string {
  const aiMsg = conv.messages.find((m) => m.role === 'assistant');
  if (!aiMsg) return '尚無 AI 回覆';
  const text = aiMsg.content.replace(/\*\*/g, '').replace(/\[\d+\]/g, '');
  return text.length > 100 ? text.slice(0, 100) + '...' : text;
}

// --------------- Components ---------------

function ConversationCard({
  conv,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  conv: Conversation;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (isSelectMode) {
      onToggleSelect();
      return;
    }
    navigate(`/chat/${conv.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative cursor-pointer rounded-xl border bg-white dark:bg-gray-900 p-4 hover:shadow-md transition-all ${
        isSelected
          ? 'border-primary-400 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/10'
          : 'border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox in select mode */}
        {isSelectMode && (
          <div className="shrink-0 pt-0.5">
            {isSelected ? (
              <CheckSquare size={18} className="text-primary-600 dark:text-primary-400" />
            ) : (
              <Square size={18} className="text-gray-400" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {conv.title}
            </h3>
            {!isSelectMode && (
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 size={13} />
                      刪除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {getPreviewText(conv)}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(conv.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={11} />
              {conv.messages.length} 則訊息
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------- Main Page ---------------

export default function HistoryPage() {
  const { conversations, deleteConversation, deleteConversations } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    deleteConversations(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleExitSelect = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">我的紀錄</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          查看、管理您的所有法律AI對話與研究
        </p>
      </div>

      {/* Search + Select */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋紀錄內容..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
        <button
          onClick={() => (isSelectMode ? handleExitSelect() : setIsSelectMode(true))}
          className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isSelectMode
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {isSelectMode ? '取消' : '選取'}
        </button>
      </div>

      {/* Select mode toolbar */}
      {isSelectMode && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {selectedIds.size === filtered.length ? '取消全選' : '全選'}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已選取 {selectedIds.size} 項
            </span>
          </div>
        </div>
      )}

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {conversations.length === 0
              ? '還沒有對話紀錄，開始您的第一個 AI 問答吧！'
              : '沒有符合搜尋條件的紀錄'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((conv) => (
            <ConversationCard
              key={conv.id}
              conv={conv}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(conv.id)}
              onToggleSelect={() => toggleSelect(conv.id)}
              onDelete={() => deleteConversation(conv.id)}
            />
          ))}
        </div>
      )}

      {/* Bulk delete bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              已選取 <strong>{selectedIds.size}</strong> 個對話
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExitSelect}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={14} className="inline mr-1" />
                取消
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                刪除 ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
