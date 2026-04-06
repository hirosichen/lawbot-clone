import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import RulingPage from './pages/RulingPage';
import FavoritesPage from './pages/FavoritesPage';
import ChatPage from './pages/ChatPage';
import ProjectPage from './pages/ProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import LawPage from './pages/LawPage';
import HistoryPage from './pages/HistoryPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/ruling/:jid', element: <RulingPage /> },
      { path: '/favorites', element: <FavoritesPage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/chat/:id', element: <ChatPage /> },
      { path: '/project', element: <ProjectPage /> },
      { path: '/project/:id', element: <ProjectDetailPage /> },
      { path: '/law/:lawId', element: <LawPage /> },
      { path: '/history', element: <HistoryPage /> },
    ],
  },
]);
