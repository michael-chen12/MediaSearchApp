import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../base/Button';

export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const { signIn, signUp, user, loading, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = typeof location.state?.from === 'string'
    ? location.state.from
    : location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

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
