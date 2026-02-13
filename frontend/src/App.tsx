import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Analytics from './pages/Analytics';
import OwnerDashboard from './pages/OwnerDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/employee/*" element={<EmployeeDashboard />} />
        <Route path="/analytic" element={<Analytics />} />
        <Route path="/owner" element={<OwnerDashboard />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}

export default App;
