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



  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) setError(res.error);
      else { router.push('/dashboard'); router.refresh(); }
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  };

  const creds = {
    Admin: { email: 'admin@ihgst.com', pass: 'Admin@123' },
    Manager: { email: 'manager@ihgst.com', pass: 'Manager@123' },
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

  const stats = [
    { value: '100%', label: 'Weightage Validation' },
    { value: '4', label: 'Quarterly Check-ins' },
    { value: '3', label: 'User Roles' },
    { value: '∞', label: 'Audit Records' },
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

      {/* Hero Section — Split Login */}
      <section className="landing-hero" style={{ padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(18,18,26,0.7)', backdropFilter: 'blur(20px)', minHeight: '560px' }}>
          {/* Left — Login Form */}
          <div style={{ flex: 1, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Sign <span className="gradient-text">In</span></h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Welcome to IHGST Performance Portal</p>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="input-dark" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: '38px' }} id="login-email" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} className="input-dark" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingLeft: '38px', paddingRight: '38px' }} id="login-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '12px' }}>{error}</div>}
              <button type="submit" className="btn-glow" disabled={loading} id="login-submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', padding: '11px', opacity: loading ? 0.7 : 1 }}>
                {loading ? <div className="spinner-sm" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
              </button>
            </form>
            <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Credentials</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.keys(creds).map((role) => (
                  <button key={role} type="button" onClick={() => fillCreds(role)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', width: '100%' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{role}</span>
                    <span>{creds[role].email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Right — Branding Panel */}
          <div className="landing-hero-right-panel" style={{ flex: 1, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div className="landing-hero-badge" style={{ marginBottom: '20px' }}><Zap size={14} /><span>Enterprise Goal Management</span></div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.3, marginBottom: '16px' }}>
                Track Goals.<br /><span className="gradient-text">Drive Performance.</span><br />Achieve Excellence.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '360px' }}>
                A unified platform for setting, tracking, and reviewing performance goals with structured workflows and real-time analytics.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '32px' }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <span className="gradient-text" style={{ fontSize: '24px', fontWeight: 800, display: 'block' }}>{s.value}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
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
