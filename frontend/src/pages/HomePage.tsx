import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, Shield, Globe, BarChart3, ArrowRight, CheckCircle,
  Star, ChevronRight, Sparkles, Database, Brain, Layers,
  Menu, X, TrendingUp, Users, Award
} from 'lucide-react';

const STATS = [
  { label: 'Products Enriched', value: '12M+', icon: Database },
  { label: 'Accuracy Rate', value: '98.4%', icon: TrendingUp },
  { label: 'Enterprise Clients', value: '340+', icon: Users },
  { label: 'Avg Time Saved', value: '87%', icon: Award },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Classification',
    desc: 'State-of-the-art LLM models automatically classify products into hierarchical taxonomies with industry-leading precision.',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'rgba(139,92,246,0.3)',
  },
  {
    icon: Shield,
    title: 'Brand Intelligence',
    desc: 'Fuzzy-match and resolve manufacturer & brand names across thousands of aliases with configurable confidence thresholds.',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59,130,246,0.3)',
  },
  {
    icon: Layers,
    title: 'Attribute Extraction',
    desc: 'Extract structured product attributes constrained by your LOV schema—ensuring perfect data compliance at scale.',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.3)',
  },
  {
    icon: Sparkles,
    title: 'Description Generation',
    desc: 'Generate 5 SEO-optimized description formats per product—titles, bullets, long-form, rich text, and structured data.',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.3)',
  },
  {
    icon: BarChart3,
    title: 'Confidence Scoring',
    desc: 'Every output carries a transparent confidence score and review flag, so your team knows exactly what needs attention.',
    gradient: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.3)',
  },
  {
    icon: Globe,
    title: 'Enterprise Scale',
    desc: 'Process millions of rows with async batch endpoints, CSV uploads, and real-time pipeline progress tracking.',
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'rgba(99,102,241,0.3)',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'VP of Data, Grainger',
    avatar: 'SM',
    stars: 5,
    text: 'Aunova cut our product onboarding time from 3 weeks to 2 days. The AI classification accuracy is genuinely impressive.',
  },
  {
    name: 'James Okafor',
    role: 'CTO, PartsBridge',
    avatar: 'JO',
    stars: 5,
    text: 'We\'ve tried 4 competitors. Aunova is the only one that handles our industrial parts taxonomy without constant hand-holding.',
  },
  {
    name: 'Priya Sharma',
    role: 'Head of eCommerce, UniDist',
    avatar: 'PS',
    stars: 5,
    text: 'The confidence scoring alone is worth it — our editors know exactly which records to review instead of spot-checking everything.',
  },
];

const PIPELINE_STEPS = [
  { num: '01', title: 'Upload', desc: 'Drop your CSV or send via API', color: '#6172f2' },
  { num: '02', title: 'Resolve', desc: 'Brand & manufacturer normalization', color: '#8b5cf6' },
  { num: '03', title: 'Classify', desc: 'AI hierarchical taxonomy mapping', color: '#10b981' },
  { num: '04', title: 'Extract', desc: 'Attribute extraction with LOV rules', color: '#f59e0b' },
  { num: '05', title: 'Describe', desc: 'Multi-format description generation', color: '#ef4444' },
];

/* ─── Animated counter ─────────────────────────────────────────── */
function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration, start]);
  return count;
}

/* ─── Particle background ──────────────────────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(97,114,242,${p.alpha})`;
        ctx.fill();
      });
      // Draw lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(97,114,242,${0.06 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

export default function HomePage() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface-900 text-gray-100 overflow-x-hidden font-sans">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b border-white/[0.06]"
           style={{ background: 'rgba(10,12,26,0.85)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Aunova</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
          <a href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Testimonials</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25">
              Open Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/signup"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30">
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed top-[72px] left-0 right-0 z-40 p-6 flex flex-col gap-4 border-b border-white/[0.06]"
             style={{ background: 'rgba(10,12,26,0.97)' }}>
          <a href="#features" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pipeline" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#testimonials" className="text-gray-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Testimonials</a>
          {user ? (
            <Link to="/dashboard" className="mt-2 px-4 py-3 rounded-lg bg-brand-500 text-white text-center font-semibold">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-3 rounded-lg border border-white/10 text-center text-gray-300">Sign In</Link>
              <Link to="/signup" className="px-4 py-3 rounded-lg bg-gradient-to-r from-brand-500 to-accent-500 text-white text-center font-semibold">Get Started Free</Link>
            </>
          )}
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <ParticleField />

        {/* Radial glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(97,114,242,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-8 animate-pulse-slow">
            <Sparkles size={14} />
            AI-Powered Product Intelligence
            <ChevronRight size={14} />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Enrich your product data
            <br />
            <span className="gradient-text">with AI precision</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Aunova's intelligent pipeline resolves brands, classifies products, extracts attributes, and
            generates rich descriptions—all in a single automated workflow.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? '/dashboard' : '/signup'}
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold text-base hover:opacity-90 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/30 hover:scale-[1.02]">
              {user ? 'Go to Dashboard' : 'Start for Free'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#pipeline"
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-gray-300 font-semibold text-base hover:border-white/25 hover:text-white transition-all duration-200 hover:bg-white/[0.03]">
              See How It Works
            </a>
          </div>

          {/* Proof badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-500">
            {['No credit card required', 'SOC 2 Compliant', 'GDPR Ready', '99.9% Uptime SLA'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-accent-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1.5 h-3 rounded-full bg-white/40 animate-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 border-y border-white/[0.06]"
               style={{ background: 'linear-gradient(to right, rgba(97,114,242,0.04), rgba(16,185,129,0.04))' }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4 group-hover:bg-brand-500/20 transition-colors">
                <Icon size={22} className="text-brand-400" />
              </div>
              <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/20 bg-brand-500/8 text-brand-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Everything you need to ship
              <br /><span className="gradient-text">perfect product data</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              A complete pipeline that handles every stage of product enrichment—from raw inputs to publication-ready content.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, gradient, glow }) => (
              <div key={title}
                className="glass-card p-6 group hover:scale-[1.02] transition-all duration-300 cursor-default relative overflow-hidden"
                style={{ '--glow': glow } as React.CSSProperties}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                     style={{ background: `radial-gradient(circle at 50% 0%, ${glow} 0%, transparent 60%)` }} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg`}
                     style={{ boxShadow: `0 8px 24px ${glow}` }}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE STEPS ── */}
      <section id="pipeline" className="py-24 px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(16,19,42,0.6), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-500/20 bg-accent-500/8 text-accent-400 text-xs font-semibold uppercase tracking-widest mb-4">
              The Pipeline
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Five stages, <span className="gradient-text">one seamless flow</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Each stage builds on the last, passing enriched data downstream so every subsequent step has full context.
            </p>
          </div>

          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500/0 via-brand-500/40 to-accent-500/0 hidden md:block" />

            <div className="space-y-8">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.num}
                  className={`flex items-start gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} relative`}>
                  {/* Left / right card */}
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <div className="glass-card p-5 inline-block w-full md:max-w-sm hover:border-brand-500/30 transition-all duration-300 group hover:scale-[1.02]"
                         style={{ borderColor: `${step.color}22` }}>
                      <div className="flex items-center gap-3 md:justify-end">
                        <span className="text-3xl font-black"
                              style={{ color: step.color, opacity: 0.6 }}>{step.num}</span>
                        <div>
                          <div className="font-bold text-white">{step.title}</div>
                          <div className="text-xs text-gray-400">{step.desc}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-6 w-4 h-4 rounded-full border-2 z-10"
                       style={{ borderColor: step.color, background: `${step.color}33`, boxShadow: `0 0 12px ${step.color}55` }} />

                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/20 bg-brand-500/8 text-brand-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Trusted by teams who care
              <br /><span className="gradient-text">about data quality</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, avatar, stars, text }) => (
              <div key={name} className="glass-card p-6 hover:scale-[1.01] transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                    {avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="text-xs text-gray-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 relative overflow-hidden animated-border">
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at center, rgba(97,114,242,0.08) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Ready to transform
              <br /><span className="gradient-text">your product catalog?</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join 340+ enterprises already using Aunova to ship accurate, enriched product data at scale.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={user ? '/dashboard' : '/signup'}
                className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold hover:opacity-90 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/30 hover:scale-[1.02]">
                {user ? 'Go to Dashboard' : 'Start Free Today'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login"
                className="px-8 py-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:border-white/25 hover:text-white transition-all duration-200">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">Aunova</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Status</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Docs</a>
          </div>
          <p className="text-xs text-gray-600">© 2025 Aunova. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
