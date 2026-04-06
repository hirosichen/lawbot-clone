import { useEffect, useRef, useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import type { DocType } from '../../types';
import { FILTER_CHIP_BASE, FILTER_CHIP_ACTIVE, POPOVER_SURFACE } from './_shared';

interface DocTypePopoverProps {
  value: DocType[];
  onChange: (v: DocType[]) => void;
}

const OPTIONS: Array<{ key: DocType; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'law', label: '法律' },
  { key: 'judgment', label: '裁判' },
  { key: 'constitutional', label: '憲法法庭' },
  { key: 'interpretation', label: '司法解釋' },
  { key: 'resolution', label: '決議' },
  { key: 'legalQA', label: '法律問題' },
  { key: 'letter', label: '函釋' },
];

export default function DocTypePopover({ value, onChange }: DocTypePopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const isAll = value.length === 0 || (value.length === 1 && value[0] === 'all');
  const nonAllCount = value.filter((v) => v !== 'all').length;

  const toggle = (key: DocType) => {
    if (key === 'all') {
      onChange(['all']);
      return;
    }
    const withoutAll = value.filter((v) => v !== 'all');
    const next = withoutAll.includes(key)
      ? withoutAll.filter((v) => v !== key)
      : [...withoutAll, key];
    onChange(next.length === 0 ? ['all'] : next);
  };

  const isChecked = (key: DocType) => {
    if (key === 'all') return isAll;
    return value.includes(key);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${FILTER_CHIP_BASE} ${!isAll ? FILTER_CHIP_ACTIVE : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <FileText size={14} />
        <span>{!isAll && nonAllCount > 0 ? `文件類型 · ${nonAllCount}` : '文件類型'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-2 w-[280px] ${POPOVER_SURFACE} p-4 z-30`}>
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-3">
            文件類型
          </h4>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {OPTIONS.map((opt) => {
              const checked = isChecked(opt.key);
              return (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 px-2 h-9 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.key)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40"
                  />
                  <span
                    className={`text-sm ${
                      checked
                        ? 'text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
