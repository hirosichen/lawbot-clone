import { NavLink } from 'react-router-dom';
import { MessageSquare, FolderOpen, Search, Bookmark, Clock, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'AI 問答' },
  { to: '/project', icon: FolderOpen, label: '案件管理' },
  { to: '/search', icon: Search, label: '精準搜尋' },
  { to: '/favorites', icon: Bookmark, label: '書籤內容' },
  { to: '/history', icon: Clock, label: '聊天紀錄' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`hidden md:flex flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-950/30 dark:to-transparent hover:from-indigo-50 dark:hover:from-indigo-950/50 transition-all duration-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
          L
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
            LawSearch AI
          </span>
        )}
      </NavLink>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium border-l-[3px] border-l-indigo-600 dark:border-l-indigo-400 -ml-0.5 pl-[10px]'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'light' ? '深色模式' : '淺色模式') : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          {theme === 'light' ? <Moon size={20} className="text-gray-400 dark:text-gray-500" /> : <Sun size={20} className="text-gray-400 dark:text-gray-500" />}
          {!collapsed && <span>{theme === 'light' ? '深色模式' : '淺色模式'}</span>}
        </button>
        <button
          onClick={onToggle}
          title={collapsed ? '展開' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <PanelLeft size={20} className="text-gray-400 dark:text-gray-500" /> : <PanelLeftClose size={20} className="text-gray-400 dark:text-gray-500" />}
          {!collapsed && <span>收合</span>}
        </button>
      </div>
    </aside>
  );
}
