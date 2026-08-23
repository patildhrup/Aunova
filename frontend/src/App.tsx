import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute';
import CustomCursor from '@/components/customCursor';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import { Dashboard } from '@/pages/Dashboard';
import NotFound from '@/pages/notFound';
import './index.css';

function App() {
  return (
    <AuthProvider>
      {/* Global custom cursor — renders on every page */}
      <CustomCursor />

      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<HomePage />} />

          {/* Auth pages — redirect to dashboard if already logged in */}
          <Route path="/login" element={
            <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
          } />
          <Route path="/signup" element={
            <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>
          } />

          {/* Protected dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
