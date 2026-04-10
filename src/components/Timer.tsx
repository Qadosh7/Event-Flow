import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime } from '../lib/utils';
import { cn } from '../lib/utils';
import useSound from 'use-sound';

interface TimerProps {
  initialMinutes: number;
  onComplete?: () => void;
  title: string;
}

export const Timer: React.FC<TimerProps> = ({ initialMinutes, onComplete, title }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound effects (using placeholders, user can customize)
  const [playWarning] = useSound('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', { volume: 0.5 });
  const [playComplete] = useSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', { volume: 0.7 });

  useEffect(() => {
    setTimeLeft(initialMinutes * 60);
    setIsActive(false);
    setIsWarning(false);
  }, [initialMinutes]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      playComplete();
      onComplete?.();
      if (timerRef.current) clearInterval(timerRef.current);
    }

    // Warning at 5 minutes (300 seconds) or 20% of time if shorter
    const warningThreshold = Math.min(300, initialMinutes * 60 * 0.2);
    if (timeLeft === Math.floor(warningThreshold) && timeLeft > 0) {
      setIsWarning(true);
      playWarning();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, initialMinutes, onComplete, playWarning, playComplete]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialMinutes * 60);
    setIsWarning(false);
  };

  const adjustTime = (amount: number) => {
    setTimeLeft((prev) => Math.max(0, prev + amount));
  };

  const progress = (timeLeft / (initialMinutes * 60)) * 100;

  return (
    <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 timer-shadow relative overflow-hidden">
      {/* Background Progress Glow */}
      <motion.div 
        className={cn(
          "absolute inset-0 opacity-10 transition-colors duration-500",
          isWarning ? "bg-red-500" : "bg-emerald-500"
        )}
        animate={{ opacity: isActive ? [0.05, 0.15, 0.05] : 0.05 }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="text-center z-10">
        <h3 className="text-zinc-400 font-medium uppercase tracking-widest text-xs mb-1">{title}</h3>
        <motion.div 
          className={cn(
            "text-8xl font-display font-bold tracking-tighter tabular-nums",
            isWarning ? "text-red-500" : "text-zinc-50"
          )}
          animate={isWarning ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {formatTime(timeLeft)}
        </motion.div>
      </div>

      <div className="flex items-center gap-4 z-10">
        <button 
          onClick={() => adjustTime(-600)} 
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
          title="-10 min"
        >
          <span className="text-xs font-bold">-10</span>
        </button>
        <button 
          onClick={() => adjustTime(-60)} 
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
          title="-1 min"
        >
          <Minus size={20} />
        </button>
        
        <button 
          onClick={toggleTimer}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95",
            isActive ? "bg-zinc-100 text-zinc-900" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
          )}
        >
          {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
        </button>

        <button 
          onClick={() => adjustTime(60)} 
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
          title="+1 min"
        >
          <Plus size={20} />
        </button>
        <button 
          onClick={() => adjustTime(600)} 
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
          title="+10 min"
        >
          <span className="text-xs font-bold">+10</span>
        </button>
      </div>

      <div className="flex gap-4 z-10">
        <button 
          onClick={resetTimer}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      {isWarning && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-500 text-sm font-bold z-10"
        >
          <Bell size={16} className="animate-bounce" /> TIME ALMOST UP
        </motion.div>
      )}
    </div>
  );
};
