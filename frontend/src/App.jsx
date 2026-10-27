import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CalendarPlus, LayoutDashboard, LifeBuoy, Clock, Globe, Mail, ClipboardList, Menu, X } from 'lucide-react';

import CustomerBooking from './pages/CustomerBooking';
import BusinessDashboard from './pages/BusinessDashboard';
import Support from './pages/Support';
import ManageBookings from './pages/ManageBookings'; 

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="nav-header">
        <Link to="/" className="nav-brand" onClick={closeMenu}>
          <div className="brand-icon-box">
            <Clock size={20} />
          </div>
          <h1>SmartQueue</h1>
        </Link>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMenu}> <CalendarPlus size={18} /> Book </Link> <Link to="/manage" className={`nav-link ${location.pathname === '/manage' ? 'active' : ''}`} onClick={closeMenu}>
          <ClipboardList size={18} /> Manage
        </Link>
        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={closeMenu}> <LayoutDashboard size={18} /> Dashboard </Link> <Link to="/support" className={`nav-link ${location.pathname === '/support' ? 'active' : ''}`} onClick={closeMenu}>
          <LifeBuoy size={18} /> Support
        </Link>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div>
          <p className="footer-text">© {new Date().getFullYear()} SmartQueue Systems. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#" className="footer-link" aria-label="Website"><Globe size={20} /></a>
          <a href="mailto:support@smartqueue.com" className="footer-link" aria-label="Email"><Mail size={20} /></a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navigation />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CustomerBooking />} />
            <Route path="/manage" element={<div className="container"><ManageBookings /></div>} />
            <Route path="/dashboard" element={<div className="container"><BusinessDashboard /></div>} />
            <Route path="/support" element={<div className="container"><Support /></div>} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}