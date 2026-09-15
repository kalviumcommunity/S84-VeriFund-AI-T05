import { Search, Send, ShieldCheck, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CheckCircle2, FileText as FileIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

const CopilotPage = () => {
  const [mode, setMode] = useState<'ADVISOR' | 'SUMMARY'>('ADVISOR');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{type: 'user' | 'bot', text: string, score?: number}[]>([
    { type: 'user', text: 'What is the annual expense ratio and exit fee for the Horizon Balanced Growth Fund?' },
    { type: 'bot', text: 'According to the approved Horizon Balanced Growth Fund Factsheet, the annual expense ratio is 1.25% [Page 4] and the applicable exit fee is 2.00% [Page 17].', score: 98 }
  ]);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/api/v1/copilot/ws/query');
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metadata') {
        setHistory(prev => [...prev, { type: 'bot', text: '', score: Math.round(data.groundedness_score * 100) }]);
      } else if (data.type === 'chunk') {
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].text += data.text;
          return newHistory;
        });
      } else if (data.type === 'end') {
        setLoading(false);
      }
    };

    return () => socket.close();
  }, []);

  const handleQuery = () => {
    if (!query.trim() || !ws) return;
    
    setHistory(prev => [...prev, { type: 'user', text: query }]);
    ws.send(query);
    setQuery('');
    setLoading(true);
  };

  const handleCitationClick = (page: number) => {
    setPdfPage(page);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Navigation / Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center text-primary font-semibold">
          <ShieldCheck className="h-5 w-5 mr-2" />
          VeriFund AI
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full h-8 pl-9 pr-3 rounded-md border text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Chat */}
        <div className="w-[450px] border-r flex flex-col bg-white">
          <div className="p-5 border-b shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Financial Research Copilot</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistory([])}
                  title="Clear chat history"
                  className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-md transition-colors"
                >
                  Clear Chat
                </button>
                <div className="flex bg-gray-100 rounded-md p-0.5 border">
                  <button 
                    onClick={() => setMode('ADVISOR')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm ${mode === 'ADVISOR' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                  >
                    ADVISOR
                  </button>
                  <button 
                    onClick={() => setMode('SUMMARY')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm ${mode === 'SUMMARY' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                  >
                    SUMMARY
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">Ask questions about approved financial documents.</p>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {history.map((msg, idx) => (
              msg.type === 'user' ? (
                <div key={idx} className="flex justify-end">
                  <div className="bg-[#EEF2FF] text-gray-900 rounded-lg rounded-tr-none px-4 py-3 text-sm max-w-[85%]">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex flex-col space-y-2">
                  <div className="flex items-center text-xs text-gray-500 font-medium">
                    <ShieldCheck className="h-4 w-4 mr-1 text-primary" /> 
                    VERIFUND AI
                    {msg.score && (
                      <span className="ml-3 flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> GROUNDEDNESS: {msg.score}%
                      </span>
                    )}
                  </div>
                  <div className="bg-white border shadow-sm rounded-lg rounded-tl-none p-4 text-sm text-gray-800 leading-relaxed border-dashed">
                    {/* Basic Citation Parser */}
                    {msg.text.split(/(\[Page \d+\])/g).map((part, i) => {
                      if (part.startsWith('[Page')) {
                        const pageNum = parseInt(part.match(/\d+/)?.[0] || '1');
                        return (
                          <span 
                            key={i} 
                            onClick={() => handleCitationClick(pageNum)}
                            className="inline-flex items-center bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs mx-1 cursor-pointer hover:bg-blue-200"
                          >
                            <FileIcon /> p.{pageNum}
                          </span>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </div>
                </div>
              )
            ))}
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t shrink-0 bg-gray-50/50">
            <div className="relative border rounded-lg bg-white shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery(); } }}
                className="w-full p-3 pr-12 resize-none h-20 text-sm focus:outline-none rounded-lg"
                placeholder="Ask a question about funds, fees, eligibility..."
              />
              <button 
                onClick={handleQuery}
                disabled={loading}
                className="absolute bottom-3 right-3 bg-primary text-white p-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide px-1">
              REGULATORY DISCLOSURE: RESPONSES ARE AI-GENERATED BASED ON APPROVED DOCUMENTS. VERIFY BEFORE CLIENT DISTRIBUTION.
            </p>
          </div>
        </div>

        {/* Right Pane: PDF Viewer */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
            <div className="font-medium text-sm flex items-center">
              Horizon Balanced Growth Fund — F...
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] text-gray-500 uppercase">Version</span>
                <span className="font-medium">3.2</span>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-xs font-semibold flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>
                APPROVED
              </div>
              <div className="flex items-center border rounded bg-gray-50">
                <button className="p-1 hover:bg-gray-200"><ZoomOut className="h-4 w-4" /></button>
                <span className="px-2 text-xs font-medium">100%</span>
                <button className="p-1 hover:bg-gray-200"><ZoomIn className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* PDF Content Area */}
          <div className="flex-1 overflow-hidden flex justify-center bg-gray-100/50">
            {/* The iframe connects to the FastAPI static mount for the mock document. 
                In a real app, this URL would come dynamically from the selected document context. */}
            <iframe 
              src={`http://localhost:8000/uploads/sample.pdf#page=${pdfPage}`} 
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);

export default CopilotPage;
