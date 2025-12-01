"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Registrar en Supabase directamente
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) throw googleError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2a2a2a] flex">
      {/* Left Section - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-white text-xl font-semibold">anima</span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Create Account</h1>
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-red-500 hover:underline">
                Log in
              </Link>
            </p>
          </div>

          {/* Google Sign Up Button */}
          <Button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 h-12 text-base font-normal"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#2a2a2a] text-gray-400">Or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">
                  First name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="bg-[#3a3a3a] border-gray-600 text-white placeholder:text-gray-500 focus:border-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="bg-[#3a3a3a] border-gray-600 text-white placeholder:text-gray-500 focus:border-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-[#3a3a3a] border-gray-600 text-white placeholder:text-gray-500 focus:border-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-[#3a3a3a] border-gray-600 text-white placeholder:text-gray-500 focus:border-gray-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white h-12 text-base"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Terms */}
          <p className="text-sm text-gray-400 text-center">
            By creating an account, I agree with Anima&apos;s{' '}
            <Link href="#" className="text-red-500 hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-red-500 hover:underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>

      {/* Right Section - Illustrations */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#2a2a2a] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {/* Flying Houses */}
          <div className="absolute top-20 left-20">
            <svg width="80" height="80" viewBox="0 0 100 100" className="text-white">
              <path
                d="M20 60 L20 80 L40 80 L40 60 Z M25 60 L25 50 L35 50 L35 60"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="30" cy="45" r="3" fill="yellow" />
            </svg>
          </div>
          <div className="absolute top-40 left-40">
            <svg width="80" height="80" viewBox="0 0 100 100" className="text-white">
              <path
                d="M20 60 L20 80 L40 80 L40 60 Z M25 60 L25 50 L35 50 L35 60"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="30" cy="45" r="3" fill="yellow" />
            </svg>
          </div>

          {/* Retro Computer */}
          <div className="absolute bottom-20 right-20">
            <svg width="200" height="200" viewBox="0 0 200 200" className="text-white">
              {/* Monitor */}
              <rect x="50" y="30" width="100" height="70" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="60" y="40" width="80" height="50" fill="#1a1a1a" />
              <text x="70" y="60" fill="#4ade80" fontSize="8" fontFamily="monospace">const code =</text>
              <text x="70" y="75" fill="#fbbf24" fontSize="8" fontFamily="monospace">  &quot;awesome&quot;;</text>
              
              {/* Base */}
              <rect x="80" y="100" width="40" height="30" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="90" cy="115" r="2" fill="currentColor" />
              <circle cx="100" cy="115" r="2" fill="currentColor" />
              <rect x="85" y="120" width="30" height="2" fill="currentColor" />
              
              {/* Palette */}
              <ellipse cx="100" cy="150" rx="50" ry="30" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="80" cy="140" r="8" fill="#fbbf24" />
              <circle cx="100" cy="135" r="8" fill="#f472b6" />
              <circle cx="120" cy="145" r="8" fill="#10b981" />
              <circle cx="90" cy="155" r="8" fill="#60a5fa" />
              <circle cx="110" cy="160" r="8" fill="#f97316" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

