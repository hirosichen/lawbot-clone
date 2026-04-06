import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Check, Loader2 } from 'lucide-react';
import { useProjects } from '../stores/projects';
import { relativeTime } from '../utils/time';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, removeProject } = useProjects();

  const project = getProject(id ?? '');

  const [title, setTitle] = useState('');
  const [facts, setFacts] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setFacts(project.facts);
      setNotes(project.notes);
    }
  }, [project]);

  const doSave = useCallback(
    (t: string, f: string, n: string) => {
      if (!project || !t.trim()) return;
      setSaveStatus('saving');
      updateProject(project.id, {
        title: t.trim(),
        facts: f,
        notes: n,
      });
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    },
    [project, updateProject],
  );

  // Auto-save on changes (debounced)
  const scheduleAutoSave = useCallback(
    (t: string, f: string, n: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        doSave(t, f, n);
      }, 1500);
    },
    [doSave],
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, facts, notes);
  };

  const handleFactsChange = (val: string) => {
    setFacts(val);
    scheduleAutoSave(title, val, notes);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    scheduleAutoSave(title, facts, val);
  };

  const handleSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    doSave(title, facts, notes);
  };

  const handleDelete = () => {
    removeProject(project.id);
    navigate('/project');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/project')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
        >
          <ArrowLeft size={16} />
          返回案件列表
        </button>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>儲存中...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check size={12} className="text-green-500" />
              <span className="text-green-600 dark:text-green-400">已自動儲存</span>
            </>
          )}
          {saveStatus === 'idle' && hasChanges && (
            <span>有未儲存的變更</span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            案件標題
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Facts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              事實
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {facts.length} 字
            </span>
          </div>
          <textarea
            value={facts}
            onChange={(e) => handleFactsChange(e.target.value)}
            rows={8}
            placeholder="描述案件事實..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              筆記
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {notes.length} 字
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={6}
            placeholder="新增筆記..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            刪除案件
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            儲存
          </button>
        </div>

        {/* Metadata */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-400">
          <span>建立：{relativeTime(project.createdAt)}</span>
          <span>更新：{relativeTime(project.updatedAt)}</span>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">刪除案件</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">此操作無法復原</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              確定要刪除「{project.title}」嗎？刪除後將無法恢復所有相關資料。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
