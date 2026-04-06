import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_LAWS } from '../../data/commonLaws';
import { setCustomLaws, useCustomLaws } from '../../stores/search';

interface CustomizeLawsModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_SELECTED = 20;

const DIALOG_SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in overflow-hidden';

export default function CustomizeLawsModal({ open, onClose }: CustomizeLawsModalProps) {
  const currentIds = useCustomLaws();
  const [draft, setDraft] = useState<string[]>(currentIds);
  const [query, setQuery] = useState('');

  // Re-initialize draft whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft(currentIds);
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredLaws = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_LAWS;
    return ALL_LAWS.filter((l) => l.name.toLowerCase().includes(q));
  }, [query]);

  if (!open) return null;

  const isSelected = (id: string) => draft.includes(id);
  const atLimit = draft.length >= MAX_SELECTED;

  const toggle = (id: string) => {
    setDraft((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    setCustomLaws(draft);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
        <div
          className={`w-full max-w-2xl ${DIALOG_SURFACE} pointer-events-auto`}
          role="dialog"
          aria-modal="true"
          aria-label="編輯常用法律"
        >
          <header className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                編輯常用法律
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({draft.length}/{MAX_SELECTED})
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              aria-label="關閉"
            >
              <X size={16} />
            </button>
          </header>

          <div className="px-5 py-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋法律名稱..."
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/15 transition-colors"
              />
            </div>
          </div>

          <div className="px-3 pb-2 max-h-[50vh] overflow-y-auto">
            {filteredLaws.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                找不到符合的法律
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredLaws.map((law) => {
                  const selected = isSelected(law.id);
                  const disabled = !selected && atLimit;
                  return (
                    <label
                      key={law.id}
                      className={`flex items-center gap-3 px-3 h-10 rounded-lg transition-colors ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => toggle(law.id)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500/40"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                        {law.name}
                      </span>
                      {law.category && (
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                          {law.category}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 px-5 h-14 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors"
            >
              儲存
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
