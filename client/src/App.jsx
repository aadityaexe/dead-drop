import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import CreateDrop from './components/CreateDrop'
import DropResult from './components/DropResult'
import ReadDrop from './components/ReadDrop'

function App() {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    
    // Prevent context menu (right click)
    document.addEventListener('contextmenu', preventDefault);

    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // F12, Inspect, View Source, Print, Save
      if (e.keyCode === 123) e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) e.preventDefault();
      if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 80 || e.keyCode === 83)) e.preventDefault();

      // Select All, Copy (block unless typing in an input)
      if (!isInput && e.ctrlKey && (e.keyCode === 65 || e.keyCode === 67)) {
        e.preventDefault();
      }

      // PrintScreen (clear clipboard as a deterrent)
      if (e.keyCode === 44) {
        navigator.clipboard.writeText('Screenshots disabled');
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Anti-Screenshot / Anti-Recording Blur
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {isBlurred && (
        <div className="security-overlay">
          <h2>Secure Display</h2>
          <p>Window is unfocused. Content hidden to prevent capture.</p>
        </div>
      )}
      <Navbar />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<CreateDrop />} />
          <Route path="/drop/created" element={<DropResult />} />
          <Route path="/drop/:id" element={<ReadDrop />} />
        </Routes>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">DEAD DROP</span>
            <div className="footer-tagline">Zero knowledge. No accounts. No logs.</div>
          </div>
          
          <div className="footer-socials">
            <span className="footer-label">Connect</span>
            <div className="footer-links">
              <a href="https://github.com/aadityaexe" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://x.com/aadityakumar_01" target="_blank" rel="noreferrer">X</a>
              <a href="https://www.linkedin.com/in/aadityaexe" target="_blank" rel="noreferrer">LinkedIn</a>
              <a href="https://www.instagram.com/adityakumar.01" target="_blank" rel="noreferrer">Instagram</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Aditya Kumar</span>
          <span className="footer-version">SYS.VER: 1.0.0</span>
        </div>
      </footer>
    </>
  )
}

export default App
