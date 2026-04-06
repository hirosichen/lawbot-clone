import { useMemo, useState } from 'react';
import { Plus, Scale, Trash2, X, Zap } from 'lucide-react';
import { useProjects } from '../../stores/projects';
import type { Issue, Priority } from '../../types';

interface IssuesTabProps {
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
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const STANCE_OPTIONS = ['未設定', '原告', '被告', '中立'] as const;

export default function IssuesTab({ projectId }: IssuesTabProps) {
  const { getProject, addIssue, removeIssue } = useProjects();
  const project = getProject(projectId);

  const issues = useMemo<Issue[]>(() => project?.issues ?? [], [project]);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stance, setStance] = useState<string>('未設定');
  const [priority, setPriority] = useState<Priority>('medium');

  function resetForm() {
    setTitle('');
    setDescription('');
    setStance('未設定');
    setPriority('medium');
  }

  function handleClose() {
    setShowModal(false);
    resetForm();
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    addIssue(projectId, {
      title: trimmed,
      description: description.trim() || undefined,
      stance: stance === '未設定' ? undefined : stance,
      priority,
    });
    handleClose();
  }

  function handleAIGenerate() {
    alert('功能開發中');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">爭點列表</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAIGenerate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors cursor-pointer"
          >
            <Zap size={14} />
            AI 生成
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            新增
          </button>
        </div>
      </div>

      {/* List / Empty state */}
      {issues.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Scale size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">尚無爭點</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            點擊「AI 生成」自動分析，或手動新增
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {issue.title}
                  </h3>
                  {issue.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                      {issue.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {issue.stance && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {issue.stance}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CHIP[issue.priority]}`}
                    >
                      {PRIORITY_LABEL[issue.priority]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeIssue(projectId, issue.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
                  aria-label="刪除爭點"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-start justify-between p-6 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">新增爭點</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  填入爭點標題與相關資訊
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  爭點標題<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：被告是否有過失責任？"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  說明（選填）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    立場
                  </label>
                  <select
                    value={stance}
                    onChange={(e) => setStance(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {STANCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    優先級
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
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
