import { Menu, X } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-40">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
          L
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">LawSearch AI</span>
      </div>
    </header>
  );
}
