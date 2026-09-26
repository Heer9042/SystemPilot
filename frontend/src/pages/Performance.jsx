import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/tauriApi';
import { getUserErrorMessage } from '../services/errorHandler';
import { Gauge, Zap, Leaf, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

export function Performance() {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchPlans = async () => {
    try {
      const list = await api.getPowerPlans();
      setPlans(list || []);
      const active = list?.find((p) => p.is_active);
      if (active) setActivePlan(active.guid);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleApplyPlan = async (guid) => {
    try {
      await api.setPowerPlan(guid);
      setActivePlan(guid);
      setStatusMessage('Power scheme updated successfully in Windows.');
      fetchPlans();
    } catch (err) {
      setStatusMessage(getUserErrorMessage(err, 'authorization'));
    }
  };

  const handleRestoreDefaults = async () => {
    const balanced = plans.find((p) => p.name.toLowerCase().includes('balanced'));
    if (balanced) {
      await handleApplyPlan(balanced.guid);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Windows Performance & Power Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control Windows hardware CPU governor, power states, and system responsiveness
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleRestoreDefaults}>
          Restore Defaults (Balanced)
        </Button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Power Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const isActive = plan.guid === activePlan || plan.is_active;
          const isHigh = plan.name.toLowerCase().includes('high') || plan.name.toLowerCase().includes('ultimate');
          const isSaver = plan.name.toLowerCase().includes('saver');

          return (
            <Card
              key={plan.guid}
              className={`p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-brand-500/60 shadow-lg shadow-brand-500/10 bg-brand-50/20 dark:bg-surface-900'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isHigh
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                          : isSaver
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                          : 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500/30'
                      }`}
                    >
                      {isHigh ? <Zap className="w-5 h-5" /> : isSaver ? <Leaf className="w-5 h-5" /> : <Gauge className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-xs">{plan.guid}</p>
                    </div>
                  </div>

                  {isActive && <Badge variant="brand" size="xs">Active</Badge>}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 leading-relaxed">
                  {isHigh
                    ? 'Favors maximum processor performance and responsiveness. Disables aggressive core parking and throttling.'
                    : isSaver
                    ? 'Reduces CPU clock speed and screen energy consumption to preserve battery runtime.'
                    : 'Standard Windows balanced mode. Dynamically scales CPU frequency based on instantaneous workload.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button
                  variant={isActive ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={isActive}
                  onClick={() => handleApplyPlan(plan.guid)}
                >
                  {isActive ? 'Currently Active' : 'Apply Scheme'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
