import React from 'react';
import { LifeBuoy, Mail, Phone } from 'lucide-react';

export default function Support() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', background: '#eff6ff', color: 'var(--primary)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
          <LifeBuoy size={48} />
        </div>
        <h2>How can we help you?</h2>
        <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '1.1rem' }}>
          Whether you have a question about booking an appointment, managing your schedule, or need technical assistance, our team is here to help.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '2rem auto 0' }}>
        
        {/* Email Support Card */}
        <div 
          style={{ padding: '2.5rem 2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'var(--surface)' }} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div>
            <Mail size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3>Email Support</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Send us a detailed message and we'll reply within 24 hours.</p>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '600' }}>support@smartqueue.com</h4>
          </div>
          <a href="mailto:support@smartqueue.com" className="btn btn-outline" style={{ textDecoration: 'none', alignSelf: 'center', padding: '0.5rem 2rem' }}>
            Send Email
          </a>
        </div>

        {/* Phone Support Card */}
        <div 
          style={{ padding: '2.5rem 2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'var(--surface)' }} 
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} 
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div>
            <Phone size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3>Phone Support</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Call us directly for urgent matters during business hours.</p>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '600' }}>+1 (234) 567-890</h4>
          </div>
          <a href="tel:+1234567890" className="btn btn-outline" style={{ textDecoration: 'none', alignSelf: 'center', padding: '0.5rem 2rem' }}>
            Call Now
          </a>
        </div>

      </div>
    </div>
  );
}