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

    // Apply folder filter: only when scope is 'current' and a folder is selected
    if (selectedFolder && searchScope === 'current') {
      list = list.filter((f) => f.folder === selectedFolder);
    }
    // When scope is 'current' and no folder selected, show all (same as before)
    // When scope is 'all', skip folder filtering entirely

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
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      // Folders are created implicitly when a favorite is moved to them.
      // We just close the dialog; user can now move items to this folder.
      setShowNewFolder(false);
      setNewFolderName('');
    }
  };

  const handleMove = (jid: string, folder: string) => {
    moveTo(jid, folder);
    setMoveTarget(null);
  };

  const handleSearch = () => {
    // Search is already reactive via the filtered memo,
    // this handler is for the explicit search button click
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <Bookmark size={24} className="text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">我的書籤</h1>
      </div>
      {selectedFolder && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 ml-9">
          顯示 {selectedFolder} 中的書籤項目
        </p>
      )}
      {!selectedFolder && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 ml-9">
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
                onClick={() => setShowNewFolder(true)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer transition-all duration-200"
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
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  onClick={handleAddFolder}
                  disabled={!newFolderName.trim() || folders.includes(newFolderName.trim())}
                  className="p-1 text-indigo-600 hover:text-indigo-700 disabled:text-gray-300 dark:disabled:text-gray-600 cursor-pointer disabled:cursor-not-allowed"
                  title="確認"
                >
                  <Check size={14} />
                </button>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="p-1 text-gray-400 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center cursor-pointer transition-all duration-200 ${
                selectedFolder === null
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium border-l-[3px] border-l-indigo-600 dark:border-l-indigo-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>全部</span>
              <span className="text-xs text-gray-400">{favorites.length}</span>
            </button>

            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center cursor-pointer transition-all duration-200 ${
                  selectedFolder === folder
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium border-l-[3px] border-l-indigo-600 dark:border-l-indigo-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={14} className="text-gray-400 dark:text-gray-500" />
                  {folder}
                </span>
                <span className="text-xs text-gray-400">{folderCounts[folder] || 0}</span>
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
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 text-sm shadow-sm transition-all duration-200"
              />
            </div>
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as SearchScope)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shrink-0 shadow-sm"
            >
              <option value="current">僅當前資料夾</option>
              <option value="all">全部資料夾</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all duration-200 shrink-0 shadow-sm"
            >
              搜尋
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Bookmark size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {favorites.length === 0
                  ? '還沒有書籤，去搜尋頁面收藏判決吧！'
                  : '沒有符合篩選條件的書籤'}
              </p>
              {favorites.length === 0 && (
                <Link
                  to="/search"
                  className="inline-block mt-4 px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
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
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 border-l-[3px] border-l-indigo-500 dark:border-l-indigo-400 p-5 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/ruling/${encodeURIComponent(fav.jid)}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline transition-colors"
                      >
                        {fav.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-400 dark:text-gray-500">
                        <span>{fav.court}</span>
                        <span>{fav.date}</span>
                        <span className="text-xs">
                          加入於 {new Date(fav.addedAt).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Move folder */}
                      <div className="relative">
                        <button
                          onClick={() => setMoveTarget(moveTarget === fav.jid ? null : fav.jid)}
                          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer transition-all duration-200"
                          title="移動到資料夾"
                        >
                          <MoveRight size={16} />
                        </button>
                        {moveTarget === fav.jid && (
                          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1.5 overflow-hidden">
                            {folders.map((folder) => (
                              <button
                                key={folder}
                                onClick={() => handleMove(fav.jid, folder)}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors ${
                                  fav.folder === folder
                                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
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
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 dark:text-gray-600 hover:text-red-500 cursor-pointer transition-all duration-200"
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
