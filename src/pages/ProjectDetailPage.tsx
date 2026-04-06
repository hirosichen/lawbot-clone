import { useState, useEffect, useRef, useCallback, type ComponentType } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Check,
  Loader2,
  BookOpen,
  Paperclip,
  Users,
  Scale,
  TrendingUp,
  ScrollText,
  Search,
} from 'lucide-react';
import { useProjects } from '../stores/projects';
import { relativeTime } from '../utils/time';
import AttachmentsTab from '../components/project-tabs/AttachmentsTab';
import EntitiesTab from '../components/project-tabs/EntitiesTab';
import IssuesTab from '../components/project-tabs/IssuesTab';
import GapsTab from '../components/project-tabs/GapsTab';
import DocumentsTab from '../components/project-tabs/DocumentsTab';
import ResearchTab from '../components/project-tabs/ResearchTab';

type TabKey =
  | 'overview'
  | 'attachments'
  | 'entities'
  | 'issues'
  | 'gaps'
  | 'documents'
  | 'research';

interface TabDef {
  key: TabKey;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabDef[] = [
  { key: 'overview', label: '概覽', icon: BookOpen },
  { key: 'attachments', label: '附件', icon: Paperclip },
  { key: 'entities', label: '實體', icon: Users },
  { key: 'issues', label: '爭點', icon: Scale },
  { key: 'gaps', label: '缺口分析', icon: TrendingUp },
  { key: 'documents', label: '書狀', icon: ScrollText },
  { key: 'research', label: '法律研究', icon: Search },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, removeProject } = useProjects();

  const project = getProject(id ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
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
      <div className="max-w-5xl mx-auto px-4 py-6">
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

  const counts = {
    attachments: project.attachments?.length ?? 0,
    entities: project.entities?.length ?? 0,
    issues: project.issues?.length ?? 0,
    gaps: project.gaps?.length ?? 0,
  };

  const statCards: Array<{ key: TabKey; label: string; value: number; icon: ComponentType<{ size?: number; className?: string }> }> = [
    { key: 'attachments', label: '附件', value: counts.attachments, icon: Paperclip },
    { key: 'entities', label: '實體', value: counts.entities, icon: Users },
    { key: 'issues', label: '爭點', value: counts.issues, icon: Scale },
    { key: 'gaps', label: '缺口', value: counts.gaps, icon: TrendingUp },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/project')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
        >
          <ArrowLeft size={16} />
          返回案件列表
        </button>

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
          {saveStatus === 'idle' && hasChanges && <span>有未儲存的變更</span>}
        </div>
      </div>

      {/* Project title header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {project.title || '未命名案件'}
        </h1>
        <div className="mt-1 flex gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span>建立：{relativeTime(project.createdAt)}</span>
          <span>更新：{relativeTime(project.updatedAt)}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                active
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.key}
                    onClick={() => setActiveTab(card.key)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                        {card.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {card.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Case summary placeholder */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  案件摘要
                </h3>
                <button
                  disabled
                  className="text-xs px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                >
                  重新生成
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                尚未生成案件摘要。上傳附件或新增爭點後，點擊「重新生成」自動產生。
              </p>
            </div>

            {/* Editable fields */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
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
            </div>
          </div>
        )}

        {activeTab === 'attachments' && <AttachmentsTab projectId={project.id} />}
        {activeTab === 'entities' && <EntitiesTab projectId={project.id} />}
        {activeTab === 'issues' && <IssuesTab projectId={project.id} />}
        {activeTab === 'gaps' && <GapsTab projectId={project.id} />}
        {activeTab === 'documents' && <DocumentsTab projectId={project.id} />}
        {activeTab === 'research' && <ResearchTab projectId={project.id} />}
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
