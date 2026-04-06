import { NavLink } from 'react-router-dom';
import { Home, Search, Bookmark, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const navItems = [
  { to: '/', icon: Home, label: '首頁' },
  { to: '/search', icon: Search, label: '精準搜尋' },
  { to: '/favorites', icon: Bookmark, label: '書籤收藏' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          L
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
            LawSearch AI
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {!collapsed && <span>{theme === 'light' ? '深色模式' : '淺色模式'}</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          {!collapsed && <span>收合</span>}
        </button>
      </div>
    </aside>
  );
}
