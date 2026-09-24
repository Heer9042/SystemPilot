import React from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout({
  activeTab,
  setActiveTab,
  systemStats,
  statsHistory,
  children,
}) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-slate-100">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0a0c10]">
          <TopBar systemStats={systemStats} statsHistory={statsHistory} />
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
