import { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { FILTER_CHIP_BASE, FILTER_CHIP_ACTIVE, POPOVER_SURFACE } from './_shared';

interface DateRangePopoverProps {
  value: [number, number];
  onChange: (v: [number, number]) => void;
  min?: number;
  max?: number;
}

export default function DateRangePopover({
  value,
  onChange,
  min = 1945,
  max = new Date().getFullYear(),
}: DateRangePopoverProps) {
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

  const [fromYear, toYear] = value;
  const isDefault = fromYear === min && toYear === max;

  const leftPct = ((fromYear - min) / (max - min)) * 100;
  const rightPct = 100 - ((toYear - min) / (max - min)) * 100;

  const setFrom = (n: number) => {
    const clamped = Math.min(n, toYear - 1);
    onChange([Math.max(min, clamped), toYear]);
  };
  const setTo = (n: number) => {
    const clamped = Math.max(n, fromYear + 1);
    onChange([fromYear, Math.min(max, clamped)]);
  };

  const presets: Array<{ label: string; from: number; to: number }> = [
    { label: '近一年', from: max - 1, to: max },
    { label: '近三年', from: max - 3, to: max },
    { label: '近五年', from: max - 5, to: max },
    { label: '不限', from: min, to: max },
  ];

  const midLow = Math.round(min + (max - min) / 3);
  const midHigh = Math.round(min + ((max - min) * 2) / 3);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${FILTER_CHIP_BASE} ${!isDefault ? FILTER_CHIP_ACTIVE : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <CalendarRange size={14} />
        <span>{isDefault ? '日期範圍' : `${fromYear}–${toYear}`}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-2 w-[360px] ${POPOVER_SURFACE} p-5 z-30`}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">選擇年份範圍</h4>
            <span className="text-xs font-mono text-primary-600 dark:text-primary-400 tabular-nums">
              {fromYear} – {toYear}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">
            裁判書可查詢範圍：{min} 至 {max}
          </p>

          <div className="relative h-10 mb-2">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
              style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
            />
            <input
              type="range"
              min={min}
              max={max}
              value={fromYear}
              onChange={(e) => setFrom(+e.target.value)}
              className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
              aria-label="起始年份"
            />
            <input
              type="range"
              min={min}
              max={max}
              value={toYear}
              onChange={(e) => setTo(+e.target.value)}
              className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
              aria-label="結束年份"
            />
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono tabular-nums mb-4">
            <span>{min}</span>
            <span>{midLow}</span>
            <span>{midHigh}</span>
            <span>{max}</span>
          </div>

          <div className="flex gap-1.5 mb-4">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange([p.from, p.to])}
                className="flex-1 h-7 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-700 dark:hover:text-primary-300 transition"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => onChange([min, max])}
              className="h-8 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              清除
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
            >
              套用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
