import { NavLink, useLocation } from 'react-router-dom';
import { Bot, FileText, Activity, Settings, User, LogOut, Building2, Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Shared session helpers (mirrors CopilotPage) ---
const SESSIONS_KEY = 'verifund_chat_sessions';
const ACTIVE_SESSION_KEY = 'verifund_active_session';

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
}

const generateId = () => Math.random().toString(36).slice(2);

const loadSessions = (): ChatSession[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch { return []; }
};
const saveSessions = (s: ChatSession[]) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));

const Sidebar = () => {
  const location = useLocation();
  const isCopilot = location.pathname === '/copilot';

  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeId, setActiveId] = useState<string>(
    () => localStorage.getItem(ACTIVE_SESSION_KEY) || ''
  );

  // Sync with localStorage changes (CopilotPage writes to it)
  useEffect(() => {
    const sync = () => {
      setSessions(loadSessions());
      setActiveId(localStorage.getItem(ACTIVE_SESSION_KEY) || '');
    };
    window.addEventListener('storage', sync);
    // Also poll lightly since same-tab storage events don't fire
    const interval = setInterval(sync, 500);
    return () => { window.removeEventListener('storage', sync); clearInterval(interval); };
  }, []);

  const handleNewChat = () => {
    const newId = generateId();
    const fresh: ChatSession = { id: newId, title: 'New Chat', messages: [], createdAt: Date.now() };
    const next = [fresh, ...sessions];
    saveSessions(next);
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    setSessions(next);
    setActiveId(newId);
  };

  const handleSelectSession = (id: string) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
    setActiveId(id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = sessions.filter(s => s.id !== id);
    if (next.length === 0) {
      const freshId = generateId();
      const fresh: ChatSession = { id: freshId, title: 'New Chat', messages: [], createdAt: Date.now() };
      saveSessions([fresh]);
      localStorage.setItem(ACTIVE_SESSION_KEY, freshId);
      setSessions([fresh]);
      setActiveId(freshId);
    } else {
      saveSessions(next);
      if (id === activeId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, next[0].id);
        setActiveId(next[0].id);
      }
      setSessions(next);
    }
  };

  const today = sessions.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString());
  const older = sessions.filter(s => new Date(s.createdAt).toDateString() !== new Date().toDateString());

  const navItems = [
    { name: 'Copilot', path: '/copilot', icon: Bot },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Audit', path: '/audit', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-[240px] border-r bg-white h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <Building2 className="h-6 w-6 text-primary mr-2 shrink-0" />
        <div>
          <h1 className="font-semibold text-base leading-tight">VeriFund AI</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Institutional Intelligence</p>
        </div>
      </div>

      {/* Nav + Chat History */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <nav className="p-3 space-y-1 mt-2 shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#EEF2FF] text-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )
              }
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Chat History — only visible on /copilot */}
        {isCopilot && (
          <div className="flex-1 flex flex-col overflow-hidden border-t mx-3 mt-1 pt-2">
            {/* New Chat button */}
            <button
              onClick={handleNewChat}
              className="flex items-center w-full px-2.5 py-2 mb-2 rounded-md text-xs font-medium text-primary bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              New Chat
            </button>

            <div className="flex-1 overflow-y-auto space-y-3 pb-2">
              {today.length > 0 && (
                <div>
                  <div className="flex items-center px-1 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <Clock className="h-3 w-3 mr-1" /> Today
                  </div>
                  {today.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeId}
                      onSelect={() => handleSelectSession(session.id)}
                      onDelete={(e) => handleDeleteSession(session.id, e)}
                    />
                  ))}
                </div>
              )}
              {older.length > 0 && (
                <div>
                  <div className="px-1 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Older
                  </div>
                  {older.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeId}
                      onSelect={() => handleSelectSession(session.id)}
                      onDelete={(e) => handleDeleteSession(session.id, e)}
                    />
                  ))}
                </div>
              )}
              {sessions.length === 0 && (
                <p className="text-xs text-gray-400 px-1 py-2">No chats yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Profile + Logout */}
      <div className="p-3 border-t space-y-1 shrink-0">
        <NavLink 
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive ? "bg-[#EEF2FF] text-primary" : "text-gray-600 hover:bg-gray-100"
            )
          }
        >
          <User className="h-4 w-4 mr-3" />
          Profile
        </NavLink>
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

const SessionItem = ({ session, isActive, onSelect, onDelete }: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onSelect}
    className={cn(
      "group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors",
      isActive ? "bg-[#EEF2FF] text-primary" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    )}
  >
    <div className="flex items-center space-x-2 min-w-0 flex-1">
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="text-xs truncate">{session.title}</span>
    </div>
    <button
      onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all rounded shrink-0 ml-1 cursor-pointer"
      title="Delete"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

export default Sidebar;
