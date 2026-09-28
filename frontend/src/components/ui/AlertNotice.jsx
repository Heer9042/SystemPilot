import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from './Card';

export function AlertNotice({ title, message }) {
  return (
    <Card className="p-4 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{title}</p>
          {message && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{message}</p>}
        </div>
      </div>
    </Card>
  );
}

export default AlertNotice;
