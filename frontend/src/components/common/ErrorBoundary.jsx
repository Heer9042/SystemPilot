import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { handleApplicationError } from '../../services/errorHandler';
import { Button } from '../ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
      referenceId: null,
    };
  }

  static getDerivedStateFromError(error) {
    const handled = handleApplicationError(error, 'react_render');
    return {
      hasError: true,
      referenceId: handled.referenceId,
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[SystemPilot ErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorInfo: null, referenceId: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[320px] text-center bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 m-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Something went wrong
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              An unexpected error occurred while displaying this view. Your system settings and diagnostics remain safe.
            </p>
            {this.state.referenceId && (
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-1">
                Reference: {this.state.referenceId}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
