import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Calendar, LogIn, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="nav">
      <Link className="brand" to="/">
        <Stethoscope size={24} /> SAWS
      </Link>
      <div className="nav-actions">
        <Link to="/">Home</Link>
        {user && (
          <Link to="/dashboard">
            <Calendar size={16} /> Dashboard
          </Link>
        )}
        {user && (
          <Link to="/analytics">
            <BarChart3 size={16} /> Analytics
          </Link>
        )}
        {!user ? (
          <Link className="primary small" to="/auth">
            <LogIn size={16} /> Login
          </Link>
        ) : (
          <button onClick={handleLogout} type="button">
            Logout {user.displayName || user.userId}
          </button>
        )}
      </div>
    </nav>
  );
}
