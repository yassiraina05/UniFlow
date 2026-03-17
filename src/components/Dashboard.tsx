import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  CheckSquare, 
  TrendingUp, 
  Calendar,
  Bell,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { User, Todo, Budget, Reminder } from '../types';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  user: User;
  token: string;
  onNavigate: (view: any) => void;
}

export default function Dashboard({ user, token, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    notesCount: 0,
    todosCount: 0,
    budgetBalance: 0,
    upcomingReminders: 0
  });
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [importantReminder, setImportantReminder] = useState<Reminder | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    const fetchData = async () => {
      try {
        const [notesRes, todosRes, budgetRes, remindersRes] = await Promise.all([
          supabase.from('notes').select('*').eq('user_id', user.id),
          supabase.from('todos').select('*').eq('user_id', user.id),
          supabase.from('budgets').select('*').eq('user_id', user.id),
          supabase.from('reminders').select('*').eq('user_id', user.id)
        ]);

        const notes = notesRes.data || [];
        const todos = todosRes.data || [];
        const budgets = budgetRes.data || [];
        const reminders = (remindersRes.data || []).map(r => ({ ...r, remindAt: r.remind_at }));

        const balance = budgets.reduce((acc: number, curr: Budget) => 
          curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);

        setStats({
          notesCount: notes.length,
          todosCount: todos.filter((t: Todo) => !t.completed).length,
          budgetBalance: balance,
          upcomingReminders: reminders.filter((r: Reminder) => !r.completed).length
        });

        // Find most important reminder (High priority first, then soonest)
        const pending = reminders.filter((r: Reminder) => !r.completed);
        const sorted = pending.sort((a: Reminder, b: Reminder) => {
          const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
          if (priorityMap[a.priority] !== priorityMap[b.priority]) {
            return priorityMap[b.priority] - priorityMap[a.priority];
          }
          return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
        });
        setImportantReminder(sorted[0] || null);

        // Prepare chart data
        const chartData = budgets.slice(-7).map((b: Budget) => ({
          name: b.category,
          amount: Number(b.amount),
          type: b.type
        }));
        setBudgetData(chartData);

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };

    fetchData();
  }, [user.id]);

  const cards = [
    { id: 'notes', label: 'Total Notes', value: stats.notesCount, icon: FileText, color: 'bg-blue-500/10 text-blue-500' },
    { id: 'todos', label: 'Pending Tasks', value: stats.todosCount, icon: CheckSquare, color: 'bg-emerald-500/10 text-emerald-500' },
    { id: 'budget', label: 'Budget Balance', value: `$${stats.budgetBalance.toFixed(2)}`, icon: TrendingUp, color: 'bg-amber-500/10 text-amber-500' },
    { id: 'reminders', label: 'Reminders', value: stats.upcomingReminders, icon: Calendar, color: 'bg-purple-500/10 text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('profile')}
            className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center text-white text-2xl font-bold shadow-lg hover:scale-105 transition-transform overflow-hidden"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (user.name?.[0] || 'U').toUpperCase()
            )}
          </button>
          <div>
            <h2 className="text-3xl font-serif italic font-bold">Welcome back, {(user.name || 'User').split(' ')[0]}</h2>
            <p className="text-app-text/40 font-medium">Here's what's happening today.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-widest text-app-text/20">Current Date</p>
          <p className="text-lg font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(card.id)}
            className="bg-card p-6 rounded-3xl border border-border-subtle shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-bold text-app-text/40 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-8 rounded-3xl border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Budget Overview</h3>
            <button onClick={() => onNavigate('budget')} className="text-sm font-bold text-accent hover:underline">View Details</button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text)', opacity: 0.4 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text)', opacity: 0.4 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', color: 'var(--text)' }}
                  cursor={{ fill: 'var(--bg)' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-app-text text-app-bg p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden h-full min-h-[200px]">
            <div className="relative z-10">
              <h3 className="text-xl font-serif italic mb-2">Productivity Tip</h3>
              <p className="text-app-bg/60 text-sm leading-relaxed">
                "The secret of getting ahead is getting started. Break your complex tasks into small manageable ones."
              </p>
            </div>
            <div className="mt-8 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-app-bg/40">Active Session</span>
              </div>
              <p className="text-4xl font-bold mb-1">45m</p>
              <p className="text-app-bg/40 text-xs font-medium">Focus time today</p>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-app-bg/5 rounded-full blur-3xl" />
          </div>

          {importantReminder && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onNavigate('reminders')}
              className="bg-card p-6 rounded-3xl border-2 border-accent shadow-lg cursor-pointer hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <h4 className="font-bold text-app-text">Priority Reminder</h4>
              </div>
              <p className="text-lg font-serif italic font-bold mb-2">{importantReminder.title}</p>
              <div className="flex items-center gap-2 text-xs font-bold text-app-text/40 uppercase tracking-widest">
                <Bell size={14} />
                {new Date(importantReminder.remindAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
