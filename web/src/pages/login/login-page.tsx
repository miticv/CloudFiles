import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useAuth, AuthBlockedError } from '@/auth/auth-context';
import { useOidc } from '@/auth/oidc-provider';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Cloud, Mail, Lock, User, Chrome, Building2, MailCheck, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'register' | 'check-email';

export function Component() {
  usePageTitle('Sign In');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAuth();
  const oidc = useOidc();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [blockedCode, setBlockedCode] = useState<string | null>(null);

  // Handle URL params from email confirmation redirect or OAuth error
  useEffect(() => {
    const status = searchParams.get('status');
    const oauthError = searchParams.get('oauthError');

    if (status === 'email_confirmed') {
      setSuccess('Email confirmed! Your account is now pending admin activation. You\'ll be notified when activated.');
      setSearchParams({}, { replace: true });
    } else if (status === 'token_expired') {
      setError('Your confirmation link has expired or is invalid.');
      setBlockedCode('email_not_confirmed');
      setSearchParams({}, { replace: true });
    } else if (oauthError === 'pending_approval') {
      setInfo('Your account is pending admin activation. Please check back later.');
      setSearchParams({}, { replace: true });
    } else if (oauthError === 'email_not_confirmed') {
      setError('Please confirm your email address first.');
      setBlockedCode('email_not_confirmed');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function redirectAfterLogin() {
    const redirect = localStorage.getItem('redirect');
    localStorage.removeItem('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.includes('//')) {
      navigate(redirect);
    } else {
      navigate('/connections');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInfo(null);
    setBlockedCode(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await auth.login(email, password);
        redirectAfterLogin();
      } else {
        await auth.register(email, displayName, password);
        // Brief pause so user sees the success message
        setSuccess('Account created! Redirecting...');
        setTimeout(() => redirectAfterLogin(), 800);
      }
    } catch (err) {
      if (err instanceof AuthBlockedError) {
        if (err.code === 'email_confirmation_required') {
          setResendEmail(email);
          setMode('check-email');
        } else if (err.code === 'email_not_confirmed') {
          setError('Please confirm your email address first.');
          setBlockedCode('email_not_confirmed');
          setResendEmail(email);
        } else if (err.code === 'pending_approval') {
          setInfo('Your account is pending admin activation. Please check back later.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await auth.resendConfirmation(resendEmail);
      setSuccess('A new confirmation email has been sent. Please check your inbox.');
      setError(null);
    } catch {
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  function handleOAuthLogin(provider: 'google' | 'azure') {
    auth.setOAuthPending(provider);
    oidc.login(provider);
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setSuccess(null);
    setInfo(null);
    setBlockedCode(null);
  }

  function backToLogin() {
    setMode('login');
    setError(null);
    setSuccess(null);
    setInfo(null);
    setBlockedCode(null);
  }

  // Check-email screen
  if (mode === 'check-email') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-slate-100">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white mb-4 shadow-lg">
                <MailCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Check your email
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We've sent a confirmation link to
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{resendEmail}</p>
            </div>

            <div className="bg-card rounded-xl shadow-[var(--shadow-card)] border border-border p-6 space-y-5">
              {success && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-3">
                <p>Click the link in the email to confirm your account. The link expires in 24 hours.</p>
                <p>After confirming, an admin will activate your account. You'll be able to sign in once activated.</p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10"
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <>
                      <Spinner size={16} />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Resend confirmation email</span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="py-6 text-center text-xs text-muted-foreground space-x-4">
          <span>&copy; {new Date().getFullYear()} CloudFiles</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-slate-100">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo and heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
              <Cloud className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to manage your cloud files'
                : 'Get started with CloudFiles'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-xl shadow-[var(--shadow-card)] border border-border p-6 space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 relative"
                onClick={() => handleOAuthLogin('google')}
              >
                <Chrome className="w-4 h-4 mr-2 text-red-500" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 relative"
                onClick={() => handleOAuthLogin('azure')}
              >
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Continue with Microsoft
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with email
              </span>
            </div>

            {/* Error / Success / Info Messages */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
                <p>{error}</p>
                {blockedCode === 'email_not_confirmed' && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="text-red-800 font-medium underline underline-offset-2 hover:text-red-900 transition-colors cursor-pointer"
                  >
                    {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}
            {info && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                {info}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={16} className="text-primary-foreground" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                )}
              </Button>
            </form>

            {/* Toggle mode */}
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground space-x-4">
        <span>&copy; {new Date().getFullYear()} CloudFiles</span>
        <Link to="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}

export { Component as LoginPage };
export default Component;
