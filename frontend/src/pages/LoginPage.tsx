import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Zap, Eye, EyeOff, Mail, Lock, ArrowRight,
  AlertCircle, Loader2, CheckCircle
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg.includes('Invalid') ? 'Invalid email or password' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    setGoogleLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Enter your email above first'); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0a0c1a 0%, #10132a 50%, #181c38 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 70% 60%, rgba(16,185,129,0.12) 0%, transparent 60%)' }} />

        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Aunova</span>
        </Link>

        <div className="relative">
          <div className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Welcome back to<br />
            <span className="gradient-text">your pipeline</span>
          </div>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Sign in to access your product enrichment dashboard and continue transforming your catalog.
          </p>

          {/* Decorative stat cards */}
          <div className="space-y-3">
            {[
              { label: 'Products processed today', value: '48,291', color: '#6172f2' },
              { label: 'Current pipeline accuracy', value: '98.4%', color: '#10b981' },
              { label: 'Avg. enrichment time', value: '2.3s', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-gray-600">© 2025 Aunova. All rights reserved.</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-white">Aunova</span>
          </Link>

          {!forgotMode ? (
            <>
              <h2 className="text-3xl font-extrabold text-white mb-1">Sign in</h2>
              <p className="text-gray-400 mb-8 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Create one free</Link>
              </p>

              {/* Google */}
              <button id="google-login-btn" onClick={handleGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white font-medium text-sm transition-all duration-200 hover:border-white/20 mb-6 disabled:opacity-50">
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative flex items-center mb-6">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="px-3 text-xs text-gray-600">or continue with email</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" id="login-form">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Password</label>
                    <button type="button" onClick={() => setForgotMode(true)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button id="login-submit-btn" type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          ) : (
            /* ─── Forgot password mode ─── */
            <div>
              <button onClick={() => { setForgotMode(false); setResetSent(false); setError(''); }}
                className="text-xs text-gray-500 hover:text-gray-300 mb-8 flex items-center gap-1 transition-colors">
                ← Back to sign in
              </button>

              {resetSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={28} className="text-accent-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
                  <p className="text-gray-400 text-sm">
                    We sent a password reset link to <span className="text-brand-400">{email}</span>.
                    Check your spam folder if you don't see it.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-extrabold text-white mb-2">Reset password</h2>
                  <p className="text-gray-400 text-sm mb-8">
                    Enter your email and we'll send you a reset link.
                  </p>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                      <AlertCircle size={15} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4" id="forgot-password-form">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          id="forgot-email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                          onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                        />
                      </div>
                    </div>

                    <button id="forgot-submit-btn" type="submit" disabled={resetLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                      {resetLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
