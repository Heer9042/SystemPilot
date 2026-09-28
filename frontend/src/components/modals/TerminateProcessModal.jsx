import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

export function TerminateProcessModal({ isOpen, onClose, onConfirm, process: targetProc }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Terminate Process — ${targetProc?.name}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            Terminate Process
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <p className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> Are you sure you want to end this process?
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Terminating <strong>{targetProc?.name}</strong> (PID: {targetProc?.pid}) will immediately stop its execution. Any unsaved application state may be lost.
        </p>
      </div>
    </Modal>
  );
}
