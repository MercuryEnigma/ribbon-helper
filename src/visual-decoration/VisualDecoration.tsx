import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './visual-decoration.css';

type ComingSoonProps = {
  title: string;
  subtitle: string;
  flavor: string;
};

function ComingSoonCard({ title, subtitle, flavor }: ComingSoonProps) {
  return (
    <div className="vd-coming-card">
      <div className="vd-card-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <span className="vd-pill">Coming soon</span>
      <p className="vd-note">{flavor}</p>
    </div>
  );
}

export default function VisualDecoration() {
  return (
    <div className="visual-decoration">

      <div className="vd-tabs">
        <NavLink
          to="/visual-decoration/dppt-accessories"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          DPPt accessories
        </NavLink>
        <NavLink
          to="/visual-decoration/bdsp-ball-stickers"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          BDSP ball stickers
        </NavLink>
      </div>

      <div className="vd-pane">
        <Routes>
          <Route path="/" element={<Navigate to="/visual-decoration/dppt-accessories" replace />} />
          <Route
            path="/dppt-accessories"
            element={
              <ComingSoonCard
                title="DPPt accessories"
                subtitle="Dress up your pokemon with accessories to improve your visual score."
                flavor="Optimal accessories by the category are coming soon."
              />
            }
          />
          <Route
            path="/bdsp-ball-stickers"
            element={
              <ComingSoonCard
                title="BDSP ball stickers"
                subtitle="Add stickers to your ball capsule to improve your visual score."
                flavor="Optimal ball stickers by the contest type are coming soon."
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}
