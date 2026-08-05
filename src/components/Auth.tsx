import React, { useState, FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Auth: React.FC = () => {
  const { signIn, resetPassword } = useAuth();

  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFormState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetFormState();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);

    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(
  'Password reset is unavailable in frontend-only mode.'
     );
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: 'var(--bg-app, #0f172a)' }}
    >
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '50vw',
            height: '50vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '50vw',
            height: '50vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md relative z-10 p-6 lg:p-8"
        style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.95))',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-w10, rgba(255, 255, 255, 0.1))',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Logo & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/20 mb-3">
            <span className="text-base font-black tracking-tight">JS</span>
          </div>
          <h1 className="font-bold text-xl lg:text-2xl tracking-wider text-white italic font-serif leading-tight">
            JAI SHIV <span className="not-italic font-sans font-black text-blue-600 dark:text-blue-500">BMS</span>
          </h1>
          <span
            className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              background: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              padding: '2px 10px',
              borderRadius: '99px',
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            Internal Management System
          </span>
        </div>

        {!isForgotPasswordView ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-email"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(209,209,209,0.7))', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@jaishivbms.local"
                required
                style={{
                  background: 'var(--bg-input, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border-w10, rgba(255,255,255,0.1))',
                  borderRadius: '12px',
                  color: 'var(--text-main, #fff)',
                  fontSize: '14px',
                  padding: '12px 16px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(209,209,209,0.7))', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordView(true);
                    resetFormState();
                  }}
                  className="text-[11px] font-semibold text-blue-500 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-input, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border-w10, rgba(255,255,255,0.1))',
                    borderRadius: '12px',
                    color: 'var(--text-main, #fff)',
                    fontSize: '14px',
                    padding: '12px 48px 12px 16px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Errors / Success */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading
                  ? 'rgba(37,99,235,0.5)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
            <div className="text-center mb-1">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-500" />
                Reset Password
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered email address to receive password reset instructions.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reset-email"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, rgba(209,209,209,0.7))', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@jaishivbms.local"
                required
                style={{
                  background: 'var(--bg-input, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border-w10, rgba(255,255,255,0.1))',
                  borderRadius: '12px',
                  color: 'var(--text-main, #fff)',
                  fontSize: '14px',
                  padding: '12px 16px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Errors / Success */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading
                  ? 'rgba(37,99,235,0.5)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Send Password Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordView(false);
                resetFormState();
              }}
              className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition mt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Authorized Access Only
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
