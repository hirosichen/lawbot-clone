import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { POPOVER_SURFACE } from './_shared';

const TIPS: Array<{ label: string; example: string }> = [
  { label: '法條搜尋', example: '民法70、憲法23' },
  { label: '簡寫支援', example: '民訴法、刑訴法、憲訴法、行訴法' },
  { label: '字號搜尋', example: '112台上83 或 112年度台上字第83號' },
  { label: '多詞搜尋', example: '使用空格分隔多個搜尋詞' },
];

export default function SearchTipsPopover() {
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

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
        aria-label="搜尋小技巧"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Info size={16} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-[340px] ${POPOVER_SURFACE} p-5 z-30`}>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            搜尋小技巧
          </h4>
          <ul className="space-y-2.5 text-xs">
            {TIPS.map((tip) => (
              <li key={tip.label} className="flex gap-2">
                <strong className="text-primary-600 dark:text-primary-400 font-semibold shrink-0">
                  {tip.label}：
                </strong>
                <span className="text-gray-500 dark:text-gray-400">{tip.example}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
