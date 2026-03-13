import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ListDetail } from './pages/ListDetail';
import { Members } from './pages/Members';
import { Profile } from './pages/Profile';
import { JoinPage } from './pages/JoinPage';
import { SetupPage } from './pages/SetupPage';
import { WelcomePage } from './pages/WelcomePage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { ShoppingCart } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, user, inviteId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === 'loading') return;

    // Allow public/setup pages through regardless
    const publicPaths = ['/join', '/setup', '/welcome', '/403'];
    if (publicPaths.some((p) => location.pathname.startsWith(p))) return;

    if (status === 'no_access') {
      navigate('/403', { replace: true });
    } else if (status === 'invite_pending' && inviteId) {
      navigate(`/join?token=${inviteId}`, { replace: true });
    } else if (status === 'setup_needed') {
      navigate('/setup', { replace: true });
    } else if (status === 'ok' && user) {
      // If user has default display name (email prefix), send to welcome
      const emailPrefix = user.email.split('@')[0];
      const isDefaultName = user.display_name === emailPrefix && !user.joined_at;
      // Actually check if the user was just created (joined recently without setting a name)
      // We'll check if they've been on welcome already via URL
      if (location.pathname === '/welcome') return;
    }
  }, [status, user, inviteId, navigate, location.pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-10 h-10 text-green-600 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <AuthGuard>
      <Routes>
        {/* Public / auth pages */}
        <Route path="/join" element={<JoinPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Protected app routes */}
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/lists/:id"
          element={
            <Layout>
              <ListDetail />
            </Layout>
          }
        />
        <Route
          path="/members"
          element={
            <Layout>
              <Members />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <Profile />
            </Layout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGuard>
  );
}
