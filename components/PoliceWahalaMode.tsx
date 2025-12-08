import React from 'react';
import { ShieldAlert, Phone, BookOpen, AlertTriangle, Eye, Video, Mic } from 'lucide-react';

export const PoliceWahalaMode: React.FC = () => {
  return (
    <div className="p-5 pb-32">
      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
          POLICE WAHALA
        </h1>
        <p className="text-zinc-400 mt-2">
          If police stop you, stay calm. Use this guide immediately.
        </p>
      </div>

      {/* Emergency Action */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-red-400 text-sm uppercase mb-1">Emergency Rule #1</h3>
          <p className="text-white font-medium text-sm">Do NOT fight. Do NOT run.</p>
        </div>
        <AlertTriangle className="text-red-500 w-8 h-8" />
      </div>

      {/* Quick Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <Eye className="text-green-500 mb-3" />
          <h3 className="font-bold text-white mb-1">Search?</h3>
          <p className="text-xs text-zinc-400 leading-snug">
            They need reasonable suspicion. Ask politely for a warrant if it's your home.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <Phone className="text-yellow-500 mb-3" />
          <h3 className="font-bold text-white mb-1">Phone?</h3>
          <p className="text-xs text-zinc-400 leading-snug">
            They CANNOT search your phone without a warrant. (Sec 37 Constitution).
          </p>
        </div>
         <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <Mic className="text-blue-500 mb-3" />
          <h3 className="font-bold text-white mb-1">Silence?</h3>
          <p className="text-xs text-zinc-400 leading-snug">
            You have the right to remain silent. Say "I will remain silent until I see my lawyer."
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <Video className="text-purple-500 mb-3" />
          <h3 className="font-bold text-white mb-1">Recording?</h3>
          <p className="text-xs text-zinc-400 leading-snug">
            You can record in public spaces, but do it safely without shoving camera in their face.
          </p>
        </div>
      </div>

      {/* Steps List */}
      <h3 className="text-lg font-bold text-white mb-4 pl-1 border-l-4 border-green-500">
        Steps to Take Now
      </h3>
      <div className="space-y-4">
        {[
          "Greet politely. 'Good evening officer'.",
          "Keep your hands visible on the steering wheel or at your sides.",
          "Ask: 'Am I under arrest?' If no, ask 'Am I free to go?'",
          "Do not unlock your phone for them unless forced (to protect life).",
          "Memorize their name tag or vehicle number silently."
        ].map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start bg-zinc-900/50 p-3 rounded-lg">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-green-500 flex items-center justify-center text-xs font-bold border border-green-500/30">
              {idx + 1}
            </span>
            <p className="text-sm text-zinc-300">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
};