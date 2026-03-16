import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Trash2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from 'recharts';
import { Budget } from '../types';

interface BudgetTrackerProps {
  token: string;
}

const COLORS = ['var(--accent)', '#8E9299', '#141414', '#E4E3E0', '#FF6321'];

export default function BudgetTracker({ token }: BudgetTrackerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchBudgets();
  }, [token]);

  const fetchBudgets = async () => {
    const res = await fetch('/api/budgets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setBudgets(data);
  };

  const addBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ category, amount: parseFloat(amount), type, date })
    });
    const data = await res.json();
    setBudgets([data, ...budgets]);
    setCategory('');
    setAmount('');
  };

  const deleteBudget = async (id: number) => {
    await fetch(`/api/budgets/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const totalIncome = budgets.filter(b => b.type === 'income').reduce((acc, b) => acc + b.amount, 0);
  const totalExpense = budgets.filter(b => b.type === 'expense').reduce((acc, b) => acc + b.amount, 0);
  const balance = totalIncome - totalExpense;

  const chartData = Object.values(
    budgets.filter(b => b.type === 'expense').reduce((acc: any, curr) => {
      if (!acc[curr.category]) acc[curr.category] = { name: curr.category, value: 0 };
      acc[curr.category].value += curr.amount;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif italic font-bold">Budget Tracker</h2>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-app-text/40">Total Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Summary Cards */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-3xl border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12% this month</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-app-text/40 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-emerald-600">${totalIncome.toFixed(2)}</p>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                <TrendingDown size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-1 rounded-full">-5% this month</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-app-text/40 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">${totalExpense.toFixed(2)}</p>
          </div>

          <form onSubmit={addBudget} className="bg-app-text text-app-bg p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="font-bold mb-2">Add Transaction</h3>
            <div className="flex gap-2 p-1 bg-app-bg/10 rounded-xl">
              <button 
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-app-bg text-app-text' : 'hover:bg-app-bg/5'}`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${type === 'income' ? 'bg-app-bg text-app-text' : 'hover:bg-app-bg/5'}`}
              >
                Income
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Category (e.g. Food, Rent)" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-bg/20"
            />
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-app-bg/30" size={16} />
              <input 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-app-bg/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-bg/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-app-bg/40 mb-1 ml-1">Transaction Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-bg/20 text-app-bg"
              />
            </div>
            <button type="submit" className="w-full py-3 bg-app-bg text-app-text rounded-xl font-bold hover:shadow-lg transition-all">
              Add Entry
            </button>
          </form>
        </div>

        {/* Charts & History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card p-8 rounded-3xl border border-border-subtle shadow-sm">
            <h3 className="text-xl font-bold mb-8">Expense Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      backgroundColor: 'var(--color-card)',
                      color: 'var(--color-app-text)'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-bold">Recent History</h3>
              <button className="text-sm font-bold text-accent flex items-center gap-1">
                <Filter size={14} /> Filter
              </button>
            </div>
            <div className="divide-y divide-border-subtle">
              {budgets.map(budget => (
                <div key={budget.id} className="p-4 flex items-center justify-between hover:bg-app-bg/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${budget.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {budget.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="font-bold">{budget.category}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-app-text/40">{new Date(budget.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold ${budget.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {budget.type === 'income' ? '+' : '-'}${budget.amount.toFixed(2)}
                    </p>
                    <button 
                      onClick={() => deleteBudget(budget.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
