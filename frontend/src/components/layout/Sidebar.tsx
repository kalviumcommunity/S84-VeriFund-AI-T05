import { NavLink } from 'react-router-dom';
import { Bot, FileText, Activity, Settings, User, LogOut, Building2 } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sidebar = () => {
  const navItems = [
    { name: 'Copilot', path: '/copilot', icon: Bot },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Audit', path: '/audit', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-[240px] border-r bg-white h-full flex flex-col justify-between">
      <div>
        <div className="h-16 flex items-center px-6 border-b">
          <Building2 className="h-6 w-6 text-primary mr-2" />
          <div>
            <h1 className="font-semibold text-base leading-tight">VeriFund AI</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Institutional Intelligence</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-2",
                  isActive
                    ? "bg-[#EEF2FF] text-primary border-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent"
                )
              }
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t space-y-1">
        <button className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100">
          <User className="h-4 w-4 mr-3" />
          Profile
        </button>
        <button className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100">
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
