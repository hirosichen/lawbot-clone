import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useProjects } from '../../stores/projects';

interface AttachmentsTabProps {
  projectId: string;
}

interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  charCount?: number;
  truncated?: boolean;
  preview?: string;
  parseMethod?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AttachmentsTab({ projectId }: AttachmentsTabProps) {
  const { getProject, addAttachment, removeAttachment } = useProjects();
  const project = getProject(projectId);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const attachments = project?.attachments ?? [];

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || `上傳失敗 (${res.status})`);
        }

        const data = (await res.json()) as UploadResponse;

        addAttachment(projectId, {
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: file.type,
          charCount: data.charCount,
          parseMethod: data.parseMethod,
          preview: data.preview,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '上傳失敗');
      } finally {
        setUploading(false);
      }
    },
    [projectId, addAttachment],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        await handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClickUpload = () => {
    inputRef.current?.click();
  };

  if (!project) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
        找不到此案件
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClickUpload}
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer px-6 py-10 text-center ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 bg-gray-50 dark:bg-gray-900/50'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 size={32} className="text-primary-500 animate-spin" />
          ) : (
            <Upload size={32} className="text-gray-400 dark:text-gray-500" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {uploading ? '上傳中...' : '拖放檔案至此處，或點擊上傳'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              支援 PDF、Word、圖片等多種格式
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
            已上傳檔案 ({attachments.length})
          </div>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {a.fileName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 mt-0.5">
                    <span>{formatFileSize(a.fileSize)}</span>
                    <span>·</span>
                    <span>{formatDate(a.uploadedAt)}</span>
                    {a.charCount !== undefined && (
                      <>
                        <span>·</span>
                        <span>{a.charCount.toLocaleString()} 字</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeAttachment(projectId, a.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer flex-shrink-0"
                  title="刪除"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !uploading && (
          <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
            尚未上傳任何檔案
          </div>
        )
      )}
    </div>
  );
}
