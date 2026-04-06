import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useProjects } from '../stores/projects';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, removeProject } = useProjects();

  const project = getProject(id ?? '');

  const [title, setTitle] = useState('');
  const [facts, setFacts] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setFacts(project.facts);
      setNotes(project.notes);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/project')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          返回案件列表
        </button>
        <div className="text-center py-20">
          <p className="text-gray-500 dark:text-gray-400">找不到此案件</p>
        </div>
      </div>
    );
  }

  const hasChanges =
    title !== project.title || facts !== project.facts || notes !== project.notes;

  const handleSave = () => {
    if (!title.trim()) return;
    updateProject(project.id, {
      title: title.trim(),
      facts,
      notes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (window.confirm('確定要刪除此案件嗎？此操作無法復原。')) {
      removeProject(project.id);
      navigate('/project');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate('/project')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        返回案件列表
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            案件標題
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Facts */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            事實
          </label>
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            rows={8}
            placeholder="描述案件事實..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            筆記
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="新增筆記..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            刪除案件
          </button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">已儲存</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              儲存
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-400">
          <span>建立：{new Date(project.createdAt).toLocaleString('zh-TW')}</span>
          <span>更新：{new Date(project.updatedAt).toLocaleString('zh-TW')}</span>
        </div>
      </div>
    </div>
  );
}
