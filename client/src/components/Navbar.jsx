import React, { useState, useEffect } from 'react';

export default function Navbar() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <a href="/" className="logo" onClick={closeMenu}>
        <span className="logo-dot">●</span>
        <span>dead drop</span>
      </a>
      
      <button className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu} aria-label="Toggle Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
        <a href="#status" className="nav-link" onClick={closeMenu}>Trace</a>
        <a href="#stats" className="nav-link" onClick={closeMenu}>Telemetry</a>
        <a href="#about" className="nav-link" onClick={closeMenu}>Protocol</a>
        <button 
          onClick={() => { toggleTheme(); closeMenu(); }} 
          className="theme-toggle"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
