import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  PieChart, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Search,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabaseClient';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Notes from './components/Notes';
import Todos from './components/Todos';
import BudgetTracker from './components/BudgetTracker';
import Reminders from './components/Reminders';
import Profile from './components/Profile';

type View = 'dashboard' | 'notes' | 'todos' | 'budget' | 'reminders' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeView, setActiveView] = useState<View>(() => {
    const saved = localStorage.getItem('activeView');
    return (saved as View) || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitializing, setIsInitializing] = useState(() => {
    // Only show full-screen loading if we have a token to verify
    return !!localStorage.getItem('token');
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeView', activeView);
    }
  }, [activeView, user]);

  useEffect(() => {
    const getAvatarUrl = async () => {
      if (user?.avatar_url) {
        if (user.avatar_url.startsWith('http')) {
          setAvatarUrl(user.avatar_url);
        } else {
          const { data } = await supabase.storage.from('app-files').createSignedUrl(user.avatar_url, 3600);
          if (data) setAvatarUrl(data.signedUrl);
        }
      } else {
        setAvatarUrl(null);
      }
    };
    getAvatarUrl();
  }, [user?.avatar_url]);

  useEffect(() => {
    const initSession = async () => {
      console.log('Initializing session...');
      
      // Safety timeout to prevent stuck loading screen
      const timeoutId = setTimeout(() => {
        if (isInitializing) {
          console.warn('Initialization safety timeout reached');
          setIsInitializing(false);
        }
      }, 3000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('Session initialization error:', sessionError.message);
          if (sessionError.message.includes('Refresh Token')) {
            await supabase.auth.signOut();
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('activeView');
          }
          setIsInitializing(false);
          clearTimeout(timeoutId);
          return;
        }

        if (session && session.user) {
          // Fetch latest profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const appUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || session.user.user_metadata?.full_name || 'User',
            avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            settings: profile?.settings || {}
          };
          
          setUser(appUser);
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify(appUser));
          
          // Once we have the real user data, we can stop initializing
          setIsInitializing(false);
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('activeView');
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('Session initialization failed:', err);
        setIsInitializing(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session && session.user) {
        try {
          // Fetch profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const appUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || session.user.user_metadata?.full_name || 'User',
            avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            settings: profile?.settings || {}
          };
          
          setUser(appUser);
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('user', JSON.stringify(appUser));
        } catch (err) {
          console.error('Auth state change profile fetch failed:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeView');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.settings) {
      const { theme, accentColor } = user.settings;
      document.documentElement.setAttribute('data-theme', theme || 'light');
      document.documentElement.style.setProperty('--accent', accentColor || '#5A5A40');
    }
  }, [user]);

  const handleLogin = (newToken: string, newUser: User) => {
    console.log('Handling login...', newUser.email);
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    console.log('Logging out...');
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeView');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-app-text/40 font-serif italic font-bold text-xl">UniFlow</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Auth onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'budget', label: 'Budget', icon: PieChart },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="flex h-screen bg-app-bg text-app-text font-sans selection:bg-accent selection:text-white">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-card border-r border-border-subtle flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-serif italic font-bold tracking-tight"
            >
              UniFlow
            </motion.h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-app-bg rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                activeView === item.id 
                  ? "bg-accent text-white shadow-md" 
                  : "hover:bg-app-bg text-app-text/60 hover:text-app-text"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50",
              !isSidebarOpen && "justify-center"
            )}
          >
            {isLoggingOut ? (
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut size={20} />
            )}
            {isSidebarOpen && <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 border-b border-border-subtle bg-card/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4 text-app-text/40">
            <span className="text-sm font-medium uppercase tracking-widest">University Hub</span>
            <ChevronRight size={14} />
            <span className="text-sm font-medium text-app-text capitalize">{activeView}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveView('profile')}
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform shadow-sm overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (user.name?.[0] || 'U').toUpperCase()
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto h-full"
            >
              {activeView === 'dashboard' && <Dashboard user={user} token={token} onNavigate={setActiveView} />}
              {activeView === 'notes' && <Notes user={user} token={token} />}
              {activeView === 'todos' && <Todos user={user} token={token} />}
              {activeView === 'budget' && <BudgetTracker user={user} token={token} />}
              {activeView === 'reminders' && <Reminders user={user} token={token} />}
              {activeView === 'profile' && <Profile user={user} setUser={setUser} token={token} onLogout={handleLogout} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

