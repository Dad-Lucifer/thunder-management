import { useEffect, useRef, useState } from 'react';
import { FaWifi, FaServer, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { IoNotificationsOutline } from 'react-icons/io5';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Session {
  id: string;
  customer: string;
  startTime: string;
  duration: number;
}

const TopNavbar = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenProfile(false);
        setOpenNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* 🔔 Fetch expiring sessions every 30s */
  useEffect(() => {
    const checkExpiring = async () => {
      const res = await axios.get('http://localhost:5000/api/sessions/active');
      const sessions: Session[] = res.data;

      const now = Date.now();

      const expiring = sessions.filter(s => {
        const start = new Date(s.startTime).getTime();
        const end = start + s.duration * 60 * 60 * 1000;
        const diff = end - now;
        return diff > 0 && diff <= 10 * 60 * 1000; // 10 minutes
      });

      setNotifications(expiring);
    };

    checkExpiring();
    const interval = setInterval(checkExpiring, 30000);
    return () => clearInterval(interval);
  }, []);


  return (
    <header className="top-navbar">
      <div className="navbar-content">
        <h2 className="cafe-title">
          Thunder Gaming Cafe <span className="status-badge">ONLINE</span>
        </h2>

        <div className="status-indicators">
          <div className="status-item">
            <FaWifi color="#4ade80" />
            <span className="status-text">Network Stable</span>
          </div>
          <div className="status-item">
            <FaServer color="#4ade80" />
            <span className="status-text">Server Active</span>
          </div>
        </div>

         <div className="user-actions" ref={dropdownRef}>
          {/* 🔔 NOTIFICATIONS */}
          <div style={{ position: "relative" }}>
            <button
              className="icon-btn"
              onClick={() => setOpenNotif(p => !p)}
            >
              <IoNotificationsOutline size={20} />
              {notifications.length > 0 && (
                <span className="notification-dot"></span>
              )}
            </button>

            {openNotif && (
              <div className="notif-dropdown">
                {notifications.length === 0 ? (
                  <p className="notif-empty">No upcoming endings</p>
                ) : (
                  notifications.map(s => (
                    <div key={s.id} className="notif-item">
                      ⏰ {s.customer} ends in 10 min
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="profile-wrapper">
            <div
              className="profile-section"
              onClick={() => setOpen(prev => !prev)}
            >
              <div className="profile-info">
                <span className="profile-name">{user?.username}</span>
                <span className="profile-role">{user?.role}</span>
              </div>
              <FaUserCircle size={32} />
            </div>

            {open && (
              <div className="profile-dropdown">
                <button className="logout-btn" onClick={logout}>
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

<style>{`
.top-navbar {
  height: 70px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 90;
  backdrop-filter: blur(10px);
  background: rgba(15, 22, 35, 0.9);
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.cafe-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  font-size: 0.7rem;
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-indicators {
  display: flex;
  gap: 1.5rem;
  margin-left: auto;
  margin-right: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: var(--accent-yellow);
  border-radius: 50%;
}

.notification-box {
  position: absolute;
  top: 48px;
  right: 60px;
  background: rgba(15,22,35,0.95);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-width: 220px;
  padding: 0.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  z-index: 100;
}

/* 🔔 Notification dropdown */
.notif-dropdown {
  position: absolute;
  top: 48px;
  right: 0;
  background: rgba(15,22,35,0.95);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-width: 240px;
  padding: 0.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  z-index: 100;
}

.notif-item {
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-empty {
  padding: 0.8rem;
  text-align: center;
  color: var(--text-muted);
}


.notification-item {
  padding: 0.5rem;
  font-size: 0.8rem;
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
}

.notification-item strong {
  color: var(--text-primary);
}

.notification-item.muted {
  text-align: center;
  color: var(--text-muted);
}

.profile-wrapper {
  position: relative;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.profile-dropdown {
  position: absolute;
  right: 0;
  top: 48px;
  background: rgba(15, 22, 35, 0.95);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem;
  min-width: 140px;
}

.logout-btn {
  width: 100%;
  background: none;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.5rem;
  cursor: pointer;
}
`}</style>
      </div>
    </header>
  );
};

export default TopNavbar;
