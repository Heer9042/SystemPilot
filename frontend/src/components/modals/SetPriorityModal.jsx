import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const PRIORITY_LEVELS = ['High', 'AboveNormal', 'Normal', 'BelowNormal', 'Idle'];

/**
 * SetPriorityModal allows users to change process scheduling priority classes.
 */
export function SetPriorityModal({
  isOpen,
  onClose,
  targetProcess,
  onSetPriority,
  description = 'Changing process priority influences how the Windows scheduler allocates CPU timeslices. Higher priorities give preferential execution slices without hardware overclocking.',
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Set Windows Priority — ${targetProcess?.name}`}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {PRIORITY_LEVELS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => onSetPriority(p)}
              className="text-xs justify-center"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
