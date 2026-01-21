import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../base/Button';

export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const { signIn, signUp, signInWithGoogle, user, loading, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const storedRedirect = localStorage.getItem('auth_redirect');
  const locationRedirect = typeof location.state?.from === 'string'
    ? location.state.from
    : location.state?.from?.pathname;
  const redirectTo = storedRedirect || locationRedirect || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      if (storedRedirect) {
        localStorage.removeItem('auth_redirect');
      }
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo, storedRedirect]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Add env vars to enable auth.');
      return;
    }

    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!isLogin && !result?.session) {
        setNoticeMessage('Check your email to confirm your account before logging in.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to continue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setNoticeMessage('');

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Add env vars to enable auth.');
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.setItem('auth_redirect', redirectTo);
      await signInWithGoogle(`${window.location.origin}/login`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in with Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {isLogin ? 'Log in to sync your lists everywhere.' : 'Sign up to keep your lists in sync.'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {noticeMessage && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          {noticeMessage}
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          disabled={isSubmitting || loading}
          onClick={handleGoogleSignIn}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path
              fill="#EA4335"
              d="M12 11.3v3.4h4.8c-.2 1.2-1.4 3.4-4.8 3.4a5.3 5.3 0 010-10.6c1.5 0 2.5.6 3.1 1.1l2.1-2.1A8.4 8.4 0 0012 3.6a8.4 8.4 0 100 16.8c4.9 0 8.1-3.4 8.1-8.2 0-.6-.1-1-.1-1.4H12z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your password"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </Button>
        </form>
      </div>

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        {isLogin ? (
          <span>
            New here?{' '}
            <Link className="text-primary-600 dark:text-primary-400 hover:underline" to="/signup">
              Create an account
            </Link>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <Link className="text-primary-600 dark:text-primary-400 hover:underline" to="/login">
              Log in
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
