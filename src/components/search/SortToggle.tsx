import type { SearchSort } from '../../types';

interface SortToggleProps {
  value: SearchSort;
  onChange: (v: SearchSort) => void;
}

const OPTIONS: Array<{ key: SearchSort; label: string }> = [
  { key: 'relevance', label: '關聯度' },
  { key: 'date', label: '日期' },
];

export default function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div
      className="inline-flex items-center h-9 p-0.5 rounded-full bg-gray-100 dark:bg-gray-800"
      role="tablist"
      aria-label="排序方式"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={`h-8 px-4 rounded-full text-xs font-medium transition-all duration-200 ${
              active
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
