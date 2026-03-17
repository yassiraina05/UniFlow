import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { Todo } from '../types';
import { supabase } from '../supabaseClient';

interface TodosProps {
  token: string;
}

export default function Todos({ token }: TodosProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchTodos();
  }, [token]);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching todos:', error);
      return;
    }

    const formattedTodos = data.map(t => ({
      ...t,
      dueDate: t.due_date
    }));
    setTodos(formattedTodos);
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ 
          task: newTask, 
          due_date: dueDate || null,
          completed: false 
        }])
        .select()
        .single();

      if (error) throw error;

      const newTodo = { ...data, dueDate: data.due_date };
      setTodos([newTodo, ...todos]);
      setNewTask('');
      setDueDate('');
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add task. Please try again.');
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id);

    if (error) {
      console.error('Error toggling todo:', error);
      return;
    }

    setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
  };

  const deleteTodo = async (id: number) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error);
      return;
    }

    setTodos(todos.filter(t => t.id !== id));
  };

  const clearCompleted = async () => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('completed', true);

    if (error) {
      console.error('Error clearing completed todos:', error);
      return;
    }

    setTodos(todos.filter(t => !t.completed));
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif italic font-bold">To-Do List</h2>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-2xl border border-border-subtle shadow-sm text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-accent text-white' : 'bg-card text-app-text/40 hover:bg-app-bg'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Todo */}
      <form onSubmit={addTodo} className="bg-card p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-app-bg rounded-2xl flex items-center justify-center text-accent">
            <Plus size={24} />
          </div>
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 bg-transparent border-none focus:outline-none text-lg font-medium"
          />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-app-text/40 uppercase tracking-widest">
              <Calendar size={14} />
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="px-6 py-2 bg-accent text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-app-text/40 mb-4 ml-2">Pending — {pendingTodos.length}</h3>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingTodos.map(todo => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card p-4 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-4 group"
                >
                  <button 
                    onClick={() => toggleTodo(todo.id, !!todo.completed)}
                    className="text-app-text/20 hover:text-accent transition-colors"
                  >
                    <Circle size={24} />
                  </button>
                  <div className="flex-1">
                    <p className="font-bold">{todo.task}</p>
                    {todo.dueDate && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-app-text/40 flex items-center gap-1 mt-1">
                        <Clock size={10} /> Due {new Date(todo.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {completedTodos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 ml-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-app-text/40">Completed — {completedTodos.length}</h3>
              <button 
                onClick={clearCompleted}
                className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 opacity-50">
              {completedTodos.map(todo => (
                <div
                  key={todo.id}
                  className="bg-card p-4 rounded-2xl border border-border-subtle flex items-center gap-4 group"
                >
                  <button 
                    onClick={() => toggleTodo(todo.id, !!todo.completed)}
                    className="text-accent"
                  >
                    <CheckCircle2 size={24} />
                  </button>
                  <p className="flex-1 font-bold line-through text-app-text/40">{todo.task}</p>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
