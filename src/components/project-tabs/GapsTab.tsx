import { useState } from 'react';
import { Plus, Trash2, TrendingUp, Zap, X } from 'lucide-react';
import { useProjects } from '../../stores/projects';
import type { Priority } from '../../types';

interface GapsTabProps {
  projectId: string;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_CHIP: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function GapsTab({ projectId }: GapsTabProps) {
  const { getProject, addGap, removeGap } = useProjects();
  const project = getProject(projectId);
  const gaps = project?.gaps ?? [];

  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [toast, setToast] = useState<string | null>(null);

  const resetForm = () => {
    setDescription('');
    setSuggestion('');
    setPriority('medium');
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSave = () => {
    if (!description.trim()) return;
    addGap(projectId, {
      description: description.trim(),
      suggestion: suggestion.trim() || undefined,
      priority,
    });
    handleClose();
  };

  const handleAiAnalyze = () => {
    setToast('功能開發中');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">缺口分析</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
          >
            <Zap size={14} />
            AI 分析缺口
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="新增缺口"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* List or Empty */}
      {gaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">尚無缺口分析</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            點擊「AI 分析缺口」自動識別案件缺口
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {gaps.map((gap) => (
            <li
              key={gap.id}
              className="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CHIP[gap.priority]}`}
                    >
                      {PRIORITY_LABEL[gap.priority]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {gap.description}
                  </p>
                  {gap.suggestion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                      建議：{gap.suggestion}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeGap(projectId, gap.id)}
                  className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  aria-label="刪除缺口"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">新增缺口</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  手動新增一筆案件缺口
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  缺口描述<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="描述此缺口的具體問題..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                />
              </div>

              {/* Suggestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  建議（選填）
                </label>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  rows={3}
                  placeholder="建議如何補足此缺口..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  優先級
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!description.trim()}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
