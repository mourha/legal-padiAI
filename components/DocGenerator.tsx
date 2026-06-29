import React, { useState, useEffect } from 'react';
import { DOCUMENT_TEMPLATES } from '../constants';
import { generateDocumentContent } from '../services/geminiService';
import { 
  FileText, 
  Download, 
  Loader2, 
  Copy, 
  Trash2, 
  Bookmark, 
  BookmarkCheck,
  Search, 
  FolderOpen, 
  ChevronRight, 
  Calendar,
  Check,
  Eye,
  Share2
} from 'lucide-react';

interface SavedDocument {
  id: string;
  title: string;
  templateTitle: string;
  templateId: string;
  content: string;
  formData: Record<string, string>;
  createdAt: string;
}

export const DocGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'my-docs'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Save State
  const [docName, setDocName] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');

  // Selected saved document for viewing in full detail
  const [viewingSavedDoc, setViewingSavedDoc] = useState<SavedDocument | null>(null);

  // Local Storage Documents
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>(() => {
    try {
      const local = localStorage.getItem('lexai_saved_documents');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      console.error('Failed to parse saved documents:', e);
      return [];
    }
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('lexai_saved_documents', JSON.stringify(savedDocs));
  }, [savedDocs]);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    setFormData({});
    setGeneratedDoc('');
    setIsSaved(false);
    
    // Set a default name for the document based on the current date
    const template = DOCUMENT_TEMPLATES.find(t => t.id === id);
    if (template) {
      const dateStr = new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setDocName(`${template.title} (${dateStr})`);
    }
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
      setIsSaved(false);
    }
    setIsGenerating(false);
  };

  // Save document to local storage
  const handleSaveDocument = () => {
    if (!generatedDoc || !selectedTemplate) return;
    const template = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    const newDoc: SavedDocument = {
      id: Math.random().toString(36).substring(2, 11),
      title: docName.trim() || template.title,
      templateTitle: template.title,
      templateId: selectedTemplate,
      content: generatedDoc,
      formData: { ...formData },
      createdAt: new Date().toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setSavedDocs(prev => [newDoc, ...prev]);
    setIsSaved(true);
  };

  // Delete saved document
  const handleDeleteDoc = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      setSavedDocs(prev => prev.filter(doc => doc.id !== id));
      if (viewingSavedDoc?.id === id) {
        setViewingSavedDoc(null);
      }
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Real text download trigger
  const handleDownloadDoc = (doc: SavedDocument | { title: string, content: string }) => {
    const element = document.createElement("a");
    const file = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const activeTemplate = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate);

  // Filter saved docs based on search
  const filteredDocs = savedDocs.filter(doc => 
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.templateTitle.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="p-5 pb-32">
      {/* Page Title */}
      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-purple-500" />
          Doc Generator
        </h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Create simple legally-sound drafts. <span className="text-yellow-500 italic">Always verify with a lawyer before signing.</span>
        </p>
      </div>

      {/* Tabs */}
      {!selectedTemplate && !viewingSavedDoc && (
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 mb-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'templates' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('my-docs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative ${
              activeTab === 'my-docs' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderOpen size={16} />
            My Documents
            {savedDocs.length > 0 && (
              <span className="absolute top-2 right-4 bg-green-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {savedDocs.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* --- TEMPLATES TAB --- */}
      {activeTab === 'templates' && !selectedTemplate && !viewingSavedDoc && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          {DOCUMENT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplateSelect(t.id)}
              className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-left hover:border-green-500 transition-all group active:scale-[0.99] flex justify-between items-center"
            >
              <div className="pr-4">
                <h3 className="font-bold text-white text-lg group-hover:text-green-500 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 opacity-60" />
                  {t.title}
                </h3>
                <p className="text-sm text-zinc-400 font-normal leading-normal">{t.description}</p>
              </div>
              <ChevronRight className="text-zinc-600 group-hover:text-green-400 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* --- TEMPLATE FILL & GENERATION SCREEN --- */}
      {selectedTemplate && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => setSelectedTemplate(null)}
            className="text-sm text-zinc-500 hover:text-white mb-4 flex items-center gap-1 font-semibold"
          >
            ← Back to templates
          </button>

          {!generatedDoc ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-1 text-green-500">{activeTemplate?.title}</h3>
              <p className="text-xs text-zinc-400 mb-6 font-normal">Enter details below to auto-generate your agreement draft.</p>
              
              <div className="space-y-4">
                {activeTemplate?.fields.map(field => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">{field}</label>
                    <input
                      type="text"
                      placeholder={`e.g. Enter ${field.toLowerCase()}`}
                      className="w-full bg-zinc-950 border border-zinc-700/60 rounded-lg p-3 text-white text-sm focus:border-green-500 outline-none transition-all placeholder:text-zinc-600"
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
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin text-black" size={18} />
                    <span className="text-black">LexAI dey cook draft...</span>
                  </>
                ) : (
                  'Generate Agreement Draft'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Save/Naming Panel */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">Save Document to My Documents</h4>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Enter custom document title"
                    className="flex-1 bg-zinc-950 border border-zinc-700/60 rounded-lg px-3.5 py-2 text-sm text-white focus:border-green-500 outline-none transition-all"
                  />
                  <button
                    onClick={handleSaveDocument}
                    disabled={isSaved}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${
                      isSaved 
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {isSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Draft Preview</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopyToClipboard(generatedDoc, 'preview')}
                      className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90"
                      title="Copy Draft"
                    >
                      {copiedId === 'preview' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDownloadDoc({ title: docName || activeTemplate?.title || 'Draft', content: generatedDoc })}
                      className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90"
                      title="Download as .txt"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="font-mono text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-950 p-4 rounded-lg border border-zinc-800 max-h-[400px] overflow-y-auto leading-relaxed">
                  {generatedDoc}
                </div>

                <button 
                  onClick={() => setGeneratedDoc('')}
                  className="w-full mt-5 py-3 text-sm text-zinc-400 hover:text-white font-bold border border-zinc-800 rounded-lg hover:bg-zinc-800/40 transition-all"
                >
                  Create New Draft
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MY DOCUMENTS TAB --- */}
      {activeTab === 'my-docs' && !selectedTemplate && !viewingSavedDoc && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Search Bar */}
          {savedDocs.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Search saved documents..."
                className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
              <FolderOpen size={48} className="text-zinc-600 mb-4 stroke-[1.5]" />
              <h3 className="font-bold text-white text-base">No documents saved</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-[240px] leading-normal font-normal">
                {docSearchQuery ? "No matches found for your search query." : "Choose any template above and save your draft to access it anytime!"}
              </p>
              {!docSearchQuery && (
                <button
                  onClick={() => setActiveTab('templates')}
                  className="mt-5 px-4 py-2 bg-purple-600/15 text-purple-400 text-xs font-bold rounded-lg border border-purple-500/20 hover:bg-purple-600/25 transition-all"
                >
                  Browse Templates
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setViewingSavedDoc(doc)}
                  className="bg-zinc-900 border border-zinc-850 p-4.5 rounded-xl hover:border-purple-500/40 transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden"
                >
                  <div className="space-y-1 pr-6 flex-1">
                    <h4 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors line-clamp-1">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">
                        {doc.templateTitle.split(' ')[0]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {doc.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(doc.content, doc.id);
                      }}
                      className="p-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all active:scale-90 flex items-center justify-center"
                      title="Share / Copy content"
                    >
                      {copiedId === doc.id ? <Check size={12} className="text-green-500" /> : <Share2 size={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDoc(doc);
                      }}
                      className="p-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all active:scale-90"
                      title="Download text"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all active:scale-90"
                      title="Delete document"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SINGLE SAVED DOCUMENT DETAIL PREVIEW --- */}
      {viewingSavedDoc && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => setViewingSavedDoc(null)}
            className="text-sm text-zinc-500 hover:text-white mb-4 flex items-center gap-1 font-semibold"
          >
            ← Back to documents list
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative">
            <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{viewingSavedDoc.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Template: {viewingSavedDoc.templateTitle} | Saved on {viewingSavedDoc.createdAt}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleCopyToClipboard(viewingSavedDoc.content, 'saved-detail')}
                  className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                  title="Share / Copy Draft"
                >
                  {copiedId === 'saved-detail' ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                </button>
                <button 
                  onClick={() => handleDownloadDoc(viewingSavedDoc)}
                  className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90"
                  title="Download as .txt"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteDoc(viewingSavedDoc.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all active:scale-90"
                  title="Delete Document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Inputs Metadata accordion */}
            {Object.keys(viewingSavedDoc.formData || {}).length > 0 && (
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 mb-4">
                <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Details Provided:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(viewingSavedDoc.formData).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">{k}</span>
                      <span className="text-zinc-300 font-medium">{v || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="font-mono text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-950 p-4 rounded-lg border border-zinc-800 max-h-[420px] overflow-y-auto leading-relaxed">
              {viewingSavedDoc.content}
            </div>

            <button 
              onClick={() => setViewingSavedDoc(null)}
              className="w-full mt-5 py-3 text-sm text-zinc-400 hover:text-white font-bold border border-zinc-800 rounded-lg hover:bg-zinc-800/40 transition-all"
            >
              Done Viewing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
