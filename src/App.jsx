import React, { useState, useEffect } from 'react';
import { Sidebar, NAVIGATION_ITEMS } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { FirstRunWizard } from './components/onboarding/FirstRunWizard';
import { useSystemStats } from './hooks/useSystemStats';
import { useTheme } from './hooks/useTheme';
import { api } from './services/tauriApi';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Processes } from './pages/Processes';
import { Memory } from './pages/Memory';
import { CpuManager } from './pages/CpuManager';
import { GpuMonitor } from './pages/GpuMonitor';
import { DiskMonitor } from './pages/DiskMonitor';
import { NetworkMonitor } from './pages/NetworkMonitor';
import { GamingMode } from './pages/GamingMode';
import { Performance } from './pages/Performance';
import { StartupManager } from './pages/StartupManager';
import { CleanupCenter } from './pages/CleanupCenter';
import { HardwareMonitor } from './pages/HardwareMonitor';
import { SecurityCenter } from './pages/SecurityCenter';
import { Benchmark } from './pages/Benchmark';
import { Settings } from './pages/Settings';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { stats, history, loading, error } = useSystemStats(1000);
  const { theme, toggleTheme } = useTheme();
  const [toast, setToast] = useState(null);
  const [showFirstRun, setShowFirstRun] = useState(false);

  useEffect(() => {
    async function checkFirstRun() {
      try {
        const settings = await api.getSettings();
        if (settings && settings.first_run_completed !== 'true') {
          setShowFirstRun(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkFirstRun();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleQuickClean = async () => {
    try {
      const res = await api.cleanMemory();
      showToast(res.message || 'Memory cleaned successfully!');
    } catch (e) {
      showToast(`Error cleaning memory: ${e}`);
    }
  };

  const activeNav = NAVIGATION_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-950 text-slate-100 font-sans">
      {/* First Run Onboarding Modal */}
      {showFirstRun && (
        <FirstRunWizard
          onComplete={() => setShowFirstRun(false)}
          currentTheme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickClean={handleQuickClean}
        ramUsagePercent={stats?.ram_usage_percent}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gradient-to-br from-surface-950 via-surface-900/60 to-surface-950">
        {/* Top Header */}
        <TopBar
          theme={theme}
          toggleTheme={toggleTheme}
          stats={stats}
          onRefresh={() => {}}
          activeTabTitle={activeNav?.label || 'Dashboard'}
        />

        {/* Dynamic Toast Notification */}
        {toast && (
          <div className="fixed top-14 right-6 z-50 animate-bounce">
            <div className="glass-panel px-4 py-2.5 rounded-xl border border-brand-500/50 shadow-2xl bg-surface-900/95 text-xs text-brand-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              {toast}
            </div>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              history={history}
              onCleanMemory={handleQuickClean}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'processes' && <Processes />}
          {activeTab === 'memory' && <Memory stats={stats} />}
          {activeTab === 'cpu' && <CpuManager stats={stats} history={history} />}
          {activeTab === 'gpu' && <GpuMonitor />}
          {activeTab === 'disk' && <DiskMonitor stats={stats} />}
          {activeTab === 'network' && <NetworkMonitor stats={stats} history={history} />}
          {activeTab === 'gaming' && <GamingMode onCleanMemory={handleQuickClean} />}
          {activeTab === 'performance' && <Performance />}
          {activeTab === 'startup' && <StartupManager />}
          {activeTab === 'cleanup' && <CleanupCenter />}
          {activeTab === 'hardware' && <HardwareMonitor stats={stats} />}
          {activeTab === 'security' && <SecurityCenter />}
          {activeTab === 'benchmark' && <Benchmark />}
          {activeTab === 'settings' && <Settings theme={theme} toggleTheme={toggleTheme} />}
        </main>
      </div>
    </div>
  );
}

export default App;
