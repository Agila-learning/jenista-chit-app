import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import type { UserRole } from '../../store/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export const ProtectedRoute = ({ allowedRoles, requiredPermission }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-secondary-50">Loading...</div>;
  }

  if (!isAuthenticated) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin-login" state={{ from: location }} replace />;
    }
    return <Navigate to="/customer-login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role mismatch, maybe redirect to their specific dashboard or unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
