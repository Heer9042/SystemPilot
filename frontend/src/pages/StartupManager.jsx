import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Toggle } from '../components/ui/Toggle';
import { api } from '../services/tauriApi';
import { Rocket, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';

export function StartupManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const list = await api.getStartupItems();
      setItems(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggle = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Windows Startup Applications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Applications configured to start automatically with Windows login
          </p>
        </div>
        <Badge variant="brand" size="md">
          {items.length} Startup Entries
        </Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-surface-800/30 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">{item.name}</h3>
                  <Badge variant="neutral" size="xs">
                    {item.publisher}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-xl">
                  {item.command}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Registry / Location: {item.location}</span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <Toggle
                  enabled={item.enabled}
                  onChange={() => handleToggle(item.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
