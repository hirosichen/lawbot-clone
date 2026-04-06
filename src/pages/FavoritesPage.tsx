import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Plus, Trash2, FolderOpen, Search, MoveRight, X, Check } from 'lucide-react';
import { useFavorites } from '../stores/favorites';

const DEFAULT_FOLDER = '我的最愛';

type SearchScope = 'current' | 'all';

export default function FavoritesPage() {
  const { favorites, removeFavorite, moveTo } = useFavorites();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('current');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus new folder input
  useEffect(() => {
    if (showNewFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolder]);

  const folders = useMemo(() => {
    const set = new Set(favorites.map((f) => f.folder));
    set.add(DEFAULT_FOLDER);
    return Array.from(set).sort();
  }, [favorites]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of favorites) {
      counts[f.folder] = (counts[f.folder] || 0) + 1;
    }
    return counts;
  }, [favorites]);

  const filtered = useMemo(() => {
    let list = favorites;

    if (selectedFolder && searchScope === 'current') {
      list = list.filter((f) => f.folder === selectedFolder);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.court.toLowerCase().includes(q) ||
          f.jid.toLowerCase().includes(q),
      );
    }
    return list;
  }, [favorites, selectedFolder, searchQuery, searchScope]);

  const handleAddFolder = () => {
    const name = newFolderName.trim();
    if (name && !folders.includes(name)) {
      // Create folder by selecting it (folders are implicit)
      setSelectedFolder(name);
      setShowNewFolder(false);
      setNewFolderName('');
    }
  };

  const handleMove = (jid: string, folder: string) => {
    moveTo(jid, folder);
    setMoveTarget(null);
  };

  const handleSearch = () => {
    // Search is already reactive via the filtered memo
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <Bookmark size={24} className="text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">我的書籤</h1>
      </div>
      {selectedFolder && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 ml-9">
          顯示 {selectedFolder} 中的書籤項目
        </p>
      )}
      {!selectedFolder && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 ml-9">
          顯示所有書籤項目
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Panel - Folders */}
        <div className="w-full md:w-56 shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">資料夾</span>
              <button
                onClick={() => {
                  setShowNewFolder(true);
                  setNewFolderName('');
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
                title="新增資料夾"
              >
                <Plus size={16} />
              </button>
            </div>

            {showNewFolder && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex gap-1">
                <input
                  ref={newFolderInputRef}
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddFolder();
                    if (e.key === 'Escape') {
                      setShowNewFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder="資料夾名稱"
                  className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddFolder}
                  disabled={!newFolderName.trim() || folders.includes(newFolderName.trim())}
                  className="p-1 text-primary-600 hover:text-primary-700 disabled:text-gray-300 dark:disabled:text-gray-600 cursor-pointer disabled:cursor-not-allowed"
                  title="確認"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }}
                  className="p-1 text-gray-400 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center cursor-pointer transition-colors ${
                selectedFolder === null
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>全部</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {favorites.length}
              </span>
            </button>

            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center cursor-pointer transition-colors ${
                  selectedFolder === folder
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} />
                  {folder}
                </span>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {folderCounts[folder] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Bookmark List */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜尋書籤..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as SearchScope)}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
            >
              <option value="current">僅當前資料夾</option>
              <option value="all">全部資料夾</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shrink-0"
            >
              搜尋
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Bookmark size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {favorites.length === 0
                  ? '還沒有書籤，去搜尋頁面收藏判決吧！'
                  : '沒有符合篩選條件的書籤'}
              </p>
              {favorites.length === 0 && (
                <Link
                  to="/search"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  前往搜尋
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((fav) => (
                <div
                  key={fav.jid}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/ruling/${encodeURIComponent(fav.jid)}`}
                        className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
                      >
                        {fav.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <span>{fav.court}</span>
                        <span>{fav.date}</span>
                        <span className="text-xs">
                          加入於 {new Date(fav.addedAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move folder */}
                      <div className="relative">
                        <button
                          onClick={() => setMoveTarget(moveTarget === fav.jid ? null : fav.jid)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                          title="移動到資料夾"
                        >
                          <MoveRight size={16} />
                        </button>
                        {moveTarget === fav.jid && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                            {folders.map((folder) => (
                              <button
                                key={folder}
                                onClick={() => handleMove(fav.jid, folder)}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                                  fav.folder === folder
                                    ? 'text-primary-600 font-medium'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {folder}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeFavorite(fav.jid)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 cursor-pointer"
                        title="刪除書籤"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
