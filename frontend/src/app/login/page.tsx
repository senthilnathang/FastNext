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
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/modules/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeoutMessage, setTimeoutMessage] = useState('');

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
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
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
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  disabled={isLoading}
                  autoComplete="username"
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
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
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
                <p><strong>Username:</strong> demo@fastnext.com</p>
                <p><strong>Password:</strong> Demo123!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600">
          © 2024 FastNext Framework. All rights reserved.
        </p>
      </div>
    </div>
  );
}