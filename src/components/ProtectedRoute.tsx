import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { isEmailAuthorized } from '../lib/security';

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userEmail = session.user.email || '';
        if (userEmail && !isEmailAuthorized(userEmail)) {
          // Reject and sign out unauthorized user
          await supabase.auth.signOut();
          setAuthenticated(false);
        } else {
          setAuthenticated(true);
        }
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const userEmail = session.user.email || '';
        if (userEmail && !isEmailAuthorized(userEmail)) {
          await supabase.auth.signOut();
          setAuthenticated(false);
        } else {
          setAuthenticated(true);
        }
      } else {
        setAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <Navigate to="/setup" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-300"></div>
      </div>
    );
  }

  return authenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

