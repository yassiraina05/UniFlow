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
