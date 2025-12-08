
import React from 'react';
import { Home, MessageSquare, ShieldAlert, FileText, Phone, User } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  // Hide nav during call
  if (currentView === 'call') {
      return <div className="h-screen bg-zinc-950 text-white">{children}</div>;
  }

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onChangeView(view)}
        className={`flex flex-col items-center justify-center space-y-1 w-full p-2 transition-colors ${
          isActive ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden text-white selection:bg-green-500/30">
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 relative scroll-smooth">
        {children}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-panel border-t border-zinc-800 z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto pb-safe">
          <NavItem view="home" icon={Home} label="Home" />
          <NavItem view="chat" icon={MessageSquare} label="Chat" />
          
          {/* Middle Highlighted Button - Police */}
          <button 
            onClick={() => onChangeView('police')}
            className="-mt-6 bg-red-600 rounded-full p-4 shadow-lg shadow-red-600/30 border-4 border-zinc-950 active:scale-95 transition-transform"
          >
            <ShieldAlert size={28} className="text-white animate-pulse" />
          </button>

          <NavItem view="documents" icon={FileText} label="Docs" />
          <NavItem view="call" icon={Phone} label="Call" />
        </div>
      </div>
    </div>
  );
};
