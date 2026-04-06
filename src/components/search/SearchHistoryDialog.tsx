import { useEffect, useMemo } from 'react';
import { Clock, Trash2, X } from 'lucide-react';
import {
  useSearchHistoryStore,
  clearHistory,
  removeHistoryEntry,
} from '../../stores/search';
import type { SearchHistoryEntry, SearchMode } from '../../types';

const DIALOG_SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in overflow-hidden';

interface SearchHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: SearchHistoryEntry) => void;
}

interface GroupedHistory {
  today: SearchHistoryEntry[];
  yesterday: SearchHistoryEntry[];
  thisWeek: SearchHistoryEntry[];
  older: SearchHistoryEntry[];
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupByDate(entries: SearchHistoryEntry[]): GroupedHistory {
  const now = new Date();
  const todayStart = startOfLocalDay(now).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups: GroupedHistory = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  for (const entry of entries) {
    const t = new Date(entry.createdAt).getTime();
    if (Number.isNaN(t)) {
      groups.older.push(entry);
      continue;
    }
    if (t >= todayStart) {
      groups.today.push(entry);
    } else if (t >= yesterdayStart) {
      groups.yesterday.push(entry);
    } else if (t >= weekStart) {
      groups.thisWeek.push(entry);
    } else {
      groups.older.push(entry);
    }
  }

  return groups;
}

function ModeChip({ mode }: { mode: SearchMode }) {
  const isSemantic = mode === 'semantic';
  const label = isSemantic ? '語意' : '關鍵字';
  const className = isSemantic
    ? 'text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0'
    : 'text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 shrink-0';
  return <span className={className}>{label}</span>;
}

function HistoryRow({
  entry,
  onSelect,
  onRemove,
}: {
  entry: SearchHistoryEntry;
  onSelect: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onSelect(entry)}
        className="w-full flex items-center gap-3 px-5 h-11 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
      >
        <Clock
          size={14}
          className="text-gray-300 dark:text-gray-600 shrink-0"
        />
        <span className="flex-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
          {entry.query}
        </span>
        <ModeChip mode={entry.mode} />
      </button>
      <button
        type="button"
        aria-label="移除此紀錄"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry.id);
        }}
        className="absolute right-12 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 items-center justify-center opacity-0 group-hover:opacity-100 transition hidden group-hover:flex"
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
}

export function SearchHistoryDialog({
  open,
  onClose,
  onSelect,
}: SearchHistoryDialogProps) {
  const history = useSearchHistoryStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const groups = useMemo(() => groupByDate(history), [history]);

  if (!open) return null;

  const handleSelect = (entry: SearchHistoryEntry) => {
    onSelect(entry);
    onClose();
  };

  const sections: Array<{ key: keyof GroupedHistory; label: string }> = [
    { key: 'today', label: '今天' },
    { key: 'yesterday', label: '昨天' },
    { key: 'thisWeek', label: '本週' },
    { key: 'older', label: '更早' },
  ];

  const isEmpty = history.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="搜尋歷史"
          className={`w-full max-w-lg ${DIALOG_SURFACE} pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              搜尋歷史
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 text-[9px] text-gray-400 dark:text-gray-500"
              >
                i
              </span>
              點擊任一記錄即可使用目前篩選條件進行搜尋
            </p>
            <button
              type="button"
              onClick={clearHistory}
              disabled={isEmpty}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={11} /> 清除
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isEmpty && (
              <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                尚無搜尋紀錄
              </div>
            )}
            {!isEmpty &&
              sections.map(({ key, label }) => {
                const items = groups[key];
                if (items.length === 0) return null;
                return (
                  <section key={key}>
                    <h4 className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                      {label}
                    </h4>
                    <ul>
                      {items.map((entry) => (
                        <HistoryRow
                          key={entry.id}
                          entry={entry}
                          onSelect={handleSelect}
                          onRemove={removeHistoryEntry}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}

export default SearchHistoryDialog;
