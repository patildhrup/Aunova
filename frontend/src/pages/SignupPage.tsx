import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Zap, Eye, EyeOff, Mail, Lock, User, ArrowRight,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

type Step = 'form' | 'otp';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Errors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/* ─── Password strength ─────────────────────────────────────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good', color: '#6172f2' };
  return { score, label: 'Strong', color: '#10b981' };
}

/* ─── OTP Input ─────────────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('');

  const handleChange = (i: number, ch: string) => {
    const d = ch.replace(/\D/g, '').slice(-1);
    const arr = digits.slice();
    arr[i] = d;
    const next = arr.join('');
    onChange(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text.padEnd(6, ''));
    inputs.current[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none focus:scale-105"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: digits[i] ? '#6172f2' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            boxShadow: digits[i] ? '0 0 12px rgba(97,114,242,0.3)' : 'none',
          }}
          id={`otp-digit-${i}`}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pwStrength = getPasswordStrength(form.password);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const validate = (): boolean => {
    const errs: Errors = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Letters, numbers and underscores only';

    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters';

    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      // Check username uniqueness via Supabase profiles table
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username)
        .maybeSingle();

      if (existing) {
        setErrors({ username: 'Username is already taken' });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { username: form.username },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      setStep('otp');
      setResendCooldown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setOtpError('Enter the 6-digit code'); return; }
    setOtpLoading(true);
    setOtpError('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email,
        token: otp,
        type: 'signup',
      });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code';
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email: form.email });
    if (!error) setResendCooldown(60);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setErrors({ general: error.message });
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0a0c1a 0%, #10132a 50%, #181c38 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(97,114,242,0.15) 0%, transparent 60%)' }} />

        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Aunova</span>
        </Link>

        <div className="relative">
          <div className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Start enriching<br />
            <span className="gradient-text">product data today</span>
          </div>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Join 340+ enterprises running Aunova's AI pipeline to transform raw SKUs into publication-ready product content.
          </p>

          {/* Feature list */}
          {[
            'Unique username & secure authentication',
            'AI-powered 4-stage enrichment pipeline',
            '98.4% classification accuracy guarantee',
            'Real-time confidence scoring & review flags',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 mb-3">
              <CheckCircle size={16} className="text-accent-500 shrink-0" />
              <span className="text-sm text-gray-300">{f}</span>
            </div>
          ))}
        </div>

        <p className="relative text-xs text-gray-600">© 2025 Aunova. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">

          {step === 'form' ? (
            <>
              {/* Mobile logo */}
              <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                  <Zap size={15} className="text-white" />
                </div>
                <span className="font-bold text-white">Aunova</span>
              </Link>

              <h2 className="text-3xl font-extrabold text-white mb-1">Create your account</h2>
              <p className="text-gray-400 mb-8 text-sm">
                Already have one?{' '}
                <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
              </p>

              {/* Google button */}
              <button id="google-signup-btn" onClick={handleGoogle} disabled={googleLoading}
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
                <span className="px-3 text-xs text-gray-600">or sign up with email</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* General error */}
              {errors.general && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  <AlertCircle size={15} className="shrink-0" />
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4" id="signup-form">
                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="signup-username"
                      type="text"
                      autoComplete="username"
                      placeholder="john_doe"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${errors.username ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.username ? '#ef4444' : 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                  {errors.username && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{errors.username}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${errors.email ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.email ? '#ef4444' : 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="signup-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${errors.password ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.password ? '#ef4444' : 'rgba(255,255,255,0.08)')}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                               style={{ background: i <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${errors.confirmPassword ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#6172f2')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.confirmPassword ? '#ef4444' : 'rgba(255,255,255,0.08)')}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-accent-500" />
                    )}
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{errors.confirmPassword}</p>}
                </div>

                <button id="signup-submit-btn" type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                </button>

                <p className="text-xs text-gray-600 text-center">
                  By signing up, you agree to our{' '}
                  <a href="#" className="text-brand-400 hover:text-brand-300">Terms</a> and{' '}
                  <a href="#" className="text-brand-400 hover:text-brand-300">Privacy Policy</a>
                </p>
              </form>
            </>
          ) : (
            /* ── OTP Step ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
                <Mail size={28} className="text-brand-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm mb-2">
                We sent a 6-digit verification code to
              </p>
              <p className="text-brand-400 font-medium mb-8">{form.email}</p>

              {otpError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  <AlertCircle size={15} className="shrink-0" />
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6" id="otp-form">
                <OtpInput value={otp} onChange={setOtp} />

                <button id="otp-verify-btn" type="submit" disabled={otpLoading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                  {otpLoading ? <Loader2 size={18} className="animate-spin" /> : <>Verify Email <CheckCircle size={16} /></>}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-500">
                Didn't receive the code?{' '}
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-brand-400 hover:text-brand-300 font-medium disabled:text-gray-600 disabled:cursor-not-allowed transition-colors">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <button onClick={() => setStep('form')} className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors">
                ← Back to signup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
