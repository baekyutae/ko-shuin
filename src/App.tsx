import { lazy, Suspense } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { DemoPanel } from './components/DemoPanel';
import { Toast } from './components/ui';
import Visit from './pages/Visit';
import Result from './pages/Result';
import QrEntry from './pages/QrEntry';
import Book from './pages/Book';
import Conquest from './pages/Conquest';
import Vote from './pages/Vote';
import NowRoute from './pages/NowRoute';
import { useTimelineRecorder } from './hooks/useTimelineRecorder';

// 지도 라이브러리가 큰 화면은 필요할 때만 불러온다.
const Pilgrimage = lazy(() => import('./pages/Pilgrimage'));
const Admin = lazy(() => import('./pages/Admin'));

const TABS = [
  { to: '/', icon: '訪', label: '방문' },
  { to: '/book', icon: '帖', label: '수첩' },
  { to: '/map', icon: '地', label: '도장깨기' },
  { to: '/route', icon: '巡', label: '순례' },
  { to: '/vote', icon: '票', label: '제안' },
];

function Loading() {
  return <div className="empty">불러오는 중…</div>;
}

export default function App() {
  const { pathname } = useLocation();
  useTimelineRecorder();

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<Loading />}>
        <Admin />
        <Toast />
      </Suspense>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <b>KO朱印</b>
          <span>서울의 고슈인 수첩</span>
        </Link>
        <span className="tag">데모</span>
      </header>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Visit />} />
          <Route path="/now" element={<NowRoute />} />
          <Route path="/result" element={<Result />} />
          <Route path="/s/:placeId" element={<QrEntry />} />
          <Route path="/book" element={<Book />} />
          <Route path="/map" element={<Conquest />} />
          <Route path="/route" element={<Pilgrimage />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="*" element={<Visit />} />
        </Routes>
      </Suspense>
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <i>{t.icon}</i>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <DemoPanel />
      <Toast />
    </div>
  );
}
