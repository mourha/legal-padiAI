
import React, { useEffect, useState, useRef } from 'react';
import { Phone, Mic, MicOff, X, Sparkles, Terminal } from 'lucide-react';
import { UserMode } from '../types';
import { LiveSessionManager } from '../services/geminiService';

interface LiveCallInterfaceProps {
  mode: UserMode;
  onEndCall: () => void;
}

export const LiveCallInterface: React.FC<LiveCallInterfaceProps> = ({ mode, onEndCall }) => {
  const [status, setStatus] = useState("Initializing...");
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const sessionRef = useRef<LiveSessionManager | null>(null);

  useEffect(() => {
    sessionRef.current = new LiveSessionManager();
    
    sessionRef.current.connect(
      mode,
      (newStatus) => setStatus(newStatus),
      (vol) => setVolume(Math.min(vol * 5, 1)) // Amplify for visualizer
    );

    return () => {
      sessionRef.current?.disconnect();
    };
  }, [mode]);

  const handleEndCall = () => {
    sessionRef.current?.disconnect();
    onEndCall();
  };

  const getVisualizerColor = () => {
     if (status.includes("Speaking") || status.includes("talk")) {
        return mode === 'cruise' ? 'bg-green-400' : 'bg-blue-400';
     }
     return volume > 0.1 ? (mode === 'cruise' ? 'bg-green-500' : 'bg-blue-500') : 'bg-zinc-700';
  };

  return (
    <div className="h-full flex flex-col items-center justify-between p-8 bg-zinc-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${mode === 'cruise' ? 'bg-green-600' : 'bg-blue-800'}`}></div>

      {/* Header */}
      <div className="z-10 text-center mt-8">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${mode === 'cruise' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
           {mode === 'cruise' ? <Sparkles size={16} /> : <Terminal size={16} />}
           <span className="text-xs font-bold uppercase tracking-wider">{mode === 'cruise' ? 'Padi Cruise Line' : 'Legal Counsel'}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-4">{mode === 'cruise' ? 'Barrister Lex' : 'LexAI Counsel'}</h2>
        <p className={`text-sm font-medium mt-2 animate-pulse ${mode === 'cruise' ? 'text-green-500' : 'text-blue-500'}`}>
            {status}
        </p>
      </div>

      {/* Visualizer */}
      <div className="flex-1 flex items-center justify-center w-full z-10">
         <div className="relative flex items-center justify-center">
            {/* Outer Rings */}
            <div className={`absolute w-64 h-64 rounded-full border border-zinc-800 opacity-50 scale-[${1 + volume}] transition-transform duration-75`}></div>
            <div className={`absolute w-48 h-48 rounded-full border border-zinc-700 opacity-60 scale-[${1 + volume * 0.5}] transition-transform duration-75`}></div>
            
            {/* Core Orb */}
            <div className={`w-32 h-32 rounded-full shadow-2xl transition-all duration-100 flex items-center justify-center ${getVisualizerColor()} ${volume > 0.05 ? 'scale-110' : 'scale-100'}`}>
               <Phone size={48} className="text-white opacity-80" />
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="z-10 w-full max-w-xs grid grid-cols-3 gap-6 items-center mb-8">
         {/* Mute (Visual only for now as API handles input stream) */}
         <button 
           onClick={() => setIsMuted(!isMuted)}
           className={`p-4 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
         >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
         </button>

         {/* End Call */}
         <button 
            onClick={handleEndCall}
            className="p-6 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/30 transform hover:scale-105 transition-all"
         >
            <Phone size={32} className="rotate-[135deg]" />
         </button>

         {/* Hide/Minimize (Just goes back for now) */}
         <button 
            onClick={onEndCall}
            className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 flex items-center justify-center"
         >
            <X size={24} />
         </button>
      </div>

      <p className="text-zinc-500 text-xs mb-4 z-10">
         Note: Audio is streamed to Google AI for processing.
      </p>
    </div>
  );
};
