import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertTriangle, Terminal } from 'lucide-react';
import { ChatMessage, UserMode } from '../types';
import { sendMessageToLexAI } from '../services/geminiService';
import ReactMarkdown from 'react'; // Not using real react-markdown to avoid deps, implementing simple renderer

interface ChatInterfaceProps {
  mode: UserMode;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ mode, initialPrompt, onClearInitialPrompt }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to format simple markdown-like text
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-green-400 font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        })}
        <br />
      </React.Fragment>
    ));
  };

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await sendMessageToLexAI(text, history, mode);
      
      const newBotMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        isRedFlag: text.toLowerCase().includes('police') || text.toLowerCase().includes('arrest')
      };

      setMessages(prev => [...prev, newBotMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 glass-panel border-b border-zinc-800 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${mode === 'cruise' ? 'bg-green-500/20' : 'bg-blue-600/20'}`}>
            {mode === 'cruise' ? <Sparkles className="text-green-500 w-5 h-5" /> : <Terminal className="text-blue-500 w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-none">{mode === 'cruise' ? 'LexAI Cruise Mode' : 'LexAI Serious Mode'}</h2>
            <p className="text-xs text-zinc-400">
              {mode === 'cruise' ? 'Street smart & legally sound' : 'Professional legal assistance'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50 mt-10">
            <Bot size={48} className="text-green-500 mb-2" />
            <p className="text-lg font-medium">Talk your mind, I dey here for you.</p>
            <div className="text-sm text-zinc-400 max-w-xs">
              Ask about Police, Landlord, Business, or any legal wahala.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-white rounded-tr-none'
                  : 'bg-green-900/20 border border-green-500/20 text-zinc-100 rounded-tl-none'
              }`}
            >
              {msg.role === 'model' && (
                <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-green-500/10">
                   <Bot size={16} className="text-green-500" />
                   <span className="text-xs font-bold text-green-500 uppercase">LexAI</span>
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {formatText(msg.text)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-zinc-900 rounded-2xl p-4 rounded-tl-none flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
           </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 glass-panel border-t border-zinc-800 pb-24">
        <div className="relative flex items-center bg-zinc-900/50 rounded-full border border-zinc-700 focus-within:border-green-500 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Type your wahala here..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 px-5 py-3.5 text-sm"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="p-2 mr-2 bg-green-600 rounded-full text-white disabled:opacity-50 hover:bg-green-500 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};