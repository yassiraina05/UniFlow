import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User as UserIcon, 
  Settings as SettingsIcon, 
  Palette, 
  Layout, 
  Shield, 
  Bell,
  Check,
  ChevronRight,
  Camera
} from 'lucide-react';
import { User, UserSettings } from '../types';
import { supabase } from '../supabaseClient';

interface ProfileProps {
  user: User;
  setUser: (user: User) => void;
  token: string;
  onLogout: () => void;
}

const ACCENT_COLORS = [
  { name: 'Olive', value: '#5A5A40' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Slate', value: '#141414' },
];

export default function Profile({ user, setUser, token, onLogout }: ProfileProps) {
  const [settings, setSettings] = useState<UserSettings>(user.settings || {});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const getAvatarUrl = async () => {
      if (user.avatar_url) {
        if (user.avatar_url.startsWith('http')) {
          setAvatarUrl(user.avatar_url);
        } else {
          const { data } = await supabase.storage.from('app-files').createSignedUrl(user.avatar_url, 3600);
          if (data) setAvatarUrl(data.signedUrl);
        }
      }
    };
    getAvatarUrl();
  }, [user.avatar_url]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uuid = Math.random().toString(36).substring(2);
      const filePath = `${user.id}/profile/avatar/${uuid}.${fileExt}`;

      // Delete old avatar if exists
      if (user.avatar_url && !user.avatar_url.startsWith('http')) {
        await supabase.storage.from('app-files').remove([user.avatar_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('app-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('app-files')
        .createSignedUrl(filePath, 3600);

      if (signedError) throw signedError;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user.id);

      if (dbError) throw dbError;

      const updatedUser = { ...user, avatar_url: filePath };
      setUser(updatedUser);
      setAvatarUrl(signedData.signedUrl);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateSettings = (newSettings: UserSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    setSaveStatus('idle');
    
    // Immediate preview
    if (newSettings.theme) {
      document.documentElement.setAttribute('data-theme', newSettings.theme);
    }
    if (newSettings.accentColor) {
      document.documentElement.style.setProperty('--accent', newSettings.accentColor);
    }
  };

  const handleSaveAll = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, settings };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Failed to update settings", err);
      setSaveStatus('error');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await onLogout();
    setIsLoggingOut(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button 
              className="w-24 h-24 rounded-3xl bg-accent flex items-center justify-center text-white text-4xl font-bold shadow-xl hover:scale-105 transition-transform cursor-pointer overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (user.name?.[0] || 'U').toUpperCase()
              )}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={24} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
              </label>
            </button>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-3xl">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-3xl font-serif italic font-bold">{user.name || 'User'}</h2>
            <p className="text-app-text/40 font-medium">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-app-text/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-app-text/40">University Student</span>
              <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-600">Premium Account</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isLoggingOut ? (
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          ) : null}
          {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Settings Content */}
        <div className="space-y-8">
          <section className="bg-card p-8 rounded-3xl border border-border-subtle shadow-sm space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Palette size={24} className="text-accent" /> Appearance
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-app-text/40 mb-4">Accent Color</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => updateSettings({ accentColor: color.value })}
                        className={`group relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all ${settings.accentColor === color.value ? 'ring-2 ring-offset-4 ring-app-text' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color.value }}
                      >
                        {settings.accentColor === color.value && <Check size={20} className="text-white" />}
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-app-text">
                          {color.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border-subtle">
                  <label className="block text-xs font-bold uppercase tracking-widest text-app-text/40 mb-4">Theme Mode</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => updateSettings({ theme: 'light' })}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.theme !== 'dark' ? 'border-accent bg-app-bg' : 'border-border-subtle hover:border-app-text/20'}`}
                    >
                      <div className="w-full h-12 bg-white rounded-lg border border-border-subtle shadow-sm" />
                      <span className="text-sm font-bold">Light</span>
                    </button>
                    <button 
                      onClick={() => updateSettings({ theme: 'dark' })}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-accent bg-app-text text-app-bg' : 'border-border-subtle hover:border-app-text/20'}`}
                    >
                      <div className="w-full h-12 bg-[#141414] rounded-lg border border-white/10 shadow-sm" />
                      <span className="text-sm font-bold">Dark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border-subtle">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Layout size={24} className="text-accent" /> Layout Preference
              </h3>
              <div className="flex items-center justify-between p-4 bg-app-bg rounded-2xl">
                <div>
                  <p className="font-bold">Compact Sidebar</p>
                  <p className="text-xs text-app-text/40">Minimize the sidebar to save screen space.</p>
                </div>
                <button 
                  onClick={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.sidebarCollapsed ? 'bg-accent' : 'bg-app-text/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.sidebarCollapsed ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveAll}
              disabled={saveStatus === 'saving'}
              className={`px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 ${
                saveStatus === 'success' ? 'bg-emerald-500 text-white' : 
                saveStatus === 'error' ? 'bg-red-500 text-white' : 
                'bg-app-text text-app-bg'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving Changes...' : 
               saveStatus === 'success' ? 'Changes Saved!' : 
               saveStatus === 'error' ? 'Error Saving' : 
               'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
