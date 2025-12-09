import React, { useState } from 'react';
import { ShieldAlert, Car, Users, Building2, AlertTriangle, ChevronLeft, Mic, Video, Phone, Eye } from 'lucide-react';

type Scenario = 'traffic' | 'raid' | 'detention' | null;

export const PoliceWahalaMode: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>(null);

  const scenarios = [
    {
      id: 'traffic',
      title: 'Traffic Stop',
      icon: Car,
      desc: 'Vehicle papers, tinted glass permit, trunk search.',
      steps: [
        "Park safely. Turn on interior light if it's night.",
        "Keep hands visible on the steering wheel.",
        "Present vehicle papers through the window if possible.",
        "They can search the car if they suspect a crime, but ask politely for reason.",
        "Do NOT step out unless they command you to.",
      ],
      rights: "Section 49 of Police Act: A police officer may stop a vehicle on suspicion of a crime."
    },
    {
      id: 'raid',
      title: 'Street Raid / Stop & Search',
      icon: Users,
      desc: 'Laptop bag search, phone check, profiling.',
      steps: [
        "Stop immediately. Do NOT run.",
        "Identify yourself clearly (Name, Work/Student ID).",
        "Phone Search: They need a warrant (Section 37 Constitution).",
        "Laptop: If they insist, open it yourself. Do not let them scroll aimlessly.",
        "Stay calm, do not argue aggressively."
      ],
      rights: "Section 37 Constitution: Right to privacy (phones/homes)."
    },
    {
      id: 'detention',
      title: 'Arrest / Detention',
      icon: Building2,
      desc: 'Taken to station, statement writing, bail.',
      steps: [
        "Ask: 'Am I under arrest?' and 'What is my offense?'",
        "Silence: Say 'I will remain silent until I see my lawyer.'",
        "Statement: Do NOT write or sign anything without a lawyer present.",
        "Bail: Bail is technically free. Call a family member immediately.",
        "Do not offer money as bribe inside the station."
      ],
      rights: "Section 35 Constitution: Right to personal liberty & silence."
    }
  ];

  const activeScenario = scenarios.find(s => s.id === scenario);

  return (
    <div className="p-5 pb-32">
       {/* Header */}
      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
          POLICE WAHALA
        </h1>
        <p className="text-zinc-400 mt-2">
          If police stop you, stay calm. Knowledge is your defense.
        </p>
      </div>

      {/* Emergency Action - Always Visible */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-red-400 text-sm uppercase mb-1">Emergency Rule #1</h3>
          <p className="text-white font-medium text-sm">Do NOT fight. Do NOT run.</p>
        </div>
        <AlertTriangle className="text-red-500 w-8 h-8" />
      </div>

      {!scenario ? (
        <div className="space-y-4">
           <h2 className="text-lg font-bold text-white mb-2">Wetin happen? Select Scenario:</h2>
           <div className="grid gap-4">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id as Scenario)}
                  className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center gap-4 hover:border-red-500 transition-all text-left group"
                >
                    <div className="p-3 bg-zinc-800 rounded-full text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <s.icon size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{s.title}</h3>
                        <p className="text-sm text-zinc-400">{s.desc}</p>
                    </div>
                </button>
              ))}
           </div>
           
           {/* General Quick Tips */}
           <div className="mt-8">
               <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4">Quick Legal Checks</h3>
               <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <Phone className="text-yellow-500 mb-3" />
                    <h3 className="font-bold text-white mb-1">Phone?</h3>
                    <p className="text-xs text-zinc-400 leading-snug">
                        Warrant needed for search. (Sec 37).
                    </p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <Mic className="text-blue-500 mb-3" />
                    <h3 className="font-bold text-white mb-1">Silence?</h3>
                    <p className="text-xs text-zinc-400 leading-snug">
                        You have the right to shut up. Use it.
                    </p>
                    </div>
                </div>
           </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
                onClick={() => setScenario(null)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
            >
                <ChevronLeft size={20} /> Back to Scenarios
            </button>

            <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                        {activeScenario?.icon && <activeScenario.icon size={24} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{activeScenario?.title}</h2>
                </div>
                
                <div className="bg-black/30 p-3 rounded-lg border-l-4 border-green-500 mb-6">
                    <p className="text-green-400 text-sm italic">
                        "{activeScenario?.rights}"
                    </p>
                </div>

                <h3 className="text-lg font-bold text-white mb-4">Steps to Take</h3>
                <div className="space-y-4">
                    {activeScenario?.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-start bg-black/20 p-3 rounded-lg border border-zinc-800/50">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                        </span>
                        <p className="text-sm text-zinc-200">{step}</p>
                    </div>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Video size={18} className="text-purple-500"/> Recording?
                </h3>
                <p className="text-sm text-zinc-400">
                    You can record in public spaces. But hold the phone chest level. Don't shove it in their face to avoid "obstruction" claims.
                </p>
            </div>
        </div>
      )}
    </div>
  );
};