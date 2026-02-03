import DashboardLayout from '../layouts/DashboardLayout';
import QuickActions from '../components/dashboard/QuickActions';
import ActiveBattles from '../components/dashboard/ActiveBattles';
import ActiveSessions from '../components/dashboard/ActiveSessions';
import UpcomingBookings from '../components/dashboard/UpcomingBookings';

const EmployeeDashboard = () => {
    return (
        <DashboardLayout>
            <div className="dashboard-content">
                <QuickActions />
                <ActiveSessions />
                <ActiveBattles />
                <UpcomingBookings />

                {/* Footer/Copyright if needed */}
                <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    &copy; 2024 Thunder Gaming Cafe Management System
                </footer>
            </div>
        </DashboardLayout>
    );
};

export default EmployeeDashboard;
