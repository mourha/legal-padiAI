import React, { useMemo } from 'react';
import { QUICK_ACTIONS, DAILY_TIPS } from '../constants';
import * as Icons from 'lucide-react';
import { Shield, Briefcase, Home, Heart, Ban, Search } from 'lucide-react'; // Explicit imports for mapping

interface QuickActionGridProps {
  onActionClick: (prompt: string) => void;
  userName?: string;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ onActionClick, userName = "Padi" }) => {
  
  const dailyTip = useMemo(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)], []);

  // Icon mapping helper
  const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'Shield': return Shield;
        case 'Home': return Home;
        case 'Briefcase': return Briefcase;
        case 'Heart': return Heart;
        case 'Ban': return Ban;
        default: return Shield;
    }
  };

  return (
    <div className="p-5 pb-32 space-y-8">
      {/* Header */}
      <div className="mt-4 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
            How far, <span className="text-green-500">{userName}</span> 👋
            </h1>
            <p className="text-zinc-400 mt-1">Wetin you wan know today?</p>
        </div>
      </div>

      {/* Daily Tip */}
      <div className="bg-gradient-to-r from-green-900/40 to-zinc-900 border border-green-500/20 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
            <Icons.Scale size={64} className="text-white" />
        </div>
        <span className="inline-block px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            Tip of the day
        </span>
        <p className="text-sm font-medium text-zinc-100 leading-relaxed pr-8">
            "{dailyTip}"
        </p>
      </div>

      {/* Search Fake */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-500" />
        </div>
        <button 
            onClick={() => onActionClick("")}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl py-4 pl-10 pr-4 text-left text-sm hover:border-zinc-700 transition-colors"
        >
            Search legal wahala...
        </button>
      </div>

      {/* Grid */}
      <div>
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Quick Help</h2>
        <div className="grid grid-cols-2 gap-4">
            {QUICK_ACTIONS.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                    <button
                        key={action.id}
                        onClick={() => onActionClick(action.prompt)}
                        className={`p-4 rounded-2xl border flex flex-col items-start gap-3 transition-all active:scale-95 text-left ${action.color.replace('bg-', 'hover:bg-opacity-20 ')} bg-zinc-900 border-zinc-800`}
                    >
                        <div className={`p-2 rounded-lg ${action.color}`}>
                            <Icon size={20} />
                        </div>
                        <span className="font-semibold text-zinc-200 text-sm">{action.title}</span>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};