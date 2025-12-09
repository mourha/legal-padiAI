
import React, { useState } from 'react';
import { Drama, User, ChevronLeft, Mic, Shuffle } from 'lucide-react';

interface FakeCallSetupProps {
  onBack: () => void;
  onStartCall: (title: string, prompt: string) => void;
}

export const FakeCallSetup: React.FC<FakeCallSetupProps> = ({ onBack, onStartCall }) => {
  const [customPrompt, setCustomPrompt] = useState("");
  
  const presets = [
    {
      title: "Angry Landlord",
      icon: "🏠",
      prompt: "Act as an angry Nigerian landlord named 'Chief'. You are demanding rent that is 3 months overdue. You are loud, unreasonable, and threatening to remove the roof. Speak in aggressive Pidgin. Refuse to listen to excuses.",
      color: "bg-red-500/10 text-red-500 border-red-500/30"
    },
    {
      title: "Police at Checkpoint",
      icon: "👮",
      prompt: "Act as a Nigerian police officer at a night checkpoint. You are suspicious but not violent. You are asking for 'receipts for laptop' and 'tint permit'. You are looking for a bribe but won't say it directly. Speak in Pidgin.",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/30"
    },
    {
      title: "Stubborn Debtor",
      icon: "💸",
      prompt: "Act as a friend named 'Emeka' who borrowed money 6 months ago. I am asking for it back. You have 1000 excuses. You are gaslighting me, saying I don't trust you. You are dramatic.",
      color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
    },
    {
      title: "Market Woman",
      icon: "🍅",
      prompt: "Act as a sharp-mouthed market woman in Balogun market. I am trying to price your goods too low. You are insulting me jokingly but standing your ground on price. Loud and funny.",
      color: "bg-orange-500/10 text-orange-500 border-orange-500/30"
    }
  ];

  const handleRandom = () => {
    const random = presets[Math.floor(Math.random() * presets.length)];
    onStartCall(random.title, random.prompt);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-zinc-950">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
           <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Drama className="text-purple-500" /> Wahala Simulator
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
         <p className="text-zinc-400 text-sm mb-6 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            Practice how to handle wahala. Choose a character for the AI to act as, then start a call. 
            <span className="block mt-2 text-xs text-yellow-500">⚠ Note: These characters might be rude or angry for training purposes.</span>
         </p>

         <div className="grid grid-cols-2 gap-4 mb-8">
            {presets.map((preset) => (
                <button 
                    key={preset.title}
                    onClick={() => onStartCall(preset.title, preset.prompt)}
                    className={`p-4 rounded-xl border flex flex-col items-start gap-3 transition-transform active:scale-95 text-left ${preset.color} bg-zinc-900`}
                >
                    <div className="text-3xl">{preset.icon}</div>
                    <span className="font-bold text-sm">{preset.title}</span>
                </button>
            ))}
         </div>
         
         <button 
            onClick={handleRandom}
            className="w-full mb-8 bg-gradient-to-r from-purple-900 to-zinc-900 border border-purple-500/30 p-4 rounded-xl flex items-center justify-center gap-2 text-white font-bold"
         >
            <Shuffle size={18} /> Surprise Me (Random Wahala)
         </button>

         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <User size={18} className="text-green-500" /> Custom Character
            </h3>
            <textarea 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white text-sm focus:border-green-500 outline-none min-h-[100px]"
                placeholder="e.g. Act as my boss who is refusing to approve my leave..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
            />
            <button 
                disabled={!customPrompt.trim()}
                onClick={() => onStartCall("Custom Character", customPrompt)}
                className="w-full mt-4 bg-green-600 disabled:opacity-50 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
                <Mic size={18} /> Start Custom Simulation
            </button>
         </div>
      </div>
    </div>
  );
};
