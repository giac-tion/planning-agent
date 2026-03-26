import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Key, Search, Sparkles, FileText, ExternalLink, Loader2 } from 'lucide-react';

interface Role {
  title: string;
  url: string;
  company: string;
  matchScore: string;
}

export default function App() {
  // State Management
  const [dna, setDna] = useState(localStorage.getItem('user_dna') || '');
  const [companies, setCompanies] = useState(localStorage.getItem('target_companies') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [status, setStatus] = useState('Ready');
  const [results, setResults] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAsset, setActiveAsset] = useState<{role: string, content: string} | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('user_dna', dna);
    localStorage.setItem('target_companies', companies);
    localStorage.setItem('gemini_api_key', apiKey);
  }, [dna, companies, apiKey]);

  // Phase 2: Discovery Agent Logic
  const handleDiscovery = async () => {
    if (!apiKey) return alert("Please enter your Gemini API Key first!");
    if (!companies) return alert("Add some target companies first!");

    setIsLoading(true);
    setStatus('Initializing Gemini...');
    setResults([]); 

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use Grounding with Google Search
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }] 
      });

      const companyList = companies.split('\n').filter(c => c.trim() !== '');
      const allFoundRoles: Role[] = [];

      for (const company of companyList) {
        setStatus(`Searching jobs at ${company}...`);
        
        const prompt = `
          Using Google Search, find 2-3 current active job openings at ${company}. 
          Compare these roles against this User Profile:
          ---
          ${dna}
          ---
          Return a JSON array of roles where the user meets at least 70% of requirements.
          Format EACH object in the array exactly like this:
          {"title": "Role Name", "url": "Direct Link", "company": "${company}", "matchScore": "90%"}
          ONLY return the JSON array. Do not include conversational text.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean markdown code blocks if Gemini adds them
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanJson);
          const rolesArray = Array.isArray(parsed) ? parsed : [parsed];
          allFoundRoles.push(...rolesArray);
        } catch (e) {
          console.error("JSON Parse Error for " + company, responseText);
        }
      }

      setResults(allFoundRoles);
      setStatus(allFoundRoles.length > 0 ? 'Discovery Complete!' : 'No direct matches found.');
    } catch (err: any) {
      console.error(err);
      setStatus('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 3: Asset Creator (Drafting a Cover Letter)
  const generateAssets = async (role: Role) => {
    if (!apiKey) return;
    setStatus(`Drafting assets for ${role.title}...`);
    setIsLoading(true);

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Based on my Professional DNA: "${dna}"
        And this specific job: "${role.title} at ${role.company}"
        Draft a high-impact, 3-paragraph cover letter. 
        Connect one specific "hidden talent" or certification from my DNA to a likely requirement of this role. 
        Keep it professional, punchy, and ready to send.
      `;

      const result = await model.generateContent(prompt);
      setActiveAsset({ role: role.title, content: result.response.text() });
      setStatus('Asset Generated!');
    } catch (err: any) {
      setStatus('Drafting failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-900 font-sans">
      <header className="max-w-5xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-indigo-950">Professional Planning Agent <span className="text-indigo-600">.ai</span></h1>
          <p className="text-slate-500 font-medium mt-1">Smart Job Discovery & Asset Generation</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          <Key size={18} className="text-slate-400" />
          <input 
            type="password" 
            placeholder="Gemini API Key"
            className="outline-none text-sm w-full md:w-64 bg-transparent"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: Context Vaults */}
        <div className="lg:col-span-7 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Briefcase size={20} /></div>
              <h2 className="font-bold text-xl text-slate-800">Professional DNA</h2>
            </div>
            <textarea 
              className="w-full h-80 p-5 rounded-2xl border border-slate-200 shadow-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none bg-white text-sm leading-relaxed text-slate-600"
              placeholder="Paste your resume, certifications, and 'hidden' talents here..."
              value={dna}
              onChange={(e) => setDna(e.target.value)}
            />
          </section>
        </div>

        {/* RIGHT: Targets & Actions */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Building2 size={20} /></div>
              <h2 className="font-bold text-xl text-slate-800">Target Companies</h2>
            </div>
            <textarea 
              className="w-full h-40 p-5 rounded-2xl border border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none bg-white text-sm text-slate-600"
              placeholder="Nvidia&#10;Palantir&#10;Google"
              value={companies}
              onChange={(e) => setCompanies(e.target.value)}
            />
          </section>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl shadow-xl shadow-indigo-200 text-white">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">{status}</span>
              </div>
            </div>
            <button 
              onClick={handleDiscovery}
              disabled={isLoading}
              className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Search size={20} />
              Run Discovery Agent
            </button>
          </div>
        </div>
      </main>

      {/* RESULTS SECTION */}
      {results.length > 0 && (
        <section className="max-w-5xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Sparkles size={22} /></div>
            <h2 className="text-2xl font-bold text-slate-800">Matched Opportunities</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((role, i) => (
              <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                <div className="mb-4">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{role.company}</span>
                  <h3 className="font-bold text-xl text-slate-800 mt-1">{role.title}</h3>
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {role.matchScore} Match
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <a href={role.url} target="_blank" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                    <ExternalLink size={16} /> View Job
                  </a>
                  <button 
                    onClick={() => generateAssets(role)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    <FileText size={16} /> Draft Letter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ASSET MODAL / PREVIEW */}
      {activeAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Cover Letter Draft</h3>
                <p className="text-slate-500 text-sm">{activeAsset.role}</p>
              </div>
              <button 
                onClick={() => setActiveAsset(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-2"
              >✕</button>
            </div>
            <div className="p-8">
              <pre className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-sans italic bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {activeAsset.content}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(activeAsset.content);
                  alert("Copied to clipboard!");
                }}
                className="w-full mt-8 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}