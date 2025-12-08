
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { ChatInterface } from './components/ChatInterface';
import { QuickActionGrid } from './components/QuickActionGrid';
import { PoliceWahalaMode } from './components/PoliceWahalaMode';
import { DocGenerator } from './components/DocGenerator';
import { LiveCallInterface } from './components/LiveCallInterface';
import { ViewState, UserMode } from './types';
import { ToggleLeft, ToggleRight } from 'lucide-react';

const App: React.FC = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [userMode, setUserMode] = useState<UserMode>('cruise');
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  const handleQuickAction = (prompt: string) => {
    setChatInitialPrompt(prompt);
    setCurrentView('chat');
  };

  if (!hasOnboarded) {
    return <Onboarding onComplete={() => setHasOnboarded(true)} />;
  }

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      
      {/* Profile/Settings Header overlay - hide on chat/call to avoid clutter */}
      {currentView === 'home' && (
         <div className="absolute top-6 right-6 z-20">
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
        <QuickActionGrid onActionClick={handleQuickAction} userName="Murtala" />
      )}
      
      {currentView === 'chat' && (
        <ChatInterface 
            mode={userMode} 
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
        <LiveCallInterface mode={userMode} onEndCall={() => setCurrentView('home')} />
      )}

      {currentView === 'profile' && (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-3xl">😎</div>
            <h2 className="text-2xl font-bold">Murtala's Profile</h2>
            <div className="w-full bg-zinc-900 rounded-xl p-4 text-left">
                <h3 className="text-zinc-500 text-xs uppercase mb-2">Settings</h3>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span>Notifications</span>
                    <span className="text-green-500">On</span>
                </div>
                <div className="flex justify-between py-2">
                    <span>Language</span>
                    <span className="text-zinc-400">Pidgin/English</span>
                </div>
            </div>
            <p className="text-zinc-600 text-xs mt-10">LexAI v1.0.0 (Cruise Build)</p>
        </div>
      )}

    </Layout>
  );
};

export default App;
