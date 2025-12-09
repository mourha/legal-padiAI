
import React, { useEffect, useState, useRef } from 'react';
import { Phone, Mic, MicOff, X, Sparkles, Terminal, RefreshCw, AlertCircle, Loader2, Drama } from 'lucide-react';
import { UserMode } from '../types';
import { LiveSessionManager } from '../services/geminiService';

interface LiveCallInterfaceProps {
  mode: UserMode;
  onEndCall: () => void;
  customConfig?: {
      title: string;
      prompt: string;
  }
}

export const LiveCallInterface: React.FC<LiveCallInterfaceProps> = ({ mode, onEndCall, customConfig }) => {
  const [status, setStatus] = useState("Initializing...");
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const sessionRef = useRef<LiveSessionManager | null>(null);

  useEffect(() => {
    sessionRef.current = new LiveSessionManager();
    setHasError(false);
    setIsConnecting(true);

    sessionRef.current.connect(
      mode,
      (newStatus) => {
          setStatus(newStatus);
          
          if (newStatus.includes("Error") || newStatus.includes("Unavailable") || newStatus.includes("Denied")) {
              setHasError(true);
              setIsConnecting(false);
          } else if (newStatus.includes("Listening") || newStatus.includes("hear") || newStatus.includes("Ready")) {
              setIsConnecting(false);
          }
      },
      (vol) => setVolume(Math.min(vol * 5, 1)),
      customConfig?.prompt // Pass the custom prompt if it exists
    );

    return () => {
      sessionRef.current?.disconnect();
    };
  }, [mode, retryCount, customConfig]);

  const handleEndCall = () => {
    sessionRef.current?.disconnect();
    onEndCall();
  };

  const handleRetry = () => {
      if (isConnecting) return;
      setHasError(false);
      setIsConnecting(true);
      setStatus("Retrying...");
      setRetryCount(prev => prev + 1);
  };

  // Determine if AI is currently speaking based on status text from service
  const isAiSpeaking = status.includes("Padi dey talk") || status.includes("Speaking") || status.includes("Actor Speaking");
  const isListening = !isAiSpeaking && !hasError && !isConnecting;
  const isFakeCall = !!customConfig;

  // Helper for smooth dynamic scaling based on volume
  const getDynamicScale = (baseScale: number, multiplier: number) => ({
    transform: `scale(${baseScale + (isListening ? volume : 0.1) * multiplier})`
  });

  // Dynamic Theme Colors
  const getThemeColor = () => {
      if (hasError) return 'red';
      if (isFakeCall) return 'orange'; // Simulator color
      if (mode === 'cruise') return 'green';
      return 'blue';
  };
  
  const theme = getThemeColor();
  const themeClasses = {
      bg: isFakeCall ? 'bg-orange-600' : (mode === 'cruise' ? 'bg-green-600' : 'bg-blue-800'),
      border: isFakeCall ? 'border-orange-500/30' : (mode === 'cruise' ? 'border-green-500/30' : 'border-blue-500/30'),
      badge: isFakeCall ? 'bg-orange-500/10 text-orange-400' : (mode === 'cruise' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'),
      text: isFakeCall ? 'text-orange-500' : (mode === 'cruise' ? 'text-green-500' : 'text-blue-500'),
      glow: isFakeCall ? 'from-orange-400 to-red-500' : (mode === 'cruise' ? 'from-green-400 to-yellow-500' : 'from-blue-600 to-purple-600')
  };

  return (
    <div className="h-full flex flex-col items-center justify-between p-8 bg-zinc-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 transition-colors duration-1000
        ${hasError ? 'bg-red-900' : themeClasses.bg}`}
      ></div>

      {/* Header */}
      <div className="z-10 text-center mt-8">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-colors duration-500 ${hasError ? 'border-red-500/30 bg-red-500/10 text-red-400' : themeClasses.border + ' ' + themeClasses.badge}`}>
           {hasError ? <AlertCircle size={16} /> : isFakeCall ? <Drama size={16} /> : (mode === 'cruise' ? <Sparkles size={16} /> : <Terminal size={16} />)}
           <span className="text-xs font-bold uppercase tracking-wider">
               {isFakeCall ? 'Simulation Mode' : (mode === 'cruise' ? 'Padi Cruise Line' : 'Legal Counsel')}
           </span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-4">
            {customConfig ? customConfig.title : (mode === 'cruise' ? 'Barrister Lex' : 'LexAI Counsel')}
        </h2>
        <p className={`text-sm font-medium mt-2 transition-colors duration-300 ${hasError ? 'text-red-400' : themeClasses.text}`}>
            {status}
        </p>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex items-center justify-center w-full z-10 relative">
         
         {/* AI SPEAKING ANIMATION: Radiating Waves */}
         {isAiSpeaking && (
            <>
               <div className={`absolute w-72 h-72 rounded-full opacity-20 animate-ping ${isFakeCall ? 'bg-orange-500' : (mode === 'cruise' ? 'bg-green-400' : 'bg-blue-500')}`} style={{ animationDuration: '2s' }}></div>
               <div className={`absolute w-60 h-60 rounded-full opacity-30 animate-ping ${isFakeCall ? 'bg-red-500' : (mode === 'cruise' ? 'bg-yellow-400' : 'bg-purple-500')}`} style={{ animationDuration: '2s', animationDelay: '0.4s' }}></div>
            </>
         )}

         {/* LISTENING ANIMATION */}
         {isListening && (
            <>
               <div 
                 className={`absolute w-72 h-72 rounded-full border opacity-20 transition-colors duration-500 ${isFakeCall ? 'border-orange-500 bg-orange-500/5' : (mode === 'cruise' ? 'border-green-500 bg-green-500/5' : 'border-blue-500 bg-blue-500/5')}`}
                 style={getDynamicScale(1, 1)}
               ></div>
               <div 
                 className={`absolute w-56 h-56 rounded-full border opacity-40 transition-colors duration-500 ${isFakeCall ? 'border-orange-500' : (mode === 'cruise' ? 'border-yellow-500' : 'border-purple-500')}`}
                 style={getDynamicScale(1, 0.5)}
               ></div>
            </>
         )}

         {/* Center Core Orb */}
         <div 
            className={`relative z-20 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl
                ${hasError ? 'bg-zinc-900 border-4 border-red-600 shadow-red-900/50' : ''}
                
                ${!hasError && isAiSpeaking ? `bg-gradient-to-br ${themeClasses.glow} scale-110` : ''}
                
                ${!hasError && !isAiSpeaking ? `bg-zinc-900 border-2 ${themeClasses.border}` : ''}
            `}
            style={!isAiSpeaking && !hasError ? getDynamicScale(1, 0.15) : {}}
         >
             {/* Icon Logic */}
             {hasError ? (
                 <AlertCircle size={48} className="text-red-500" />
             ) : isAiSpeaking ? (
                 isFakeCall ? <Drama size={48} className="text-white animate-bounce" /> :
                 mode === 'cruise' ? 
                    <Sparkles size={48} className="text-white animate-bounce" /> : 
                    <div className="flex gap-1 items-end h-8">
                        <div className="w-1.5 bg-white animate-[bounce_1s_infinite] h-4"></div>
                        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_0.2s] h-8"></div>
                        <div className="w-1.5 bg-white animate-[bounce_1s_infinite_0.4s] h-5"></div>
                    </div>
             ) : (
                 <div className={`transition-all duration-300 ${volume > 0.05 ? 'scale-110' : 'scale-100 opacity-60'}`}>
                      {isMuted ? 
                        <MicOff size={40} className="text-zinc-600" /> : 
                        <Mic size={40} className={themeClasses.text} />
                      }
                 </div>
             )}
         </div>
      </div>

      {/* Controls */}
      <div className="z-10 w-full max-w-xs flex items-center justify-center gap-6 mb-8">
         {hasError ? (
            <button 
                onClick={handleRetry}
                disabled={isConnecting}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />} 
                {isConnecting ? "Connecting..." : "Retry Connection"}
            </button>
         ) : (
             <>
                <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full flex items-center justify-center transition-all active:scale-95 ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button 
                    onClick={handleEndCall}
                    className="p-6 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-xl shadow-red-600/30 transform hover:scale-110 active:scale-95 transition-all"
                >
                    <Phone size={32} className="rotate-[135deg]" />
                </button>
             </>
         )}
         
         {hasError && (
            <button 
                onClick={onEndCall}
                className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 flex items-center justify-center border border-zinc-700"
            >
                <X size={24} />
            </button>
         )}
      </div>

      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4 z-10 opacity-60">
         {isFakeCall ? 'Simulated Scenario - For Practice Only' : (mode === 'cruise' ? 'Powered by Street Sense & Gemini' : 'Powered by Gemini AI')}
      </p>
    </div>
  );
};
