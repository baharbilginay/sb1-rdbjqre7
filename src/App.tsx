import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { UserApp } from './pages/UserApp';
import { AdminLogin } from './pages/AdminLogin';
import { AdminApp } from './pages/AdminApp';
import { useAdmin } from './hooks/useAdmin';
import { useTheme } from './lib/theme';
import { NotificationToast } from './components/NotificationToast';
import { useNotifications } from './lib/notifications';
import './styles/theme.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const { theme } = useTheme();
  const { addNotification } = useNotifications();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // Define window functions
    window.registerClick = function() {
      setAuthMode('register');
      setShowAuthModal(true);
    };

    window.loginClick = function() {
      setAuthMode('login');
      setShowAuthModal(true);
    };

    // Cleanup
    return () => {
      delete window.registerClick;
      delete window.loginClick;
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className={theme}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin" element={
            user && isAdmin ? (
              <AdminApp />
            ) : (
              <AdminLogin />
            )
          } />

          {/* User Routes */}
          <Route path="/*" element={
            <UserApp 
              user={user} 
              showAuthModal={showAuthModal}
              setShowAuthModal={setShowAuthModal}
              authMode={authMode}
            />
          } />
        </Routes>

        {/* Global Notifications */}
        <NotificationToast />
      </div>
    </Router>
  );
}

export default App;

// Add global type definitions
declare global {
  interface Window {
    registerClick: () => void;
    loginClick: () => void;
  }
}