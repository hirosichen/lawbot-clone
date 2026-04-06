import { useState } from 'react';
import {
  Plus,
  Users,
  User,
  Building,
  Calendar,
  Hash,
  MapPin,
  Trash2,
  X,
} from 'lucide-react';
import { useProjects } from '../../stores/projects';
import type { Entity, EntityType } from '../../types';

interface EntitiesTabProps {
  projectId: string;
}

const TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'person', label: '人物' },
  { value: 'org', label: '機構' },
  { value: 'date', label: '日期' },
  { value: 'amount', label: '數額' },
  { value: 'place', label: '地點' },
];

function getEntityIcon(type: EntityType, size = 16) {
  const props = { size, className: 'text-primary-600 dark:text-primary-400' };
  switch (type) {
    case 'person':
      return <User {...props} />;
    case 'org':
      return <Building {...props} />;
    case 'date':
      return <Calendar {...props} />;
    case 'amount':
      return <Hash {...props} />;
    case 'place':
      return <MapPin {...props} />;
  }
}

export default function EntitiesTab({ projectId }: EntitiesTabProps) {
  const { getProject, addEntity, removeEntity } = useProjects();
  const project = getProject(projectId);
  const [modalOpen, setModalOpen] = useState(false);

  if (!project) return null;

  const entities = project.entities ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          案件實體
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer"
          aria-label="新增實體"
        >
          <Plus size={16} />
          新增
        </button>
      </div>

      {/* Empty state or list */}
      {entities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Users size={28} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            尚無案件實體
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            手動新增
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              onDelete={() => removeEntity(projectId, entity.id)}
            />
          ))}
        </ul>
      )}

      {modalOpen && (
        <EntityModal
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            addEntity(projectId, payload);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function EntityRow({
  entity,
  onDelete,
}: {
  entity: Entity;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
        {getEntityIcon(entity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {entity.name}
        </div>
        {entity.role && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {entity.role}
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
        aria-label="刪除實體"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

interface EntityModalProps {
  onClose: () => void;
  onSave: (payload: { type: EntityType; name: string; role?: string }) => void;
}

function EntityModal({ onClose, onSave }: EntityModalProps) {
  const [type, setType] = useState<EntityType>('person');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      type,
      name: name.trim(),
      role: role.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              新增實體
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              記錄案件中的關鍵人物、日期、數額、地點或機構
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              類型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntityType)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：王小明"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              角色／備註（選填）
            </label>
            <textarea
              value={role}
              onChange={(e) => setRole(e.target.value)}
              rows={3}
              placeholder="例：原告、被告、證人"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
