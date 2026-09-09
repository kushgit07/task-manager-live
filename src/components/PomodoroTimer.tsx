import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer, Settings2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PomodoroTimer({ showToast }: { showToast?: (title: string, type?: 'success' | 'error') => void }) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [customMins, setCustomMins] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && hasStarted) {
      setIsActive(false);
      setHasStarted(false);
      if (showToast) showToast('Focus session completed!', 'success');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, hasStarted, showToast]);

  const handleStart = (mins: number) => {
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
    setIsActive(true);
    setHasStarted(true);
    setIsConfiguring(false);
    if (showToast) showToast(`Focus timer started for ${mins}m`, 'success');
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
    if (showToast) {
      showToast(!isActive ? 'Focus timer resumed' : 'Focus timer paused', 'success');
    }
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setHasStarted(false);
    setTimeLeft(durationMinutes * 60);
    if (showToast) showToast('Focus session ended', 'success');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderInline = () => {
    if (hasStarted) {
      return (
        <button 
          onClick={() => setIsActive(!isActive)}
          className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 text-indigo-700 rounded-xl px-3 h-10 shadow-sm flex-shrink-0 transition-all active:scale-95"
        >
          <Timer className="w-4 h-4 animate-pulse" />
          <span className="font-extrabold text-[13px] tracking-wider font-mono">
            {formatTime(timeLeft)}
          </span>
        </button>
      );
    }

    if (isConfiguring) {
      return (
        <motion.div 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          className="flex items-center gap-1 bg-white border border-indigo-200 rounded-xl px-1.5 h-10 shadow-sm flex-shrink-0"
        >
          {[10, 25, 50].map(m => (
            <button
              key={m}
              onClick={() => handleStart(m)}
              className="px-2.5 py-1 text-[11px] font-extrabold bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors active:scale-95"
            >
              {m}m
            </button>
          ))}
          <div className="w-[1px] h-5 bg-slate-200 mx-1"></div>
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <input 
              type="number" 
              value={customMins}
              onChange={(e) => setCustomMins(e.target.value)}
              placeholder="00" 
              className="w-8 text-center text-xs font-bold bg-transparent py-1 focus:outline-none hide-arrows"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(e.currentTarget.value);
                  if (val > 0) handleStart(val);
                }
              }}
            />
            <button 
              onClick={() => {
                const val = parseInt(customMins);
                if (val > 0) handleStart(val);
              }}
              className="px-1.5 py-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => setIsConfiguring(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      );
    }

    return (
      <button 
        onClick={() => setIsConfiguring(true)}
        className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3 h-10 shadow-sm flex-shrink-0 hover:bg-slate-50 transition-all active:scale-95 group"
      >
        <Timer className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        <span className="font-bold text-slate-600 text-[13px]">Focus</span>
        <Settings2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
      </button>
    );
  };

  return (
    <>
      {renderInline()}

      <AnimatePresence>
        {hasStarted && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8, x: '-50%' }}
            animate={{ y: 0, opacity: 1, scale: 1, x: '-50%' }}
            exit={{ y: -100, opacity: 0, scale: 0.8, x: '-50%' }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-4 md:top-6 left-1/2 z-[100] flex items-center gap-4 bg-slate-900 text-white pl-5 pr-2 py-2 rounded-full shadow-2xl border border-slate-800 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                <Timer className={`w-4 h-4 z-10 ${isActive ? 'animate-pulse' : ''}`} />
                {isActive && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="16" cy="16" r="15"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeDasharray="94.2"
                      strokeDashoffset={94.2 - (94.2 * (timeLeft / (durationMinutes * 60)))}
                      className="text-indigo-500 transition-all duration-1000 ease-linear"
                    />
                  </svg>
                )}
              </div>
              <span className="font-mono text-xl font-bold tracking-wider w-16 text-center">
                {formatTime(timeLeft)}
              </span>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-800 rounded-full p-1">
              <button 
                onClick={toggleTimer} 
                className="p-2 hover:bg-slate-700 rounded-full text-white transition-colors active:scale-90"
              >
                {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button 
                onClick={resetTimer} 
                className="p-2 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-full transition-colors active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
