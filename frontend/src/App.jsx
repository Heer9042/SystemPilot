import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar, NAVIGATION_ITEMS } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { FirstRunWizard } from './components/onboarding/FirstRunWizard';
import { PageLoading } from './components/common/PageLoading';
import { UpdateModal } from './components/updates/UpdateModal';
import { UpdateBanner } from './components/updates/UpdateBanner';
import { useSystemStats } from './hooks/useSystemStats';
import { useTheme } from './hooks/useTheme';
import { useUpdater } from './hooks/useUpdater';
import { api } from './services/tauriApi';

// Dashboard loaded directly for instant initial rendering
import { Dashboard } from './pages/Dashboard';

// Lazy-loaded feature pages
const Processes = lazy(() => import('./pages/Processes').then((m) => ({ default: m.Processes })));
const Memory = lazy(() => import('./pages/Memory').then((m) => ({ default: m.Memory })));
const CpuManager = lazy(() => import('./pages/CpuManager').then((m) => ({ default: m.CpuManager })));
const GpuMonitor = lazy(() => import('./pages/GpuMonitor').then((m) => ({ default: m.GpuMonitor })));
const DiskMonitor = lazy(() => import('./pages/DiskMonitor').then((m) => ({ default: m.DiskMonitor })));
const NetworkMonitor = lazy(() => import('./pages/NetworkMonitor').then((m) => ({ default: m.NetworkMonitor })));
const Performance = lazy(() => import('./pages/Performance').then((m) => ({ default: m.Performance })));
const StartupManager = lazy(() => import('./pages/StartupManager').then((m) => ({ default: m.StartupManager })));
const CleanupCenter = lazy(() => import('./pages/CleanupCenter').then((m) => ({ default: m.CleanupCenter })));
const HardwareMonitor = lazy(() => import('./pages/HardwareMonitor').then((m) => ({ default: m.HardwareMonitor })));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter').then((m) => ({ default: m.SecurityCenter })));
const Benchmark = lazy(() => import('./pages/Benchmark').then((m) => ({ default: m.Benchmark })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { stats, history, loading, error } = useSystemStats(1000);
  const { theme, toggleTheme } = useTheme();
  const [toast, setToast] = useState(null);
  const [showFirstRun, setShowFirstRun] = useState(false);

  const {
    status,
    currentVersion,
    latestRelease,
    error: updaterError,
    progress: updaterProgress,
    modalOpen,
    bannerVisible,
    checkForUpdates,
    downloadAndInstallUpdate,
    dismissUpdate,
    skipVersion,
    openReleaseNotes,
    openModal,
    closeModal,
  } = useUpdater();

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-surface-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* First Run Onboarding Modal */}
      {showFirstRun && (
        <FirstRunWizard
          onComplete={() => setShowFirstRun(false)}
          currentTheme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Global In-App Update Modal */}
      <UpdateModal
        isOpen={modalOpen}
        onClose={closeModal}
        status={status}
        currentVersion={currentVersion}
        latestRelease={latestRelease}
        error={updaterError}
        progress={updaterProgress}
        onUpdateNow={downloadAndInstallUpdate}
        onLater={dismissUpdate}
        onSkipVersion={skipVersion}
        onCheckAgain={() => checkForUpdates({ isManual: true })}
        onOpenReleaseNotes={openReleaseNotes}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickClean={handleQuickClean}
        ramUsagePercent={stats?.ram_usage_percent}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-surface-950 dark:via-surface-900/60 dark:to-surface-950">
        {/* Top Header */}
        <TopBar
          theme={theme}
          toggleTheme={toggleTheme}
          stats={stats}
          onRefresh={() => {}}
          activeTabTitle={activeNav?.label || 'Dashboard'}
        />

        {/* Non-intrusive Update Notification Banner (Hidden during onboarding) */}
        {!showFirstRun && bannerVisible && latestRelease && (
          <UpdateBanner
            latestVersion={latestRelease.version}
            onOpenModal={openModal}
            onUpdateNow={downloadAndInstallUpdate}
            onDismiss={dismissUpdate}
          />
        )}

        {/* Dynamic Toast Notification */}
        {toast && (
          <div className="fixed top-14 right-6 z-50 animate-bounce">
            <div className="glass-panel px-4 py-2.5 rounded-xl border border-brand-500/50 shadow-2xl bg-white/95 dark:bg-surface-900/95 text-xs text-brand-600 dark:text-brand-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              {toast}
            </div>
          </div>
        )}

        {/* Scrollable Viewport with Suspense Boundary */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <Suspense fallback={<PageLoading />}>
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
            {activeTab === 'performance' && <Performance />}
            {activeTab === 'startup' && <StartupManager />}
            {activeTab === 'cleanup' && <CleanupCenter />}
            {activeTab === 'hardware' && <HardwareMonitor stats={stats} />}
            {activeTab === 'security' && <SecurityCenter />}
            {activeTab === 'benchmark' && <Benchmark />}
            {activeTab === 'settings' && <Settings theme={theme} toggleTheme={toggleTheme} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
