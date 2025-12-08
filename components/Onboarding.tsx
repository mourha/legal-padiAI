import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "No Dey Fear. Know Your Right.",
      subtitle: "Your legal padi wey get sense + cruise. We de here to simplify Nigerian law for you.",
      image: "https://picsum.photos/400/400?grayscale" // Placeholder abstract
    },
    {
      title: "Police? Tenant? Work Wahala?",
      subtitle: "Anything wey fit turn problem, we get the legal answer inside constitution.",
      image: "https://picsum.photos/400/401?grayscale"
    },
    {
      title: "Choose Your Vibe",
      subtitle: "You fit switch anytime inside app.",
      isSelection: true
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-green-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />

      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 text-center">
        {!steps[step].isSelection ? (
            <>
                <div className="w-64 h-64 rounded-2xl bg-zinc-900 border border-zinc-800 mb-10 overflow-hidden shadow-2xl shadow-black">
                     {/* Using a solid color block instead of external image for reliability in demo, or simple styling */}
                     <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                        <span className="text-6xl">⚖️</span>
                     </div>
                </div>
                <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                    {steps[step].title}
                </h1>
                <p className="text-zinc-400 text-lg">
                    {steps[step].subtitle}
                </p>
            </>
        ) : (
            <div className="w-full max-w-sm space-y-6">
                 <h1 className="text-3xl font-bold text-white mb-8">How make I talk to you?</h1>
                 
                 <button className="w-full bg-zinc-900 border-2 border-green-500 p-6 rounded-2xl flex items-center justify-between group">
                    <div className="text-left">
                        <div className="font-bold text-green-500 text-lg mb-1">🎭 Cruise Mode</div>
                        <div className="text-zinc-400 text-sm">Pidgin, Street Smart, Funny</div>
                    </div>
                    <CheckCircle2 className="text-green-500" />
                 </button>

                 <button className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between opacity-60">
                    <div className="text-left">
                        <div className="font-bold text-zinc-300 text-lg mb-1">⚖️ Serious Mode</div>
                        <div className="text-zinc-500 text-sm">Formal, English, Strict</div>
                    </div>
                 </button>
            </div>
        )}
      </div>

      <div className="p-8 z-10">
        <button
          onClick={handleNext}
          className="w-full bg-white text-black font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          {step === steps.length - 1 ? "Start Cruising" : "Next"} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};