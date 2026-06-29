import React, { useState, useEffect } from 'react';
import { Scale, RefreshCw, BookOpen, AlertCircle } from 'lucide-react';

interface LegalTip {
  title: string;
  explanation: string;
  citation: string;
}

export const DailyLegalTip: React.FC = () => {
  const [tip, setTip] = useState<LegalTip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchTip = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/lexai/daily-tip');
      if (!response.ok) {
        throw new Error('Failed to fetch tip');
      }
      const data = await response.json();
      setTip(data);
    } catch (err) {
      console.error('Error fetching legal tip:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, []);

  return (
    <div className="bg-gradient-to-br from-green-950/45 via-zinc-900 to-zinc-950 border border-green-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg transition-all duration-300">
      {/* Decorative vector background */}
      <div className="absolute -top-4 -right-4 p-4 opacity-[0.04] rotate-12 text-green-500 pointer-events-none select-none">
        <Scale size={110} />
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-green-500/10 rounded-lg text-green-400">
            <BookOpen size={14} className="animate-pulse" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-400">
            Daily Legal Tip
          </span>
        </div>
        
        <button
          onClick={fetchTip}
          disabled={loading}
          title="Shuffle new legal right"
          className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-green-400 active:rotate-180 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-green-500' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-5/6" />
          <div className="h-2.5 bg-zinc-800 rounded w-1/3 mt-3" />
        </div>
      ) : error || !tip ? (
        <div className="flex items-start gap-2 py-3 text-red-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold">Network get small delay</p>
            <p className="text-zinc-500 mt-0.5">Click refresh button make we try again.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-base font-bold text-white tracking-tight leading-snug">
            {tip.title}
          </h3>
          <p className="text-sm font-medium text-zinc-300 leading-relaxed">
            "{tip.explanation}"
          </p>
          
          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800/40 uppercase tracking-wider">
              {tip.citation}
            </span>
            <span className="text-[10px] text-green-500 font-semibold italic flex items-center gap-1">
              • Know Your Rights
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
