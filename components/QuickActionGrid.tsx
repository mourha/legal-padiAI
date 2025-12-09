
import React, { useMemo } from 'react';
import { QUICK_ACTIONS, DAILY_TIPS } from '../constants';
import * as Icons from 'lucide-react';
import { Shield, Briefcase, Home, Heart, Ban, Search, Drama } from 'lucide-react'; // Explicit imports for mapping

interface QuickActionGridProps {
  onActionClick: (prompt: string) => void;
  onSimulatorClick: () => void;
  userName?: string;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ onActionClick, onSimulatorClick, userName = "Padi" }) => {
  
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

      {/* Wahala Simulator Button (New) */}
      <button 
        onClick={onSimulatorClick}
        className="w-full bg-gradient-to-r from-purple-900/50 to-zinc-900 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between group active:scale-95 transition-transform"
      >
        <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-full text-purple-400 group-hover:text-purple-300">
                <Drama size={24} />
            </div>
            <div className="text-left">
                <h3 className="text-white font-bold text-lg">Wahala Simulator</h3>
                <p className="text-zinc-400 text-xs">Practice calling angry landlord or police</p>
            </div>
        </div>
        <Icons.ChevronRight className="text-zinc-600" />
      </button>

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
