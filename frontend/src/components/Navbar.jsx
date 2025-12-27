import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ role, onLogout, theme = 'dark', onToggleTheme }) => {
  const location = useLocation();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">CAMS</span>
        <span className="navbar-title">Attendance Management System</span>
      </div>
      <div className="navbar-right">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        {role ? (
          <>
            <span className="navbar-role">Role: {role}</span>
            {location.pathname !== '/login' && (
              <button className="btn btn-secondary" onClick={onLogout}>
                Logout
              </button>
            )}
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;