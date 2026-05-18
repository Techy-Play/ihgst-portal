'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Target, Lock, Mail, Eye, EyeOff, ArrowRight, X,
  CheckCircle, BarChart3, Users, Shield, Clock, Zap,
  TrendingUp, FileText, ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="landing-loader"><div className="spinner" /></div>}>
      <LandingContent />
    </Suspense>
  );
}

function LandingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status, router]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    return () => {
      try {
        const stored = localStorage.getItem('theme-preference');
        if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);
        else root.removeAttribute('data-theme');
      } catch {
        root.removeAttribute('data-theme');
      }
    };
  }, []);



  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) setError(res.error);
      else {
        // Fire login event to capture IP + device info server-side
        fetch('/api/auth/login-event', { method: 'POST' }).catch(() => {});
        router.push('/dashboard'); router.refresh();
      }
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  };

  const creds = {
    Admin: { email: 'admin@ihgst.com', pass: 'Admin@123' },
    Manager: { email: 'manager@ihgst.com', pass: 'Manager@123' },
    Manager2: { email: 'manager2@ihgst.com', pass: 'Manager@123' },
    Employee1: { email: 'employee1@ihgst.com', pass: 'Employee@123' },
    Employee2: { email: 'employee2@ihgst.com', pass: 'Employee@123' },
    Employee3: { email: 'employee3@ihgst.com', pass: 'Employee@123' },
  };

  const fillCreds = (role) => {
    setEmail(creds[role].email);
    setPassword(creds[role].pass);
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="landing-loader">
        <div className="spinner" />
      </div>
    );
  }

  const features = [
    { icon: <Target size={24} />, title: 'Goal Setting', desc: 'Create and manage goals with thrust areas, targets, and weighted KPIs aligned to company objectives.' },
    { icon: <CheckCircle size={24} />, title: 'Manager Approval', desc: 'Structured approval workflow — managers review, edit, approve, or return goals with inline feedback.' },
    { icon: <Clock size={24} />, title: 'Quarterly Check-ins', desc: 'Track progress across Q1–Q4 with actual vs. planned metrics and automated progress calculation.' },
    { icon: <BarChart3 size={24} />, title: 'Analytics Dashboard', desc: 'Real-time charts for goal distribution, quarterly trends, and department completion rates.' },
    { icon: <Shield size={24} />, title: 'Audit Trail', desc: 'Complete change history — who modified what and when, ensuring full accountability.' },
    { icon: <Users size={24} />, title: 'Shared Goals', desc: 'Push organization-wide KPIs to all employees — they customize weightage while title and target stay locked.' },
  ];


  return (
    <div className="landing-page">
      {/* Animated background */}
      <div className="landing-bg">
        <div className="landing-bg-orb landing-bg-orb-1" />
        <div className="landing-bg-orb landing-bg-orb-2" />
        <div className="landing-bg-orb landing-bg-orb-3" />
        <div className="landing-grid-pattern" />
      </div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <div className="landing-logo-icon" style={{ padding: 0, overflow: 'hidden' }}>
              <img src="/logo.png" alt="IHGST" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span className="landing-logo-text">IHGST <span className="landing-logo-accent">Portal</span></span>
          </div>
          <button className="landing-login-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} id="hero-login-btn">
            <span>Login</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section — Full-Height Split Login */}
      <section className="landing-hero" style={{ padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'stretch' }}>
        <div className="landing-hero-container" style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
          {/* Left — Clean Login Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 48px', background: 'rgba(10,10,18,0.95)', position: 'relative' }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '6px' }}>Sign <span className="gradient-text">In</span></h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '36px' }}>Welcome to IHGST Performance Portal</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="email" className="input-dark" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: '42px', height: '46px', fontSize: '14px' }} id="login-email" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type={showPassword ? 'text' : 'password'} className="input-dark" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingLeft: '42px', paddingRight: '42px', height: '46px', fontSize: '14px' }} id="login-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>{error}</div>}
                <button type="submit" className="btn-glow" disabled={loading} id="login-submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '13px', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
                  {loading ? <div className="spinner-sm" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
            {/* Subtle branding at bottom */}
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.4 }}>
              <img src="/logo.png" alt="IHGST" style={{ width: 20, height: 20, borderRadius: 5, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>IHGST Portal</span>
            </div>
          </div>
          {/* Right — Hero Branding + Demo Credentials */}
          <div className="landing-hero-right-panel" style={{ flex: 1, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08), rgba(10,10,18,0.95))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
              <div className="landing-hero-badge" style={{ marginBottom: '16px' }}><Zap size={14} /><span>Enterprise Goal Management</span></div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.3, marginBottom: '12px', textAlign: 'center' }}>
                Track Goals.<br /><span className="gradient-text">Drive Performance.</span><br />Achieve Excellence.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, textAlign: 'center', marginBottom: '24px' }}>
                A unified platform for setting, tracking, and reviewing performance goals.
              </p>

              {/* Demo Credentials */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99,102,241,0.12)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', textAlign: 'center' }}>🔐 Demo Credentials — Click to autofill</p>

                {/* Admin */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Admin</p>
                  <button type="button" onClick={() => fillCreds('Admin')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={13} style={{ color: '#f87171' }} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Admin User</span><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HR</span></span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>admin@ihgst.com</span>
                  </button>
                </div>

                {/* Managers */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Managers</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[{ name: 'Rahul Sharma', key: 'Manager', dept: 'Engineering' }, { name: 'Anita Desai', key: 'Manager2', dept: 'Marketing' }].map(m => (
                      <button key={m.key} type="button" onClick={() => fillCreds(m.key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.12)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={13} style={{ color: '#60a5fa' }} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.dept}</span></span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{creds[m.key].email}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employees */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Employees</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[{ name: 'Priya Patel', key: 'Employee1', dept: 'Engineering' }, { name: 'Amit Kumar', key: 'Employee2', dept: 'Engineering' }, { name: 'Sneha Gupta', key: 'Employee3', dept: 'Marketing' }].map(emp => (
                      <button key={emp.key} type="button" onClick={() => fillCreds(emp.key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={13} style={{ color: '#34d399' }} /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.dept}</span></span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{creds[emp.key].email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="landing-section-subtitle">
            A simple, structured lifecycle from goal creation to final review.
          </p>
          <div className="landing-flow">
            {[
              { step: '01', title: 'Create Goals', desc: 'Employees set goals with targets and weightage' },
              { step: '02', title: 'Submit for Review', desc: 'Goals are sent to the manager for approval' },
              { step: '03', title: 'Manager Approves', desc: 'Manager reviews, edits, and approves goals' },
              { step: '04', title: 'Track Progress', desc: 'Quarterly check-ins with actual achievements' },
              { step: '05', title: 'Analyze & Report', desc: 'Dashboards and exportable reports for HR' },
            ].map((item, i) => (
              <div key={i} className="landing-flow-item">
                <div className="landing-flow-step">{item.step}</div>
                <h3 className="landing-flow-title">{item.title}</h3>
                <p className="landing-flow-desc">{item.desc}</p>
                {i < 4 && <div className="landing-flow-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section landing-section-dark" id="features">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p className="landing-section-subtitle">
            Everything you need to manage employee performance — no spreadsheets, no emails, no paper.
          </p>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div key={i} className="landing-feature-card glass-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Validation Rules */}
      <section className="landing-section" id="validation">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">
            Built-in <span className="gradient-text">Validation</span>
          </h2>
          <p className="landing-section-subtitle">
            Smart rules enforce data quality at every step.
          </p>
          <div className="landing-rules-grid">
            {[
              { icon: '🎯', title: 'Weightage = 100%', desc: 'Total across all goals must equal exactly 100%' },
              { icon: '📊', title: 'Min 10% Per Goal', desc: 'Each goal must carry at least 10% weightage' },
              { icon: '🔒', title: 'Max 8 Goals', desc: 'Employees can create up to 8 goals per cycle' },
              { icon: '✅', title: 'Lock on Approval', desc: 'Approved goals cannot be edited — only admin can unlock' },
            ].map((rule, i) => (
              <div key={i} className="landing-rule-card glass-card">
                <span className="landing-rule-emoji">{rule.icon}</span>
                <h3 className="landing-rule-title">{rule.title}</h3>
                <p className="landing-rule-desc">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="landing-section landing-section-dark" id="roles">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">
            Role-Based <span className="gradient-text">Access</span>
          </h2>
          <div className="landing-roles-grid">
            {[
              { role: 'Employee', icon: <Users size={28} />, color: '#34d399', items: ['Create & edit goals', 'Submit for approval', 'Update quarterly progress', 'View personal analytics'] },
              { role: 'Manager', icon: <Shield size={28} />, color: '#60a5fa', items: ['Review team goals', 'Approve / reject / edit', 'Conduct quarterly check-ins', 'Team performance overview'] },
              { role: 'Admin / HR', icon: <FileText size={28} />, color: '#f87171', items: ['Manage cycles & users', 'Unlock locked goals', 'Export reports via email', 'Full audit trail access'] },
            ].map((r, i) => (
              <div key={i} className="landing-role-card glass-card">
                <div className="landing-role-icon" style={{ background: `${r.color}20`, color: r.color }}>{r.icon}</div>
                <h3 className="landing-role-name">{r.role}</h3>
                <ul className="landing-role-list">
                  {r.items.map((item, j) => (
                    <li key={j}><CheckCircle size={14} style={{ color: r.color, flexShrink: 0 }} /> {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section landing-cta-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="landing-section-title">
            Ready to <span className="gradient-text">Get Started?</span>
          </h2>
          <p className="landing-section-subtitle" style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
            Log in with your credentials and start tracking your goals today.
          </p>
          <button className="btn-glow landing-hero-cta" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} id="cta-login-btn">
            Login Now
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-logo-icon" style={{ width: 32, height: 32, borderRadius: 8, padding: 0, overflow: 'hidden' }}>
              <img src="/logo.png" alt="IHGST" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>IHGST Portal</span>
          </div>
          <p className="landing-footer-text">
            In-House Goal Setting & Tracking — Enterprise Performance Management
          </p>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} IHGST Portal. Built for the Atomberg Hackathon.
          </p>
        </div>
      </footer>


    </div>
  );
}
