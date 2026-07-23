import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

interface ProtectedRouteProps {
  allowedRoles?: ('farmer' | 'vet' | 'agrologist')[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size={32} label="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as any)) {
    if (user.role === 'farmer') {
      return <Navigate to="/farmer/dashboard" replace />;
    }
    return <Navigate to="/expert/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
