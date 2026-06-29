
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { ChatInterface } from './components/ChatInterface';
import { QuickActionGrid } from './components/QuickActionGrid';
import { PoliceWahalaMode } from './components/PoliceWahalaMode';
import { DocGenerator } from './components/DocGenerator';
import { LiveCallInterface } from './components/LiveCallInterface';
import { FakeCallSetup } from './components/FakeCallSetup';
import { ViewState, UserMode, UserLanguage } from './types';
import { ToggleLeft, ToggleRight, Globe, User, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [userMode, setUserMode] = useState<UserMode>('cruise');
  const [userLanguage, setUserLanguage] = useState<UserLanguage>(() => {
    try {
      const stored = localStorage.getItem('lexai_language');
      return (stored as UserLanguage) || 'english_pidgin';
    } catch {
      return 'english_pidgin';
    }
  });
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  
  // State for Fake Call
  const [fakeCallConfig, setFakeCallConfig] = useState<{title: string, prompt: string} | undefined>(undefined);

  const handleLanguageChange = (lang: UserLanguage) => {
    setUserLanguage(lang);
    try {
      localStorage.setItem('lexai_language', lang);
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setChatInitialPrompt(prompt);
    setCurrentView('chat');
  };

  const handleStartFakeCall = (title: string, prompt: string) => {
      setFakeCallConfig({ title, prompt });
      setCurrentView('call');
  };

  const handleEndCall = () => {
      if (fakeCallConfig) {
          // If we were in a fake call simulation, go back to the setup screen to try another
          setFakeCallConfig(undefined);
          setCurrentView('fakeCallSetup');
      } else {
          // Normal call ended
          setCurrentView('home');
      }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-0 md:p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black overflow-hidden relative">
      {/* Ambient background decoration for desktop */}
      <div className="hidden md:block absolute top-[10%] left-[10%] w-96 h-96 bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-[10%] right-[10%] w-96 h-96 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative Brand Info on Desktop Sides */}
      <div className="hidden xl:flex absolute left-12 top-1/2 -translate-y-1/2 flex-col space-y-4 max-w-[280px] pointer-events-none text-left select-none">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent">LexAI</span>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold">v1.1.0</span>
        </div>
        <p className="text-sm text-zinc-500 font-normal leading-relaxed">
          Your street-smart Legal Padi wey get sense + cruise. Fast legal counsel, document generator, and crisis mock simulators inside one beautiful workspace.
        </p>
        <div className="pt-2 flex flex-col gap-1.5 font-mono text-xs text-zinc-600">
          <div>● CONSTITUTION-GROUNDED</div>
          <div>● REAL-TIME AI VOICE CALLS</div>
          <div>● CRUISE & SERIOUS MODES</div>
        </div>
      </div>

      <div className="hidden xl:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col space-y-4 max-w-[280px] pointer-events-none text-right select-none">
        <div className="text-sm font-semibold uppercase text-zinc-600 tracking-wider">Active Workspace</div>
        <div className="text-xs text-zinc-500 font-mono">
          <div>User: <span className="text-zinc-400">Murtala</span></div>
          <div>Language: <span className="text-zinc-400">
            {userLanguage === 'english_pidgin' ? 'Pidgin / English' :
             userLanguage === 'hausa' ? 'Hausa' :
             userLanguage === 'igbo' ? 'Igbo' :
             userLanguage === 'yoruba' ? 'Yoruba' : 'Pidgin / English'}
          </span></div>
          <div>Mode: <span className="text-zinc-400">{userMode.toUpperCase()}</span></div>
        </div>
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-[11px] text-zinc-600 leading-normal">
            Designed for secure local compliance testing and mobile-first responsive scaling.
          </p>
        </div>
      </div>

      {/* Center Phone Shell */}
      <div className="w-full max-w-none md:max-w-[420px] h-screen md:h-[840px] md:rounded-[48px] md:border-[10px] md:border-zinc-800/90 bg-zinc-950 flex flex-col relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-all duration-300 md:ring-1 md:ring-white/5">
        
        {/* Phone Notch/Dynamic Island simulation on Desktop */}
        <div className="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 items-center justify-center border border-white/5">
          <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full ml-auto mr-4 border border-zinc-800/50" />
        </div>

        {/* Status bar simulation on Desktop */}
        <div className="hidden md:flex justify-between items-center px-8 pt-4 pb-2 text-[11px] font-semibold text-zinc-400 font-mono z-40 select-none bg-zinc-950/40 backdrop-blur-md">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span>NGA 5G</span>
            <div className="w-4 h-2.5 border border-zinc-500 rounded-sm p-0.5 flex items-center">
              <div className="w-2 h-full bg-green-500 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Real App Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!hasOnboarded ? (
            <Onboarding onComplete={() => setHasOnboarded(true)} />
          ) : (
            <Layout currentView={currentView} onChangeView={setCurrentView}>
              
              {/* Profile/Settings Header overlay - hide on chat/call to avoid clutter */}
              {currentView === 'home' && (
                 <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentView('profile')}
                        className="p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all active:scale-90"
                        title="Profile & Language Settings"
                    >
                        <User size={18} />
                    </button>
                    <button 
                        onClick={() => setUserMode(prev => prev === 'cruise' ? 'serious' : 'cruise')}
                        className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10"
                    >
                        <span className={`text-xs font-bold ${userMode === 'cruise' ? 'text-green-500' : 'text-zinc-500'}`}>CRUISE</span>
                        {userMode === 'cruise' ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-zinc-500" />}
                        <span className={`text-xs font-bold ${userMode === 'serious' ? 'text-blue-500' : 'text-zinc-500'}`}>SERIOUS</span>
                    </button>
                 </div>
              )}

              {currentView === 'home' && (
                <QuickActionGrid 
                    onActionClick={handleQuickAction} 
                    onSimulatorClick={() => setCurrentView('fakeCallSetup')}
                    userName="Murtala" 
                />
              )}
              
              {currentView === 'chat' && (
                <ChatInterface 
                    mode={userMode} 
                    language={userLanguage}
                    initialPrompt={chatInitialPrompt} 
                    onClearInitialPrompt={() => setChatInitialPrompt(undefined)}
                />
              )}

              {currentView === 'police' && (
                <PoliceWahalaMode />
              )}

              {currentView === 'documents' && (
                <DocGenerator />
              )}

              {currentView === 'call' && (
                <LiveCallInterface 
                    mode={userMode} 
                    language={userLanguage}
                    onEndCall={handleEndCall}
                    customConfig={fakeCallConfig}
                />
              )}
              
              {currentView === 'fakeCallSetup' && (
                  <FakeCallSetup 
                    onBack={() => setCurrentView('home')}
                    onStartCall={handleStartFakeCall}
                  />
              )}

              {currentView === 'profile' && (
                <div className="p-6 flex flex-col items-center min-h-full text-center space-y-5 animate-in fade-in duration-300 relative w-full">
                    <div className="w-full flex justify-start pt-2">
                      <button 
                        onClick={() => setCurrentView('home')}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl active:scale-95 shadow-sm"
                      >
                        <ArrowLeft size={14} /> Back to Home
                      </button>
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-tr from-green-500/20 to-purple-500/20 border border-zinc-850 rounded-full flex items-center justify-center text-3xl shadow-md">😎</div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Murtala's Profile</h2>
                    
                    <div className="w-full bg-zinc-900 border border-zinc-850 rounded-2xl p-4 text-left shadow-sm space-y-4">
                        <div>
                            <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2.5">User Settings</h3>
                            <div className="flex justify-between items-center py-2.5 border-b border-zinc-800/60">
                                <span className="text-sm font-medium text-zinc-300">Notifications</span>
                                <span className="text-xs bg-green-500/10 text-green-400 font-bold px-2 py-0.5 rounded border border-green-500/20">Active</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1">
                                <Globe size={11} className="text-zinc-400 animate-pulse" />
                                Select App Language
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {[
                                  { id: 'english_pidgin', label: 'Pidgin / Eng', flag: '🇳🇬' },
                                  { id: 'hausa', label: 'Hausa', flag: '🕌' },
                                  { id: 'igbo', label: 'Igbo', flag: '🐆' },
                                  { id: 'yoruba', label: 'Yoruba', flag: '👑' }
                                ].map((lang) => (
                                  <button
                                    key={lang.id}
                                    onClick={() => handleLanguageChange(lang.id as UserLanguage)}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                      userLanguage === lang.id
                                        ? 'bg-green-600 border-green-500 text-white shadow-md'
                                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                    }`}
                                  >
                                    <span className="text-sm">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                  </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <p className="text-zinc-600 text-[11px] font-mono">LexAI v1.1.0 (Nigeria Multi-Lingual Edition)</p>
                </div>
              )}

            </Layout>
          )}
        </div>

        {/* Home Indicator simulation on Desktop */}
        <div className="hidden md:block absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-700/80 rounded-full z-50" />
      </div>
    </div>
  );
};

export default App;
