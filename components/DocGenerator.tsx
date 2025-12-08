import React, { useState } from 'react';
import { DOCUMENT_TEMPLATES } from '../constants';
import { generateDocumentContent } from '../services/geminiService';
import { FileText, Download, Loader2, Copy } from 'lucide-react';

export const DocGenerator: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    setFormData({});
    setGeneratedDoc('');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const template = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      const content = await generateDocumentContent(template.title, formData);
      setGeneratedDoc(content);
    }
    setIsGenerating(false);
  };

  const activeTemplate = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="p-5 pb-32">
       <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-purple-500" />
          Doc Generator
        </h1>
        <p className="text-zinc-400 mt-2">
          Create simple legal drafts. <span className="text-yellow-500 italic">Always verify with a lawyer.</span>
        </p>
      </div>

      {!selectedTemplate ? (
        <div className="grid gap-4">
          {DOCUMENT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplateSelect(t.id)}
              className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-left hover:border-green-500 transition-all group"
            >
              <h3 className="font-bold text-white text-lg group-hover:text-green-500 mb-1">{t.title}</h3>
              <p className="text-sm text-zinc-400">{t.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
           <button 
             onClick={() => setSelectedTemplate(null)}
             className="text-sm text-zinc-500 hover:text-white mb-4 flex items-center gap-1"
           >
             ← Back to templates
           </button>

           {!generatedDoc ? (
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
               <h3 className="text-xl font-bold mb-6 text-green-500">{activeTemplate?.title}</h3>
               <div className="space-y-4">
                 {activeTemplate?.fields.map(field => (
                   <div key={field}>
                     <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">{field}</label>
                     <input
                       type="text"
                       className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                       onChange={(e) => handleInputChange(field, e.target.value)}
                     />
                   </div>
                 ))}
               </div>
               <button
                 onClick={handleGenerate}
                 disabled={isGenerating}
                 className="w-full mt-8 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
               >
                 {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate Draft'}
               </button>
             </div>
           ) : (
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative">
               <div className="absolute top-4 right-4 flex gap-2">
                 <button className="p-2 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700">
                   <Copy size={18} />
                 </button>
               </div>
               <h3 className="text-sm font-bold text-green-500 mb-4 uppercase">Draft Preview</h3>
               <div className="font-mono text-sm text-zinc-300 whitespace-pre-wrap bg-black/30 p-4 rounded-lg border border-zinc-800">
                 {generatedDoc}
               </div>
               <button 
                onClick={() => setGeneratedDoc('')}
                className="w-full mt-4 py-3 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg"
               >
                 Create New
               </button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};