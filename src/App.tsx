import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/lib/i18n';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import Layout from '@/components/Layout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import MarketplacePage from '@/pages/MarketplacePage';
import LawyerProfilePage from '@/pages/LawyerProfilePage';
import BookingPage from '@/pages/BookingPage';
import AIAssistantPage from '@/pages/AIAssistantPage';
import { ArticlesListPage, ArticleDetailPage } from '@/pages/ArticlesPage';
import DocumentsPage from '@/pages/DocumentsPage';
import EmergencyPage from '@/pages/EmergencyPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import RefundPage from '@/pages/RefundPage';
import FaqPage from '@/pages/FaqPage';
import ClientDashboard from '@/pages/ClientDashboard';
import LawyerDashboard from '@/pages/LawyerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import CallRoomPage from '@/pages/CallRoomPage';
import type { Role } from '@/lib/supabase';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lawyers" element={<ProtectedRoute roles={['client', 'admin']}><MarketplacePage /></ProtectedRoute>} />
        <Route path="/lawyers/:id" element={<ProtectedRoute roles={['client', 'admin']}><LawyerProfilePage /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/articles" element={<ArticlesListPage />} />
        <Route path="/articles/:id" element={<ArticleDetailPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/emergency" element={<ProtectedRoute roles={['client', 'admin']}><EmergencyPage /></ProtectedRoute>} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<Navigate to="/login?portal=admin" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/book/:id" element={<ProtectedRoute roles={['client', 'admin']}><BookingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['client', 'admin']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/lawyer" element={<ProtectedRoute roles={['lawyer', 'admin']}><LawyerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/call/:kind/:roomId" element={<ProtectedRoute roles={['client', 'lawyer', 'admin']}><CallRoomPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
