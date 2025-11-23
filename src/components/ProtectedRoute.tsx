
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'user' | 'responder' | 'hospital';
}

export const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to appropriate auth page based on required type
        if (requiredUserType === 'responder') {
          navigate('/auth/responder', { replace: true });
        } else if (requiredUserType === 'hospital') {
          navigate('/auth/hospital', { replace: true });
        } else {
          navigate('/auth/user', { replace: true });
        }
        return;
      }

      if (requiredUserType && profile?.user_type !== requiredUserType) {
        // Redirect to appropriate auth page based on required type
        if (requiredUserType === 'responder') {
          navigate('/auth/responder', { replace: true });
        } else if (requiredUserType === 'hospital') {
          navigate('/auth/hospital', { replace: true });
        } else {
          navigate('/auth/user', { replace: true });
        }
        return;
      }

      // Redirect to appropriate dashboard if authenticated but on wrong page
      if (profile?.user_type === 'user' && (window.location.pathname === '/dashboard/responder' || window.location.pathname === '/dashboard/hospital')) {
        navigate('/dashboard/user', { replace: true });
      } else if (profile?.user_type === 'responder' && (window.location.pathname === '/dashboard/user' || window.location.pathname === '/dashboard/hospital')) {
        navigate('/dashboard/responder', { replace: true });
      } else if (profile?.user_type === 'hospital' && (window.location.pathname === '/dashboard/user' || window.location.pathname === '/dashboard/responder')) {
        navigate('/dashboard/hospital', { replace: true });
      }
    }
  }, [user, profile, loading, navigate, requiredUserType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (requiredUserType && profile?.user_type !== requiredUserType)) {
    return null;
  }

  return <>{children}</>;
};
