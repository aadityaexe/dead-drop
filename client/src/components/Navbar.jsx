import React, { useState, useEffect } from 'react';

export default function Navbar() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav className="navbar">
      <a href="/" className="logo">
        <span className="logo-dot">●</span>
        <span>dead drop</span>
      </a>
      <div className="nav-links">
        <a href="#status" className="nav-link">Trace</a>
        <a href="#stats" className="nav-link">Telemetry</a>
        <a href="#about" className="nav-link">Protocol</a>
        <button 
          onClick={toggleTheme} 
          className="theme-toggle"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
