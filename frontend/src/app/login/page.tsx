'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/components';
import { Shield, Eye, EyeOff, AlertCircle, Github, Chrome, Monitor } from 'lucide-react';
import { useAuth } from '@/modules/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeoutMessage, setTimeoutMessage] = useState('');
  const [socialLoginLoading, setSocialLoginLoading] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Check for timeout redirect message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectReason = urlParams.get('reason');
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');

    if (redirectReason) {
      const messages: Record<string, string> = {
        'session_expired': 'Your session has expired. Please log in again.',
        'token_expired': 'Your login token has expired. Please log in again.',
        'auth_failed': 'Authentication failed. Please log in again.',
        'auto_logout': 'You have been automatically logged out for security reasons.',
        'timeout_verified': 'Your session timed out for security. Please log in again.'
      };

      setTimeoutMessage(messages[redirectReason] || 'Please log in to continue.');
    }

    if (redirectPath) {
      setTimeoutMessage(prev =>
        prev || `Please log in to continue to ${redirectPath}.`
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(username, password);

      // Check for redirect path from timeout
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');

      if (redirectPath) {
        // User was redirected due to timeout, take them back to original page
        router.push(redirectPath);
        return;
      }

      // Default redirection
      router.push('/dashboard');

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';

      // Handle specific error types
      if (errorMessage.includes('expired')) {
        setError('Your password has expired. Please contact an administrator or use password reset if available.');
      } else if (errorMessage.includes('change is required')) {
        setError('Password change is required. Please update your password in settings.');
      } else if (errorMessage.includes('breached')) {
        setError('This password has been found in known data breaches. Please choose a different password.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'microsoft') => {
    setSocialLoginLoading(provider);
    setError('');

    try {
      // Get authorization URL from backend
      const response = await fetch(`/api/v1/auth/oauth/${provider}/login`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate ${provider} login`);
      }

      const data = await response.json();

      // Redirect to OAuth provider
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to login with ${provider}`);
      setSocialLoginLoading(null);
    }
  };

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const provider = urlParams.get('provider');

      if (code && state && provider) {
        try {
          setSocialLoginLoading(provider);

          // Complete OAuth flow
          const response = await fetch(`/api/v1/auth/oauth/${provider}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'OAuth authentication failed');
          }

          const data = await response.json();

          // Store tokens and redirect
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);

          router.push('/dashboard');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'OAuth authentication failed');
          setSocialLoginLoading(null);
        }
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to FastNext
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back! Please sign in to your account.
          </p>
        </div>

        <Card role="main" aria-labelledby="login-title">
          <CardHeader>
            <CardTitle id="login-title">Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Timeout Message */}
            {timeoutMessage && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-800">{timeoutMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-800 font-medium">Login Failed</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {(error.includes('expired') || error.includes('change is required')) && (
                      <div className="mt-3">
                        <Link href="/settings">
                          <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50">
                            Go to Settings
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  disabled={isLoading || !!socialLoginLoading}
                  autoComplete="username"
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading || !!socialLoginLoading}
                    autoComplete="current-password"
                    className="pr-10"
                    aria-describedby={error ? "login-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    disabled={isLoading || !!socialLoginLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !!socialLoginLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Don&apos;t have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/register">
                  <Button variant="outline" className="w-full">
                    Create new account
                  </Button>
                </Link>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Admin:</strong> admin / AdminPass123</p>
                <p><strong>Demo:</strong> demo / DemoPass123</p>
              </div>
            </div>

            {/* Social Login */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

               <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                 <Button
                   type="button"
                   variant="outline"
                   onClick={() => handleSocialLogin('google')}
                   disabled={isLoading || !!socialLoginLoading}
                   className="w-full flex items-center justify-center space-x-2"
                   aria-label="Sign in with Google"
                 >
                   <Chrome className="h-4 w-4 text-red-500" aria-hidden="true" />
                   <span className="hidden sm:inline">Google</span>
                 </Button>

                 <Button
                   type="button"
                   variant="outline"
                   onClick={() => handleSocialLogin('github')}
                   disabled={isLoading || !!socialLoginLoading}
                   className="w-full flex items-center justify-center space-x-2"
                   aria-label="Sign in with GitHub"
                 >
                   <Github className="h-4 w-4 text-gray-700" aria-hidden="true" />
                   <span className="hidden sm:inline">GitHub</span>
                 </Button>

                 <Button
                   type="button"
                   variant="outline"
                   onClick={() => handleSocialLogin('microsoft')}
                   disabled={isLoading || !!socialLoginLoading}
                   className="w-full flex items-center justify-center space-x-2"
                   aria-label="Sign in with Microsoft"
                 >
                   <Monitor className="h-4 w-4 text-blue-600" aria-hidden="true" />
                   <span className="hidden sm:inline">Microsoft</span>
                 </Button>
               </div>

              {socialLoginLoading && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600">
                    Redirecting to {socialLoginLoading}...
                  </p>
                </div>
              )}
            </div>

           </CardContent>
         </Card>

         {/* Demo Credentials */}
         <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
           <h4 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h4>
           <div className="text-xs text-blue-700 space-y-1">
             <p><strong>Admin:</strong> admin / AdminPass123</p>
             <p><strong>Demo:</strong> demo / DemoPass123</p>
           </div>
         </div>

         <p className="text-center text-sm text-gray-600">
           © 2024 FastNext Framework. All rights reserved.
         </p>
       </div>
     </div>
   );
 }
