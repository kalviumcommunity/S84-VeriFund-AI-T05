import { 
  Search, Send, ShieldCheck, ZoomIn, ZoomOut, CheckCircle2, Square, 
  Copy, Check, Download, Info, Sparkles, ChevronLeft, ChevronRight,
  MessageSquare, Plus, Trash2, Clock, ChevronDown
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';

// --- Chat Session Types ---
interface ChatMessage {
  type: 'user' | 'bot';
  text: string;
  score?: number;
}
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const generateId = () => Math.random().toString(36).slice(2);
const SESSIONS_KEY = 'verifund_chat_sessions';
const ACTIVE_SESSION_KEY = 'verifund_active_session';

const loadSessions = (): ChatSession[] => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch { return []; }
};
const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

const CopilotPage = () => {
  const [mode, setMode] = useState<'ADVISOR' | 'SUMMARY'>('ADVISOR');
  const [query, setQuery] = useState('');
  const VALID_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];
  const savedModel = localStorage.getItem('preferredModel');
  const [model, setModel] = useState((savedModel && VALID_MODELS.includes(savedModel)) ? savedModel : 'gemini-3.8-flash');
  const [loading, setLoading] = useState(false);
  
  // --- Chat History State ---
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    const all = loadSessions();
    if (saved && all.some(s => s.id === saved)) return saved;
    if (all.length > 0) return all[0].id;
    const newId = generateId();
    const newSession: ChatSession = { id: newId, title: 'New Chat', messages: [], createdAt: Date.now() };
    saveSessions([newSession]);
    return newId;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const history = activeSession?.messages ?? [];

  const updateHistory = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== activeSessionId) return s;
        const newMessages = updater(s.messages);
        // Auto-title from first user message
        const title = s.title === 'New Chat' && newMessages.length > 0 && newMessages[0].type === 'user'
          ? newMessages[0].text.slice(0, 40) + (newMessages[0].text.length > 40 ? '…' : '')
          : s.title;
        return { ...s, messages: newMessages, title };
      });
      saveSessions(next);
      return next;
    });
  }, [activeSessionId]);

  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const zoomLevels = [75, 100, 125, 150, 200];
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [socketCounter, setSocketCounter] = useState(0);
  
  const [activeDocs, setActiveDocs] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [chatWidthPercent, setChatWidthPercent] = useState(42);
  const isDragging = useRef(false);
  const docSelectorRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pageInput, setPageInput] = useState('1');

  // Persist active session id
  useEffect(() => {
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    // Reset page when switching sessions
    setPdfPage(1);
  }, [activeSessionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (docSelectorRef.current && !docSelectorRef.current.contains(event.target as Node)) {
        setShowDocSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get('/documents/').then(res => {
      const docs = res.data;
      if (docs && docs.length > 0) {
        setAllDocs(docs);
        setActiveDocs([docs[0]]);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
        setPdfUrl(`${baseUrl}/documents/${docs[0].id}/view`);
      }
    }).catch(err => console.error("Failed to load documents", err));
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, loading]);

  useEffect(() => {
    localStorage.setItem('preferredModel', model);
    const strictMode = localStorage.getItem('strictMode') !== 'false';
    const temperature = localStorage.getItem('temperature') || '0.1';
    const persona = mode === 'SUMMARY' ? 'client' : 'advisor';
    const docIds = activeDocs.map(d => d.id).join(',');
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
    let wsUrl = `${wsBaseUrl}/copilot/ws/query?model=${model}&strict_mode=${strictMode}&temperature=${temperature}&persona=${persona}`;
    if (docIds) {
      wsUrl += `&document_ids=${docIds}`;
    }
    
    setConnectionStatus('connecting');
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    let isUnmounted = false;
    let reconnectTimeout: any;

    socket.onopen = () => {
      if (!isUnmounted) setConnectionStatus('connected');
    };

    socket.onclose = () => {
      if (!isUnmounted) {
        setConnectionStatus('disconnected');
        reconnectTimeout = setTimeout(() => {
          if (!isUnmounted) setSocketCounter(c => c + 1);
        }, 3000);
      }
    };

    socket.onerror = () => {
      if (!isUnmounted) setConnectionStatus('disconnected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metadata') {
        updateHistory(prev => [...prev, { type: 'bot', text: '', score: Math.round(data.groundedness_score * 100) }]);
      } else if (data.type === 'chunk') {
        updateHistory(prev => {
          const newHistory = [...prev];
          const lastIdx = newHistory.length - 1;
          if (lastIdx >= 0) {
            newHistory[lastIdx] = { ...newHistory[lastIdx], text: newHistory[lastIdx].text + data.text };
          }
          return newHistory;
        });
      } else if (data.type === 'end') {
        setLoading(false);
      }
    };

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimeout);
      socket.close();
    };
  }, [mode, activeDocs, socketCounter, model, updateHistory]);

  const handleQuery = (customText?: string) => {
    const textToSend = customText || query;
    if (!textToSend.trim() || !ws) return;
    updateHistory(prev => [...prev, { type: 'user', text: textToSend }]);
    ws.send(textToSend);
    if (!customText) setQuery('');
    setLoading(true);
  };

  const handleStop = () => {
    setLoading(false);
    setSocketCounter(prev => prev + 1);
  };

  const handleNewChat = () => {
    const newId = generateId();
    const newSession: ChatSession = { id: newId, title: 'New Chat', messages: [], createdAt: Date.now() };
    setSessions(prev => {
      const next = [newSession, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);
      if (activeSessionId === id) {
        const newActive = next[0]?.id;
        if (newActive) {
          setActiveSessionId(newActive);
        } else {
          // Create fresh session
          const freshId = generateId();
          const fresh: ChatSession = { id: freshId, title: 'New Chat', messages: [], createdAt: Date.now() };
          saveSessions([fresh]);
          setSessions([fresh]);
          setActiveSessionId(freshId);
        }
      }
      return next;
    });
  };

  // --- PDF Navigation via React key remount (reliable cross-origin approach) ---
  const navigatePdf = useCallback((page: number, zoom = pdfZoom) => {
    const validPage = Math.max(1, page);
    setPdfPage(validPage);
    setPdfZoom(zoom);
    setPageInput(String(validPage));
  }, [pdfZoom]);

  const handleCitationClick = (page: number) => {
    if (activeDocs.length > 1) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const docUrl = `${baseUrl}/documents/${activeDocs[0].id}/view`;
      setPdfUrl(docUrl);
      setActiveDocs([activeDocs[0]]);
    }
    navigatePdf(page, pdfZoom);
  };

  const handleZoomIn = () => {
    const currentIdx = zoomLevels.indexOf(pdfZoom);
    if (currentIdx < zoomLevels.length - 1) {
      const nextZoom = zoomLevels[currentIdx + 1];
      setPdfZoom(nextZoom);
      navigatePdf(pdfPage, nextZoom);
    }
  };

  const handleZoomOut = () => {
    const currentIdx = zoomLevels.indexOf(pdfZoom);
    if (currentIdx > 0) {
      const nextZoom = zoomLevels[currentIdx - 1];
      setPdfZoom(nextZoom);
      navigatePdf(pdfPage, nextZoom);
    }
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const exportChartAsPng = (containerId: string, filename = 'chart.png') => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = (svg.clientWidth || 800) * scale;
      canvas.height = (svg.clientHeight || 400) * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('select-none');
    const rightPane = document.getElementById('right-pane');
    if (rightPane) rightPane.style.pointerEvents = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const sidebarW = sidebarCollapsed ? 48 : 224;
    const containerWidth = window.innerWidth - sidebarW;
    const percent = ((e.clientX - sidebarW) / containerWidth) * 100;
    setChatWidthPercent(Math.max(25, Math.min(65, percent)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.classList.remove('select-none');
    const rightPane = document.getElementById('right-pane');
    if (rightPane) rightPane.style.pointerEvents = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Group sessions by date for display
  const groupedSessions = sessions.reduce<{ today: ChatSession[]; older: ChatSession[] }>(
    (acc, s) => {
      const isToday = new Date(s.createdAt).toDateString() === new Date().toDateString();
      isToday ? acc.today.push(s) : acc.older.push(s);
      return acc;
    },
    { today: [], older: [] }
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Navigation / Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-primary font-semibold">
            <ShieldCheck className="h-5 w-5 mr-2" />
            VeriFund AI
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-gray-50">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-gray-600 capitalize">{connectionStatus}</span>
          </div>
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

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── ChatGPT-Style History Sidebar ── */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-56'} flex flex-col bg-gray-950 text-gray-100 shrink-0 transition-all duration-200 overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-2 border-b border-gray-800 h-12 shrink-0">
            {!sidebarCollapsed && (
              <button
                onClick={handleNewChat}
                className="flex items-center space-x-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-md transition-colors flex-1 mr-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto py-2 space-y-4">
              {/* New Chat button for collapsed state + today group */}
              {groupedSessions.today.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                    <Clock className="h-3 w-3 mr-1" /> Today
                  </div>
                  {groupedSessions.today.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => setActiveSessionId(session.id)}
                      onDelete={(e) => handleDeleteSession(session.id, e)}
                    />
                  ))}
                </div>
              )}
              {groupedSessions.older.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Older
                  </div>
                  {groupedSessions.older.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => setActiveSessionId(session.id)}
                      onDelete={(e) => handleDeleteSession(session.id, e)}
                    />
                  ))}
                </div>
              )}
              {sessions.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-600 text-center">No chats yet</div>
              )}
            </div>
          )}

          {/* Collapsed: just new chat icon */}
          {sidebarCollapsed && (
            <div className="flex-1 flex flex-col items-center pt-2">
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Chat Pane ── */}
        <div style={{ width: `${chatWidthPercent}%` }} className="flex flex-col bg-white shrink-0">
          <div className="p-5 border-b shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Financial Research Copilot</h2>
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
            <p className="text-sm text-gray-500">Ask questions about approved financial documents.</p>
          </div>

          {/* Chat Messages */}
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
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <div className="flex items-center">
                      <ShieldCheck className="h-4 w-4 mr-1 text-primary" /> 
                      VERIFUND AI
                      {msg.score && (
                        <div className="relative group/score ml-3 flex items-center">
                          <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 cursor-help">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-blue-600" /> GROUNDEDNESS: {msg.score}%
                            <Info className="h-3 w-3 ml-1 text-blue-400" />
                          </span>
                          <div className="absolute left-0 top-full mt-1.5 hidden group-hover/score:block z-30 w-64 p-2.5 bg-gray-900 text-white text-[11px] rounded-md shadow-lg pointer-events-none">
                            <p className="font-semibold mb-0.5 text-blue-300">SEC Compliance Audit</p>
                            <p className="text-gray-300 leading-normal">
                              {msg.score}% of claims in this answer are directly matched and verified against retrieved prospectus chunks.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyMessage(msg.text, idx)}
                      className="flex items-center text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? (
                        <span className="flex items-center text-xs text-emerald-600 font-medium">
                          <Check className="h-3.5 w-3.5 mr-1" /> Copied
                        </span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="bg-white border shadow-sm rounded-lg rounded-tl-none p-4 text-sm text-gray-800 leading-relaxed border-dashed prose prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({href, children}: any) => {
                          if (href?.startsWith('#page-')) {
                            const pageNum = parseInt(href.replace('#page-', ''));
                            return (
                              <span 
                                onClick={() => handleCitationClick(pageNum)}
                                className="inline-flex items-center bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs mx-1 cursor-pointer hover:bg-blue-200 transition-colors"
                              >
                                <FileIcon /> {children}
                              </span>
                            );
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                        },
                        table: ({children}: any) => (
                          <div className="overflow-x-auto my-3 border border-gray-200 rounded-lg shadow-xs not-prose">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-xs bg-white">{children}</table>
                          </div>
                        ),
                        thead: ({children}: any) => <thead className="bg-gray-50 text-gray-700 font-semibold">{children}</thead>,
                        th: ({children}: any) => <th className="px-3.5 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">{children}</th>,
                        tbody: ({children}: any) => <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>,
                        tr: ({children}: any) => <tr className="even:bg-gray-50/50 hover:bg-blue-50/30 transition-colors">{children}</tr>,
                        td: ({children}: any) => <td className="px-3.5 py-2 text-xs text-gray-700 border-b border-gray-100">{children}</td>,
                        code({children, className, ...rest}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (match && match[1] === 'json') {
                            try {
                              const parsed = JSON.parse(String(children).replace(/\n$/, ''));
                              if (parsed.type === 'chart' && parsed.data && parsed.data.length > 0) {
                                const keys = Object.keys(parsed.data[0]).filter(k => k !== 'year');
                                const cleanData = parsed.data.map((item: any) => {
                                  const cleaned: any = { ...item };
                                  keys.forEach(k => {
                                    if (typeof cleaned[k] === 'string') {
                                      cleaned[k] = parseFloat(cleaned[k].replace('%', '')) || 0;
                                    }
                                  });
                                  return cleaned;
                                });
                                const allValues = cleanData.flatMap((d: any) => keys.map(k => Number(d[k]) || 0));
                                const dataMin = Math.min(...allValues);
                                const dataMax = Math.max(...allValues);
                                const hasNegative = dataMin < 0;
                                let chartMin: number;
                                let chartMax: number;
                                if (hasNegative) {
                                  const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax));
                                  const ceilVal = Math.ceil(absMax + 1);
                                  const bound = ceilVal % 2 === 0 ? ceilVal : ceilVal + 1;
                                  chartMin = -bound; chartMax = bound;
                                } else {
                                  chartMin = 0; chartMax = Math.ceil(dataMax + 1);
                                }
                                const chartId = `bar-chart-${idx}`;
                                return (
                                  <div id={chartId} className="h-[410px] my-6 w-full not-prose bg-white p-4 border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-sm text-gray-700">Historical Return Comparison</h4>
                                      <button onClick={() => exportChartAsPng(chartId, 'historical-returns.png')} className="flex items-center text-xs text-gray-500 hover:text-primary bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded px-2 py-1 transition-colors cursor-pointer" title="Download chart as PNG">
                                        <Download className="h-3.5 w-3.5 mr-1" /> Export PNG
                                      </button>
                                    </div>
                                    <ResponsiveBar data={cleanData} keys={keys} indexBy="year" margin={{ top: 40, right: 25, bottom: 70, left: 60 }} padding={0.4} groupMode="grouped" colors={{ scheme: 'set2' }} borderRadius={2} valueScale={{ type: 'linear', min: chartMin, max: chartMax }} indexScale={{ type: 'band', round: true }} valueFormat={v => `${v}%`} axisBottom={{ tickSize: 5, tickPadding: 8, tickRotation: -45 }} axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, format: v => `${v}%` }} enableLabel={true} labelSkipWidth={12} labelSkipHeight={12} labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }} markers={[{ axis: 'y', value: 0, lineStyle: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4' } }]} legends={[{ dataFrom: 'keys', anchor: 'top-right', direction: 'row', justify: false, translateX: 0, translateY: -30, itemsSpacing: 10, itemWidth: 110, itemHeight: 20, symbolSize: 12 }]} theme={{ axis: { ticks: { text: { fontSize: 11 } } } }} />
                                  </div>
                                );
                              }
                              if (parsed.type === 'pie' && parsed.data && parsed.data.length > 0) {
                                const chartId = `pie-chart-${idx}`;
                                return (
                                  <div id={chartId} className="h-[320px] my-6 w-full not-prose bg-white p-4 border rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-sm text-gray-700">Asset Allocation</h4>
                                      <button onClick={() => exportChartAsPng(chartId, 'asset-allocation.png')} className="flex items-center text-xs text-gray-500 hover:text-primary bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded px-2 py-1 transition-colors cursor-pointer" title="Download chart as PNG">
                                        <Download className="h-3.5 w-3.5 mr-1" /> Export PNG
                                      </button>
                                    </div>
                                    <ResponsivePie data={parsed.data} margin={{ top: 20, right: 80, bottom: 40, left: 80 }} innerRadius={0.5} padAngle={0.7} cornerRadius={3} activeOuterRadiusOffset={8} colors={{ scheme: 'nivo' }} borderWidth={1} borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }} arcLinkLabelsSkipAngle={10} arcLinkLabelsTextColor="#333333" arcLinkLabelsThickness={2} arcLinkLabelsColor={{ from: 'color' }} arcLabelsSkipAngle={10} arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }} />
                                  </div>
                                );
                              }
                            } catch {
                              // normal code block
                            }
                          }
                          return <code {...rest} className={className}>{children}</code>;
                        }
                      }}
                    >
                      {msg.text.replace(/\[Page (\d+)\]/g, '[Page $1](#page-$1)')}
                    </ReactMarkdown>
                  </div>
                </div>
              )
            ))}

            {loading && (
              <div className="flex items-center text-sm text-gray-500 py-2">
                <div className="animate-pulse flex space-x-1.5">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
                <span className="ml-3 text-xs text-gray-400">VeriFund Copilot is thinking...</span>
              </div>
            )}

            {history.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center my-auto py-8">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Financial Analysis Copilot</h3>
                <p className="text-xs text-gray-500 mb-6 text-center max-w-sm">
                  Select a starter query below or ask any question about fund performance, fees, or risk disclosures.
                </p>
                <div className="grid grid-cols-1 gap-2.5 w-full max-w-md">
                  {[
                    { title: "Historical Returns", desc: "Compare 5-year returns against market benchmarks", icon: "📊", prompt: "Compare the historical returns of the active fund against benchmarks over the last 3-5 years." },
                    { title: "Fee & Expense Breakdown", desc: "Analyze management fees, expense ratio, and operating costs", icon: "💰", prompt: "What is the annual expense ratio, management fee, and total operating cost?" },
                    { title: "Risk Factors & Objectives", desc: "Summarize primary investment objectives and top principal risk factors", icon: "🛡️", prompt: "Summarize the primary investment objectives and top principal risk factors." }
                  ].map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuery(starter.prompt)}
                      className="flex items-center p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-xs transition-all group cursor-pointer"
                    >
                      <span className="text-xl mr-3">{starter.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 group-hover:text-primary transition-colors">{starter.title}</div>
                        <div className="text-[11px] text-gray-500 truncate">{starter.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
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
              {loading ? (
                <button 
                  onClick={handleStop}
                  className="absolute bottom-3 right-3 bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
                  title="Stop generating"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-gray-50 text-gray-600 cursor-pointer"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  </select>
                  <button 
                    onClick={() => handleQuery()}
                    disabled={!query.trim()}
                    className="bg-primary text-white p-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-400 mt-2 text-center flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" /> Responses are strictly audited and derived from authorized prospectus filings.
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={handleMouseDown}
          className="w-1 bg-gray-200 hover:bg-primary cursor-col-resize shrink-0 transition-colors z-20"
        />

        {/* Right Pane: PDF Viewer */}
        <div id="right-pane" className="flex-1 flex flex-col bg-gray-50 relative">
          <div className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
            
            {/* Multi-Select Dropdown */}
            <div className="relative" ref={docSelectorRef}>
              <button 
                onClick={() => setShowDocSelector(!showDocSelector)}
                className="font-medium text-sm flex items-center hover:text-primary transition-colors cursor-pointer"
              >
                {activeDocs.length === 0 
                  ? 'No document selected' 
                  : activeDocs.length === 1 
                    ? activeDocs[0].title 
                    : `Comparing ${activeDocs.length} Documents`}
                <ChevronDown className="ml-2 h-3.5 w-3.5 text-gray-400" />
              </button>
              
              {showDocSelector && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border rounded-lg shadow-lg py-2 z-50">
                  <div className="px-3 py-1.5 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Select Context</span>
                    <span className="text-[10px] lowercase text-primary cursor-pointer hover:underline" onClick={() => setActiveDocs(allDocs)}>select all</span>
                  </div>
                  {allDocs.map((doc) => {
                    const isSelected = activeDocs.some(d => d.id === doc.id);
                    return (
                      <div 
                        key={doc.id}
                        onClick={() => {
                          if (isSelected) {
                            if (activeDocs.length > 1) {
                              const remaining = activeDocs.filter(d => d.id !== doc.id);
                              setActiveDocs(remaining);
                              if (remaining.length === 1) {
                                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
                                setPdfUrl(`${baseUrl}/documents/${remaining[0].id}/view`);
                              }
                            }
                          } else {
                            const newActive = [...activeDocs, doc];
                            setActiveDocs(newActive);
                            if (newActive.length === 1) {
                              const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
                              setPdfUrl(`${baseUrl}/documents/${doc.id}/view`);
                            }
                          }
                        }}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer space-x-2"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <div className="text-sm truncate" title={doc.title}>{doc.title}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 text-sm">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] text-gray-500 uppercase">Version</span>
                <span className="font-medium">{activeDocs[0]?.version || '-'}</span>
              </div>
              {activeDocs[0] && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-xs font-semibold flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>
                  {activeDocs[0].status || 'APPROVED'}
                </div>
              )}

              {activeDocs.length === 1 && (
                <div className="flex items-center border rounded bg-gray-50 px-1 py-0.5 space-x-1 text-xs">
                  <button 
                    onClick={() => navigatePdf(pdfPage - 1, pdfZoom)}
                    disabled={pdfPage <= 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                  <span className="text-[11px] text-gray-500">Page</span>
                  <input 
                    type="number"
                    min={1}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => navigatePdf(parseInt(pageInput) || 1, pdfZoom)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigatePdf(parseInt(pageInput) || 1, pdfZoom); }}
                    className="w-10 text-center bg-white border rounded text-xs font-medium py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    onClick={() => navigatePdf(pdfPage + 1, pdfZoom)}
                    className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                </div>
              )}

              <div className="flex items-center border rounded bg-gray-50">
                <button onClick={handleZoomOut} disabled={pdfZoom <= zoomLevels[0]} className="p-1 hover:bg-gray-200 rounded-l disabled:opacity-30 cursor-pointer" title="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-medium text-gray-700">{pdfZoom}%</span>
                <button onClick={handleZoomIn} disabled={pdfZoom >= zoomLevels[zoomLevels.length - 1]} className="p-1 hover:bg-gray-200 rounded-r disabled:opacity-30 cursor-pointer" title="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* PDF Content Area */}
          <div className="flex-1 overflow-hidden flex justify-center bg-gray-100/50">
            {activeDocs.length > 1 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                <div className="bg-white p-4 rounded-full shadow-sm border mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Multi-Document Context Active</h3>
                <p className="max-w-md text-sm mb-6">
                  You are currently referencing {activeDocs.length} documents. The AI Copilot is using all selected documents as context to answer your questions.
                </p>
                <button 
                  onClick={() => {
                    if (ws && !loading) {
                      updateHistory(prev => [...prev, { type: 'user', text: `Compare ${activeDocs.length} documents` }]);
                      ws.send("__COMPARE__");
                      setLoading(true);
                    }
                  }}
                  disabled={loading}
                  className="bg-primary text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Generate Detailed Comparison
                </button>
              </div>
            ) : pdfUrl ? (
              <iframe 
                key={`${activeDocs[0]?.id}-p${pdfPage}-z${pdfZoom}`}
                src={`${pdfUrl}#page=${pdfPage}&zoom=${pdfZoom}`} 
                className="w-full h-full border-none"
                title="PDF Viewer"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {activeDocs.length > 0 ? "Loading document..." : "Please select a document to begin."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sidebar Session Item Component ──
const SessionItem = ({ session, isActive, onSelect, onDelete }: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onSelect}
    className={`group flex items-center justify-between px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors ${
      isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`}
  >
    <div className="flex items-center space-x-2 min-w-0 flex-1">
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs truncate">{session.title}</span>
    </div>
    <button
      onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all rounded cursor-pointer shrink-0 ml-1"
      title="Delete chat"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

const FileIcon = () => (
  <svg className="w-3 h-3 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export default CopilotPage;
