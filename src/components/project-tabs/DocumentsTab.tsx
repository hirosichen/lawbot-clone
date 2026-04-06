import { Scroll, Trash2 } from 'lucide-react';
import { useProjects } from '../../stores/projects';
import { relativeTime } from '../../utils/time';

interface DocumentsTabProps {
  projectId: string;
}

export default function DocumentsTab({ projectId }: DocumentsTabProps) {
  const { getProject, removeDocument } = useProjects();
  const project = getProject(projectId);
  const documents = project?.documents ?? [];

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Scroll size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
          尚無書狀
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          在對話中建立書狀後，連結到此案件即可在此顯示。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {doc.title}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {relativeTime(doc.createdAt)}
            </p>
          </div>
          <button
            onClick={() => removeDocument(projectId, doc.id)}
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            aria-label="刪除書狀"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
