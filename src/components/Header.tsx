import { Menu, X } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xs">
          L
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">LawSearch AI</span>
      </div>
    </header>
  );
}
