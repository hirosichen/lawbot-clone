import { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useCustomLaws } from '../../stores/search';
import { ALL_LAWS } from '../../data/commonLaws';
import type { LawItem } from '../../types';
import CustomizeLawsModal from './CustomizeLawsModal';

interface CommonLawsSectionProps {
  onLawClick: (lawName: string) => void;
}

export default function CommonLawsSection({ onLawClick }: CommonLawsSectionProps) {
  const customLawIds = useCustomLaws();
  const [modalOpen, setModalOpen] = useState(false);

  const laws = useMemo<LawItem[]>(() => {
    const byId = new Map(ALL_LAWS.map((l) => [l.id, l]));
    return customLawIds
      .map((id) => byId.get(id))
      .filter((l): l is LawItem => Boolean(l));
  }, [customLawIds]);

  return (
    <section className="mt-12">
      <header className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            常用法律
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            點擊快速查閱，或客製化成你的常用清單
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 h-8 px-2 rounded-lg hover:bg-primary-50/60 dark:hover:bg-primary-950/30 transition-colors"
        >
          <Settings2 size={14} /> 客製化
        </button>
      </header>

      {laws.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          尚未選擇常用法律，點擊右上方「客製化」新增
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {laws.map((law) => (
            <button
              key={law.id}
              type="button"
              onClick={() => onLawClick(law.name)}
              className="
                group relative
                h-14 px-4
                rounded-2xl
                bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-800
                text-sm font-medium text-gray-700 dark:text-gray-200
                text-center flex items-center justify-center
                hover:-translate-y-0.5
                hover:border-primary-300 dark:hover:border-primary-700
                hover:bg-primary-50/40 dark:hover:bg-primary-950/20
                hover:text-primary-700 dark:hover:text-primary-300
                hover:shadow-[0_4px_16px_-8px_rgba(99,102,241,0.4)]
                active:translate-y-0 active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40
                transition-all duration-200
              "
            >
              <span className="block truncate">{law.name}</span>
            </button>
          ))}
        </div>
      )}

      <CustomizeLawsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
