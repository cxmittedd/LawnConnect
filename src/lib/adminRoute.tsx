import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Security Note: This component protects admin routes.
 * Client-side role verification is for UX only - the actual security is enforced
 * by Row Level Security (RLS) policies on all admin tables using has_role(auth.uid(), 'admin').
 * Even if this component is bypassed, unauthorized users see empty UI because
 * RLS blocks all admin data access server-side.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Verify admin role via RLS-protected query
    const checkAdminRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error || !data) {
        // Not an admin - redirect silently without revealing admin routes exist
        navigate('/dashboard', { replace: true });
        return;
      }

      setIsAdmin(true);
    };

    checkAdminRole();
  }, [user, authLoading, navigate]);

  // Show loading while checking auth or admin status
  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
}