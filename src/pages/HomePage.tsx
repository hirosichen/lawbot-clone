import { useNavigate, Link } from 'react-router-dom';
import { Search, Scale, Brain, BarChart3, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { StatsResponse } from '../types';

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || value === 0) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  if (value >= 1_000_000) {
    return <span ref={ref}>{(display / 1_000_000).toFixed(1)}M+</span>;
  }
  return <span ref={ref}>{display.toLocaleString()}</span>;
}

const quickLinks = [
  '民法', '刑法', '民事訴訟法', '刑事訴訟法',
  '憲法', '公司法', '勞動基準法',
  '消費者保護法', '家事事件法',
];

const features = [
  {
    icon: Search,
    title: '精準搜尋',
    desc: '全文關鍵字搜尋，支援法院和日期篩選',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: '語意搜尋',
    desc: 'AI 語意理解，用自然語言描述法律問題',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: BarChart3,
    title: '引用分析',
    desc: '查看判決之間的引用關係',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Star,
    title: '書籤收藏',
    desc: '收藏重要判決，分類管理',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');

  const { data: stats } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.getStats();
      return res.data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams({ q: query.trim() });
      if (mode === 'semantic') params.set('mode', 'semantic');
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur mb-6">
            <Scale className="text-white" size={32} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            台灣法律 AI 搜尋引擎
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            搜尋超過 2,160 萬筆裁判書、法律條文與司法解釋
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入關鍵字或法律問題..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 text-base shadow-lg"
              />
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                type="submit"
                onClick={() => setMode('keyword')}
                className="px-6 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur text-white font-medium transition-colors cursor-pointer"
              >
                關鍵字搜尋
              </button>
              <button
                type="submit"
                onClick={() => setMode('semantic')}
                className="px-6 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur text-white font-medium transition-colors cursor-pointer"
              >
                語意搜尋
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 -mt-8 w-full">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 text-center border border-gray-100 dark:border-gray-800">
            <div className="text-3xl md:text-4xl font-bold text-primary-600">
              {stats ? <AnimatedNumber value={stats.total_rulings} /> : '--'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">裁判書總數</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 text-center border border-gray-100 dark:border-gray-800">
            <div className="text-3xl md:text-4xl font-bold text-primary-600">
              {stats ? <AnimatedNumber value={stats.courts} /> : '--'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">法院數</div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-4xl mx-auto px-4 py-12 w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">常用法律</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((law) => (
            <Link
              key={law}
              to={`/search?q=${encodeURIComponent(law)}`}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-900/30 dark:hover:text-primary-300 transition-colors text-sm font-medium"
            >
              {law}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">功能介紹</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${f.bg} ${f.color} flex items-center justify-center mb-3`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
