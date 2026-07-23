import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FarmerDashboard from './pages/farmer/Dashboard';
import NewReport from './pages/farmer/NewReport';
import ReportDetail from './pages/farmer/ReportDetail';
import ReportHistory from './pages/farmer/ReportHistory';
import ExpertDashboard from './pages/expert/Dashboard';
import ConsultationDetail from './pages/expert/ConsultationDetail';

// Auth
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading KisanSeva...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Farmer Routes */}
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/reports/new"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <NewReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/reports/:id"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <ReportDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/reports"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <ReportHistory />
              </ProtectedRoute>
            }
          />

          {/* Expert Routes (shared for vet + agrologist) */}
          <Route
            path="/expert/dashboard"
            element={
              <ProtectedRoute allowedRoles={['vet', 'agrologist']}>
                <ExpertDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expert/consultations/:id"
            element={
              <ProtectedRoute allowedRoles={['vet', 'agrologist']}>
                <ConsultationDetail />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
