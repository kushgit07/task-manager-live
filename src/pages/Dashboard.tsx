import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LogOut, LayoutDashboard, Plus, CheckCircle2, Clock, X, Circle, CircleCheck, AlertCircle, ArrowUp, CalendarDays, ListTodo, Search, ArrowUpDown, Pencil, Menu } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/api.ts';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, eachDayOfInterval, isSameDay, startOfToday, differenceInDays } from 'date-fns';
import { Card } from '../components/ui/Card.tsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Dialog, DialogTitle } from '../components/ui/Dialog.tsx';
import { Input } from '../components/ui/Input.tsx';

import { PomodoroTimer } from '../components/PomodoroTimer.tsx';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
};

export default function Dashboard() {
  const { user, logout, getToken } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'COMPLETED'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'DUE_DATE' | 'PRIORITY' | 'NEWEST'>('NEWEST');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<{title: string, type: 'success' | 'error'} | null>(null);

  const showToast = (title: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchWithAuth('/api/tasks', getToken)
  });

  const toggleStatus = useMutation({
    mutationFn: (task: Task) => 
      fetchWithAuth(`/api/tasks/${task.id}`, getToken, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED' 
        })
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(variables.status === 'COMPLETED' ? 'Task marked as pending' : 'Task completed', 'success');
    }
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => 
      fetchWithAuth(`/api/tasks/${id}`, getToken, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task deleted successfully', 'success');
    }
  });

  const createTask = useMutation({
    mutationFn: () => {
      const payload = { 
        title, 
        description, 
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null 
      };
      
      if (editingTask) {
        return fetchWithAuth(`/api/tasks/${editingTask.id}`, getToken, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }
      
      return fetchWithAuth('/api/tasks', getToken, { 
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(editingTask ? 'Task updated successfully' : 'Task created successfully', 'success');
      closeDialog();
    }
  });

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDueDate('');
  };

  const tasks: Task[] = data?.data || [];
  
  const filteredTasks = tasks
    .filter(t => filter === 'ALL' || (filter === 'COMPLETED' ? t.status === 'COMPLETED' : t.status !== 'COMPLETED'))
    .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'DUE_DATE') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'PRIORITY') {
        const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    pending: tasks.filter(t => t.status !== 'COMPLETED').length,
  };

  const today = startOfToday();
  const last7Days = eachDayOfInterval({
    start: subDays(today, 6),
    end: today
  });

  const chartData = last7Days.map(date => {
    const completed = tasks.filter(t => 
      t.status === 'COMPLETED' && t.completedAt && isSameDay(new Date(t.completedAt), date)
    ).length;
    const added = tasks.filter(t => 
      t.createdAt && isSameDay(new Date(t.createdAt), date)
    ).length;
    
    return {
      name: format(date, 'EEE'),
      completed,
      added
    };
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-slate-950 text-slate-300 z-50 flex flex-col border-r border-slate-900 md:hidden"
            >
              <div className="p-6 flex items-center justify-between text-white font-extrabold text-2xl tracking-tight">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500 p-1.5 rounded-xl shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  TaskFlow
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="px-4 pb-4 overflow-y-auto">
                <p className="px-4 text-xs font-bold tracking-wider text-slate-500 uppercase mb-3">Views</p>
                <nav className="space-y-1.5">
                  <button 
                    onClick={() => { setFilter('ALL'); setIsMobileMenuOpen(false); showToast('Viewing All Tasks', 'success'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'ALL' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <LayoutDashboard className="w-5 h-5" /> All Tasks
                  </button>
                  <button 
                    onClick={() => { setFilter('TODO'); setIsMobileMenuOpen(false); showToast('Viewing Pending Tasks', 'success'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'TODO' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <Circle className="w-5 h-5" /> Pending
                  </button>
                  <button 
                    onClick={() => { setFilter('COMPLETED'); setIsMobileMenuOpen(false); showToast('Viewing Completed Tasks', 'success'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'COMPLETED' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <CircleCheck className="w-5 h-5" /> Completed
                  </button>
                </nav>
              </div>
              
              <div className="mt-auto p-4 border-t border-slate-900/50">
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-slate-900/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0">
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-sm truncate flex-1 min-w-0">
                    <p className="text-slate-200 font-bold truncate">{user?.displayName}</p>
                    <p className="text-slate-500 text-xs font-medium truncate">{user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-[280px] bg-slate-950 text-slate-300 hidden md:flex flex-col border-r border-slate-900 flex-shrink-0">
        <div className="p-8 flex items-center gap-3 text-white font-extrabold text-2xl tracking-tight">
          <div className="bg-indigo-500 p-1.5 rounded-xl shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          TaskFlow
        </div>
        
        <div className="px-4 pb-4">
          <p className="px-4 text-xs font-bold tracking-wider text-slate-500 uppercase mb-3">Views</p>
          <nav className="space-y-1.5">
            <button 
              onClick={() => { setFilter('ALL'); showToast('Viewing All Tasks', 'success'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'ALL' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> All Tasks
            </button>
            <button 
              onClick={() => { setFilter('TODO'); showToast('Viewing Pending Tasks', 'success'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'TODO' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
            >
              <Circle className="w-5 h-5" /> Pending
            </button>
            <button 
              onClick={() => { setFilter('COMPLETED'); showToast('Viewing Completed Tasks', 'success'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${filter === 'COMPLETED' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
            >
              <CircleCheck className="w-5 h-5" /> Completed
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-900/50">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-slate-900/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="text-sm truncate flex-1 min-w-0">
              <p className="text-slate-200 font-bold truncate">{user?.displayName}</p>
              <p className="text-slate-500 text-xs font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 md:px-8 md:py-6 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-10 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            <div className="flex items-center justify-between md:justify-start">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                  {filter === 'ALL' ? 'Overview' : filter === 'TODO' ? 'Pending' : 'Completed'}
                </h1>
              </div>
              <Button className="md:hidden gap-2 shadow-sm rounded-xl font-bold px-4 h-10" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
            
            <div className="relative w-full md:max-w-md md:ml-4 group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input 
                placeholder="Search tasks... (Press Enter to search)" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                    showToast(searchInput ? `Searching for "${searchInput}"` : 'Cleared search', 'success');
                  }
                }}
                className="pl-10 h-10 bg-white/80 border-slate-200 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 w-full rounded-xl transition-all shadow-sm font-medium"
              />
            </div>
          </div>
          
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 hide-scrollbar w-[calc(100%+2rem)] md:w-auto scroll-smooth snap-x snap-mandatory touch-pan-x">
            <div className="snap-start shrink-0">
              <PomodoroTimer showToast={showToast} />
            </div>
            <div className="flex bg-slate-100/80 rounded-xl p-1 border border-slate-200/50 flex-shrink-0 snap-start backdrop-blur-sm">
              {(['NEWEST', 'DUE_DATE', 'PRIORITY'] as const).map(sortType => (
                <button
                  key={sortType}
                  onClick={() => {
                    setSortBy(sortType);
                    showToast(`Sorted by ${sortType === 'NEWEST' ? 'Newest' : sortType === 'DUE_DATE' ? 'Due Date' : 'Priority'}`, 'success');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap active:scale-95 ${
                    sortBy === sortType 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                  }`}
                >
                  {sortType === 'NEWEST' ? 'Newest' : sortType === 'DUE_DATE' ? 'Due Date' : 'Priority'}
                </button>
              ))}
            </div>
            <Button className="hidden md:flex gap-2 shadow-sm rounded-xl font-bold px-5 h-10 flex-shrink-0 snap-start" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-12">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Card className="p-6 overflow-hidden relative border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5">
                    <ListTodo className="w-32 h-32" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">Total Tasks</p>
                    </div>
                    <p className="text-4xl font-extrabold text-slate-900">{stats.total}</p>
                  </div>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Card className="p-6 overflow-hidden relative border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5">
                    <CheckCircle2 className="w-32 h-32" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">Completed</p>
                    </div>
                    <p className="text-4xl font-extrabold text-slate-900">{stats.completed}</p>
                  </div>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Card className="p-6 overflow-hidden relative border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5">
                    <Clock className="w-32 h-32" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">Pending</p>
                    </div>
                    <p className="text-4xl font-extrabold text-slate-900">{stats.pending}</p>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Weekly Progress Chart */}
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-6 overflow-hidden relative border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Weekly Progress</h3>
                    <p className="text-sm font-medium text-slate-500">Tasks completed vs added over the last 7 days</p>
                  </div>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)', fontWeight: 600, color: '#0f172a' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b', paddingTop: '20px' }} />
                      <Bar dataKey="added" name="Tasks Added" fill="#cbd5e1" radius={[4, 4, 4, 4]} />
                      <Bar dataKey="completed" name="Tasks Completed" fill="#6366f1" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Task List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                  <p className="font-bold">Loading tasks...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">You're all caught up!</h3>
                  <p className="text-slate-500 font-medium mb-6 max-w-sm">There are no tasks in this view. Create a new task to keep track of your work.</p>
                  <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl px-8 h-12 text-base">
                    <Plus className="w-5 h-5 mr-2" /> Create Task
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        variants={itemVariants}
                        exit="exit"
                        className={`group bg-white border border-slate-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all ${task.status === 'COMPLETED' ? 'opacity-70 bg-slate-50/50' : ''}`}
                      >
                        <button 
                          onClick={() => toggleStatus.mutate(task)}
                          disabled={toggleStatus.isPending}
                          className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                            task.status === 'COMPLETED' 
                              ? 'bg-emerald-500 border-emerald-500 text-white scale-110' 
                              : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                          }`}
                        >
                          {task.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className={`font-extrabold text-base truncate transition-colors ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-extrabold uppercase tracking-wide">
                            <span className={`px-2.5 py-1 rounded-lg border ${
                              task.priority === 'URGENT' ? 'bg-red-50 text-red-700 border-red-100' :
                              task.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                {task.priority === 'URGENT' && <AlertCircle className="w-3 h-3" />}
                                {task.priority === 'HIGH' && <ArrowUp className="w-3 h-3" />}
                                {task.priority}
                              </span>
                            </span>
                            
                            {task.dueDate && (() => {
                              const diff = differenceInDays(new Date(task.dueDate), today);
                              const isNearDue = diff <= 2 && diff >= 0 && task.status !== 'COMPLETED';
                              const isPastDue = diff < 0 && task.status !== 'COMPLETED';
                              
                              return (
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm transition-colors ${
                                  isPastDue ? 'bg-red-50 text-red-700 border-red-100' :
                                  isNearDue ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                  'bg-white text-slate-500 border-slate-200'
                                }`}>
                                  {isPastDue ? <AlertCircle className="w-3.5 h-3.5" /> :
                                  isNearDue ? <Clock className="w-3.5 h-3.5" /> :
                                  <CalendarDays className="w-3.5 h-3.5" />}
                                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity ml-2 md:ml-4 flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-8 w-8 md:h-10 md:w-10" 
                            onClick={() => openEditDialog(task)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-8 w-8 md:h-10 md:w-10" 
                            onClick={() => deleteTask.mutate(task.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create/Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0 z-20 shadow-sm">
          <DialogTitle className="text-xl font-extrabold">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <button onClick={closeDialog} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full p-2 transition-colors active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-5 bg-slate-50/50 pb-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Task Title</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="What needs to be done?" 
              className="h-12 bg-white text-base rounded-xl shadow-sm border-slate-200 font-medium"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Description <span className="text-slate-400 font-medium">(Optional)</span></label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 resize-none shadow-sm"
              placeholder="Add more details about this task..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Priority</label>
            <div className="grid grid-cols-2 sm:flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold transition-all border shadow-sm active:scale-95 ${
                    priority === p 
                      ? (p === 'URGENT' ? 'bg-red-500 border-red-600 text-white' : p === 'HIGH' ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-900 border-slate-900 text-white')
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">Due Date <span className="text-slate-400 font-medium">(Optional)</span></label>
            <Input 
              type="date"
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              className="h-12 bg-white text-base rounded-xl shadow-sm border-slate-200 font-medium w-full"
            />
          </div>
        </div>
        <div className="p-4 md:p-6 flex justify-end gap-3 bg-white border-t border-slate-100 sticky bottom-0 z-20">
          <Button variant="outline" className="h-11 rounded-xl font-bold w-full sm:w-auto" onClick={closeDialog}>Cancel</Button>
          <Button 
            className="h-11 rounded-xl px-6 font-bold w-full sm:w-auto"
            onClick={() => createTask.mutate()} 
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? 'Saving...' : (editingTask ? 'Save Changes' : 'Create Task')}
          </Button>
        </div>
      </Dialog>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-800"
          >
            {toastMessage.type === 'success' ? (
              <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="bg-red-500/20 text-red-400 p-1 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            <p className="font-bold text-sm tracking-wide">{toastMessage.title}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
