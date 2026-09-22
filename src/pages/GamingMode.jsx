import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import { Gamepad2, Plus, Trash2, Zap, Sparkles, CheckCircle2, Sliders } from 'lucide-react';

export function GamingMode({ onCleanMemory }) {
  const [profiles, setProfiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    name: '',
    process_name: '',
    power_mode: 'Ultimate Performance',
    auto_clean_ram: true,
    deprioritize_background: true,
    enabled: true,
  });

  const fetchProfiles = async () => {
    try {
      const list = await api.getGamingProfiles();
      setProfiles(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSaveProfile = async () => {
    if (!newGame.name || !newGame.process_name) return;
    try {
      await api.saveGamingProfile(newGame);
      setIsModalOpen(false);
      setNewGame({
        name: '',
        process_name: '',
        power_mode: 'Ultimate Performance',
        auto_clean_ram: true,
        deprioritize_background: true,
        enabled: true,
      });
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteGamingProfile(id);
      fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (profile) => {
    const updated = { ...profile, enabled: !profile.enabled };
    await api.saveGamingProfile(updated);
    fetchProfiles();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Hero Header */}
      <Card className="p-5 bg-gradient-to-r from-surface-900 via-surface-900 to-indigo-950/40 border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-brand-400" />
            <h2 className="text-lg font-bold text-slate-100">Gaming Mode & Auto-Optimization</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            SystemPilot automatically detects when configured game processes launch. It immediately trims background standby memory, switches Windows to maximum performance power scheme, and deprioritizes non-essential processes.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setIsModalOpen(true)}
          className="shadow-lg shadow-brand-600/30"
        >
          Add Game Profile
        </Button>
      </Card>

      {/* Profiles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{profile.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{profile.process_name}</p>
                </div>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-surface-800 transition"
                  title="Remove Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 pt-3 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Power Scheme:</span>
                  <span className="font-semibold text-slate-200">{profile.power_mode}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-brand-400" /> Auto-RAM Trim:</span>
                  <span className={profile.auto_clean_ram ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {profile.auto_clean_ram ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Auto-Detection</span>
              <Toggle
                enabled={profile.enabled}
                onChange={() => handleToggle(profile)}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Add Game Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Game Profile"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveProfile}>
              Save Game Profile
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Game Title</label>
            <input
              type="text"
              placeholder="e.g. Cyberpunk 2077"
              value={newGame.name}
              onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
              className="w-full bg-surface-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Executable Process Name (.exe)</label>
            <input
              type="text"
              placeholder="e.g. Cyberpunk2077.exe"
              value={newGame.process_name}
              onChange={(e) => setNewGame({ ...newGame, process_name: e.target.value })}
              className="w-full bg-surface-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Target Power Scheme</label>
            <select
              value={newGame.power_mode}
              onChange={(e) => setNewGame({ ...newGame, power_mode: e.target.value })}
              className="w-full bg-surface-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="Ultimate Performance">Ultimate Performance</option>
              <option value="High performance">High Performance</option>
              <option value="Balanced">Balanced</option>
            </select>
          </div>

          <Toggle
            enabled={newGame.auto_clean_ram}
            onChange={(val) => setNewGame({ ...newGame, auto_clean_ram: val })}
            label="Auto-clean RAM on launch"
            description="Releases working sets before the game starts loading assets."
          />
        </div>
      </Modal>
    </div>
  );
}
