import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'rse', label: 'RSE', path: '/contest-moves/rse' },
  { key: 'dppt', label: 'DPPt', path: '/contest-moves/dppt' },
  { key: 'oras', label: 'ORAS', path: '/contest-moves/oras' },
  { key: 'bdsp', label: 'BDSP', path: '/contest-moves/bdsp' },
];

function getActiveIndex(pathname: string): number {
  const match = TABS.findIndex(tab => pathname.includes(`/contest-moves/${tab.key}`));
  return match >= 0 ? match : 0;
}

export default function ContestTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = getActiveIndex(location.pathname);

  const goDelta = (delta: number) => {
    const nextIndex = (activeIndex + delta + TABS.length) % TABS.length;
    navigate(TABS[nextIndex].path);
  };

  return (
    <div className="contest-tabs">
      <button
        type="button"
        className="nav-arrow nav-arrow-left"
        onClick={() => goDelta(-1)}
        aria-label="Previous tab"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="15,5 7,12 15,19" />
        </svg>
      </button>

      {TABS.map(tab => (
        <NavLink
          key={tab.key}
          to={tab.path}
          className={({ isActive }) => `contest-tab${isActive ? ' active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}

      <button
        type="button"
        className="nav-arrow nav-arrow-right"
        onClick={() => goDelta(1)}
        aria-label="Next tab"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="9,5 17,12 9,19" />
        </svg>
      </button>
    </div>
  );
}
