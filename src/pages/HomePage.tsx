import { useNavigate, Link } from 'react-router-dom';
import { Search, Scale, Brain, BarChart3, Star, BookOpen, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { StatsResponse, LawsStatsResponse } from '../types';

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
  { name: '民法', lawId: 'B0000001' },
  { name: '刑法', lawId: 'C0000001' },
  { name: '民事訴訟法', lawId: 'B0010001' },
  { name: '刑事訴訟法', lawId: 'C0010001' },
  { name: '憲法', lawId: 'A0000001' },
  { name: '公司法', lawId: 'J0080001' },
  { name: '勞動基準法', lawId: 'N0030001' },
  { name: '消費者保護法', lawId: 'J0170001' },
  { name: '家事事件法', lawId: 'B0010048' },
  { name: '公寓大廈管理條例', lawId: 'D0070118' },
  { name: '洗錢防制法', lawId: 'G0380131' },
  { name: '貪污治罪條例', lawId: 'C0000007' },
];

const features = [
  {
    icon: Search,
    title: '精準搜尋',
    desc: '全文關鍵字搜尋，支援法院和日期篩選',
    borderColor: 'border-l-blue-500',
  },
  {
    icon: Brain,
    title: '語意搜尋',
    desc: 'AI 語意理解，用自然語言描述法律問題',
    borderColor: 'border-l-violet-500',
  },
  {
    icon: BarChart3,
    title: '引用分析',
    desc: '查看判決之間的引用關係',
    borderColor: 'border-l-emerald-500',
  },
  {
    icon: Star,
    title: '書籤收藏',
    desc: '收藏重要判決，分類管理',
    borderColor: 'border-l-amber-500',
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

  const { data: lawStats } = useQuery<LawsStatsResponse>({
    queryKey: ['lawsStats'],
    queryFn: async () => {
      const res = await api.getLawsStats();
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
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 text-white overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 mb-6">
            <Scale className="text-indigo-200" size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-tight tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
            台灣法律 AI 搜尋引擎
          </h1>
          <p className="text-indigo-200/80 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light">
            搜尋超過 2,160 萬筆裁判書、法律條文與司法解釋
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
            <div className="relative group">
              <Search
                size={22}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入關鍵字或法律問題..."
                className="w-full pl-14 pr-5 py-5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 text-base shadow-2xl shadow-black/20 transition-shadow focus:shadow-2xl focus:shadow-indigo-500/20"
              />
            </div>
            <div className="flex justify-center gap-3 mt-5">
              <button
                type="submit"
                onClick={() => setMode('keyword')}
                className="px-7 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-400/30 cursor-pointer"
              >
                關鍵字搜尋
              </button>
              <button
                type="submit"
                onClick={() => setMode('semantic')}
                className="px-7 py-3 rounded-full bg-transparent border border-white/30 hover:border-white/50 hover:bg-white/10 text-white font-medium transition-all duration-200 cursor-pointer"
              >
                語意搜尋
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 -mt-10 w-full relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none p-5 text-center border border-white/50 dark:border-gray-700/50">
            <div className="text-2xl md:text-3xl font-semibold text-indigo-600 dark:text-indigo-400">
              {stats ? <AnimatedNumber value={stats.total_rulings} /> : '--'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">裁判書總數</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none p-5 text-center border border-white/50 dark:border-gray-700/50">
            <div className="text-2xl md:text-3xl font-semibold text-indigo-600 dark:text-indigo-400">
              {stats ? <AnimatedNumber value={stats.courts} /> : '--'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">法院數</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none p-5 text-center border border-white/50 dark:border-gray-700/50">
            <div className="text-2xl md:text-3xl font-semibold text-violet-600 dark:text-violet-400">
              {lawStats ? <AnimatedNumber value={lawStats.total_laws} /> : '--'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">法規數</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none p-5 text-center border border-white/50 dark:border-gray-700/50">
            <div className="text-2xl md:text-3xl font-semibold text-violet-600 dark:text-violet-400">
              {lawStats ? <AnimatedNumber value={lawStats.total_articles} /> : '--'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">條文數</div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-4xl mx-auto px-4 py-14 w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" />
          常用法律
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {quickLinks.map((law) => (
            <Link
              key={law.lawId}
              to={`/law/${law.lawId}`}
              className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300 transition-all duration-200 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md hover:scale-105"
            >
              {law.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          功能介紹
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 border-l-[3px] ${f.borderColor} p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className="flex items-center gap-3 mb-2">
                <f.icon size={20} className="text-gray-400 dark:text-gray-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} LawSearch AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
