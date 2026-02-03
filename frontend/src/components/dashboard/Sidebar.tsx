import { Link, useLocation } from 'react-router-dom';
import { MdDashboard, MdAnalytics } from 'react-icons/md';
import { FaUserShield, FaGamepad } from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="logo-section">
        <div className="logo-icon">
          <FaGamepad size={28} color="var(--accent-yellow)" />
        </div>
        <h1 className="logo-text">Thunder <br /><span className="highlight">Gaming</span></h1>
      </div>

      <nav className="nav-menu">
        <Link to="/employee" className={`nav-item ${isActive('/employee') ? 'active' : ''}`}>
          <MdDashboard size={22} />
          <span>Dashboard</span>
        </Link>
        <Link to="/analytic" className={`nav-item ${isActive('/analytic') ? 'active' : ''}`}>
          <MdAnalytics size={22} />
          <span>Analysis</span>
        </Link>
        <Link to="/owner" className={`nav-item ${isActive('/owner') ? 'active' : ''}`}>
          <FaUserShield size={22} />
          <span>Owner</span>
        </Link>
      </nav>

      <style>{`
        .sidebar {
          width: 260px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 1.5rem 1rem;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 3rem;
          padding: 0 0.5rem;
        }

        .logo-icon {
          background: rgba(251, 191, 36, 0.1);
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
        }

        .logo-text {
          font-family: var(--font-display);
          font-size: 1.1rem;
          line-height: 1.2;
          color: var(--text-primary);
          text-transform: uppercase;
        }
        
        .highlight {
          color: var(--accent-yellow);
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.3s;
          font-weight: 500;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: linear-gradient(90deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%);
          color: var(--accent-yellow);
          border-left: 3px solid var(--accent-yellow);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
