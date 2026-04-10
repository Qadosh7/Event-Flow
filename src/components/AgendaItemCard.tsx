import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, User, Coffee, Utensils, Presentation, CheckCircle2, Circle } from 'lucide-react';
import { AgendaItem } from '../types';
import { cn } from '../lib/utils';

interface AgendaItemCardProps {
  item: AgendaItem;
  isActive?: boolean;
  onToggleComplete: (id: string) => void;
}

export const AgendaItemCard: React.FC<AgendaItemCardProps> = ({ item, isActive, onToggleComplete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.type === 'presentation' ? Presentation : 
               item.type === 'break' ? Coffee : Utensils;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
        isActive ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700",
        item.isCompleted && "opacity-60 grayscale"
      )}
    >
      <button 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <GripVertical size={20} />
      </button>

      <button 
        onClick={() => onToggleComplete(item.id)}
        className={cn(
          "p-1 transition-colors",
          item.isCompleted ? "text-emerald-500" : "text-zinc-700 hover:text-zinc-500"
        )}
      >
        {item.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className={cn(
            item.type === 'presentation' ? "text-blue-400" : 
            item.type === 'break' ? "text-orange-400" : "text-emerald-400"
          )} />
          <h4 className={cn(
            "font-semibold truncate",
            item.isCompleted && "line-through"
          )}>
            {item.title}
          </h4>
        </div>
        
        {item.presenter && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <User size={14} />
            <span>{item.presenter}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-300">
          <Clock size={12} />
          <span>{item.duration}m</span>
        </div>
        {isActive && (
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter animate-pulse">
            Live Now
          </span>
        )}
      </div>
    </div>
  );
};
