import { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useProjects } from '../../stores/projects';
import type { ProjectReference } from '../../types';

interface ResearchTabProps {
  projectId: string;
}

type SubTab = 'lawbot' | 'custom';

export default function ResearchTab({ projectId }: ResearchTabProps) {
  const { getProject, removeReference } = useProjects();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('lawbot');

  const project = getProject(projectId);
  const references = project?.references ?? [];

  const lawbotRefs = references.filter((r) => r.source === 'lawbot');
  const customRefs = references.filter((r) => r.source === 'custom');
  const activeRefs = activeSubTab === 'lawbot' ? lawbotRefs : customRefs;

  const handleImport = () => {
    // Placeholder — actual import flow TBD.
    // eslint-disable-next-line no-alert
    alert('功能開發中');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          參考資料
        </h2>
        <button
          onClick={handleImport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          匯入資料
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveSubTab('lawbot')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'lawbot'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Lawbot 推薦 ({lawbotRefs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('custom')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'custom'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          自選資料 ({customRefs.length})
        </button>
      </div>

      {/* Content */}
      {activeRefs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">暫無資料</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeRefs.map((ref) => (
            <ReferenceRow
              key={ref.id}
              reference={ref}
              onDelete={() => removeReference(projectId, ref.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReferenceRowProps {
  reference: ProjectReference;
  onDelete: () => void;
}

function ReferenceRow({ reference, onDelete }: ReferenceRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {reference.title}
        </p>
        {reference.url && (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 break-all"
          >
            <ExternalLink size={12} className="flex-shrink-0" />
            <span className="truncate">{reference.url}</span>
          </a>
        )}
      </div>
      <button
        onClick={onDelete}
        className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
        aria-label="刪除參考資料"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
