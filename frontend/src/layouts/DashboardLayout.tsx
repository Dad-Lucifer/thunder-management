import type { ReactNode } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import TopNavbar from '../components/dashboard/TopNavbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <TopNavbar />
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-dark);
        }

        .main-content {
          flex: 1;
          margin-left: 260px; /* Sidebar width */
          display: flex;
          flex-direction: column;
          width: calc(100% - 260px);
        }

        .content-wrapper {
          padding: 2rem;
          flex: 1;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .main-content {
            margin-left: 80px; /* Collapsed sidebar width if we implement it, or just use overlay */
            width: calc(100% - 80px);
          }
          /* This is a placeholder for responsive sidebar behavior. 
             Ideally sidebar would collapse or become a drawer. 
             For now, relying on Sidebar styles adjusting or staying fixed. */
        }
        
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            width: 100%;
          }
          /* Sidebar would need to be hidden/toggled here */
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
