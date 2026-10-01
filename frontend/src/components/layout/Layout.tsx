import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-sm">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full bg-[#F8FAFC]">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
