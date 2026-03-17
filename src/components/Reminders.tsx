import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Bell, 
  Calendar, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { Reminder } from '../types';
import { supabase } from '../supabaseClient';

interface RemindersProps {
  token: string;
}

export default function Reminders({ token }: RemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const [filter, setFilter] = useState<'all' | 'upcoming'>('all');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('remind_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching reminders:', error);
      return;
    }

    const formattedReminders = data.map(r => ({
      ...r,
      remindAt: r.remind_at
    }));
    setReminders(formattedReminders);
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !remindAt) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert([{ 
          title, 
          remind_at: remindAt, 
          priority,
          completed: false 
        }])
        .select()
        .single();

      if (error) throw error;

      const newReminder = { ...data, remindAt: data.remind_at };
      setReminders([...reminders, newReminder].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
      setTitle('');
      setRemindAt('');
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('Failed to add reminder. Please try again.');
    }
  };

  const toggleReminder = async (id: number, completed: boolean) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: !completed })
      .eq('id', id);

    if (error) {
      console.error('Error toggling reminder:', error);
      return;
    }

    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !completed } : r));
  };

  const deleteReminder = async (id: number) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      return;
    }

    setReminders(reminders.filter(r => r.id !== id));
  };

  const upcoming = reminders.filter(r => !r.completed).sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  const filteredReminders = filter === 'upcoming' ? upcoming : reminders.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif italic font-bold">Reminders</h2>
        <button 
          onClick={() => setFilter(filter === 'all' ? 'upcoming' : 'all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg text-sm font-bold transition-all ${filter === 'upcoming' ? 'bg-white text-accent' : 'bg-accent text-white'}`}
        >
          <Bell size={16} /> {upcoming.length} Upcoming
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Add Reminder Form */}
        <div className="md:col-span-1">
          <form onSubmit={addReminder} className="bg-card p-6 rounded-3xl border border-border-subtle shadow-sm space-y-4 sticky top-8">
            <h3 className="font-bold mb-2">Set New Reminder</h3>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Reminder Title</label>
              <input 
                type="text" 
                placeholder="e.g. Exam Prep, Meeting" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Date & Time</label>
              <input 
                type="datetime-local" 
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text/40 mb-1 ml-1">Priority</label>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      priority === p 
                        ? p === 'High' ? 'bg-red-500 text-white' : p === 'Medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                        : 'bg-app-bg text-app-text/40 hover:bg-app-bg/80'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Plus size={18} /> Add Reminder
            </button>
          </form>
        </div>

        {/* Reminders List */}
        <div className="md:col-span-2 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-app-text/40 mb-4 ml-2">Timeline</h3>
            <div className="space-y-4 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-px before:bg-border-subtle">
              {filteredReminders.length > 0 ? (
                filteredReminders.map((reminder, i) => {
                  const date = new Date(reminder.remindAt);
                  const isOverdue = date < new Date() && !reminder.completed;
                  
                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-12"
                    >
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-app-bg z-10 ${reminder.completed ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-accent'}`} />
                      <div className={`bg-card p-6 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${reminder.completed ? 'opacity-50' : isOverdue ? 'border-red-100' : ''}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                              reminder.priority === 'High' ? 'bg-red-50 text-red-500' : 
                              reminder.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                              'bg-emerald-50 text-emerald-600'
                            }`}>
                              {reminder.priority}
                            </span>
                            <h4 className={`font-bold text-lg ${reminder.completed ? 'line-through' : ''}`}>{reminder.title}</h4>
                            {isOverdue && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle size={10} /> Overdue</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-medium text-app-text/40">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {date.toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleReminder(reminder.id, !!reminder.completed)}
                            className={`p-2 rounded-xl transition-colors ${reminder.completed ? 'text-emerald-500' : 'text-accent hover:bg-app-bg'}`}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="bg-card p-12 rounded-3xl border border-border-subtle shadow-sm text-center ml-12">
                  <p className="text-app-text/40 font-medium">No reminders found. You're all caught up!</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
