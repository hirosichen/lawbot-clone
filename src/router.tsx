import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import RulingPage from './pages/RulingPage';
import FavoritesPage from './pages/FavoritesPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/ruling/:jid', element: <RulingPage /> },
      { path: '/favorites', element: <FavoritesPage /> },
    ],
  },
]);
