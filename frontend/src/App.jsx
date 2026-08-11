import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Chatbot } from './components/Chatbot';
import { RequireAuth } from './components/RequireAuth';
import { LandingPage } from './modules/landing/LandingPage';
import { AuthPage } from './modules/auth/AuthPage';
import { Dashboard } from './modules/dashboard/Dashboard';
import { AnalyticsPage } from './modules/analytics/AnalyticsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/analytics"
              element={
                <RequireAuth>
                  <AnalyticsPage />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
        <Chatbot />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
