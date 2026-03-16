import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onLogin: (token: string, user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });
      }

      const { data, error: supabaseError } = result;

      if (supabaseError) throw supabaseError;

      if (data.session && data.user) {
        const appUser: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || name || 'User',
          settings: {}
        };
        onLogin(data.session.access_token, appUser);
      } else if (!isLogin && data.user) {
        // Signup successful but email confirmation is required
        setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
        setIsLogin(true);
        setPassword('');
        setName('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (supabaseError) throw supabaseError;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border-subtle"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif italic font-bold mb-2">UniFlow</h1>
          <p className="text-app-text/60">Your university productivity companion</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-emerald-700 text-sm text-center font-medium">
              {successMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-app-bg rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="Your full name"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-app-bg rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="student@university.edu"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-app-bg rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-accent text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-app-text/40 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 bg-white text-app-text border border-border-subtle rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={toggleMode}
            className="text-sm text-accent font-medium hover:underline"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
