import React from 'react';
import { AlertCircle, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { handleApplicationError } from '../../services/errorHandler';
import { api } from '../../services/tauriApi';
import { Button } from '../ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      referenceId: null,
      userMessage: null,
      showDetails: false,
      copiedRef: false,
    };
  }

  static getDerivedStateFromError(error) {
    const handled = handleApplicationError(error, 'react_render');
    return {
      hasError: true,
      error,
      referenceId: handled.referenceId,
      userMessage: handled.message,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (typeof console !== 'undefined' && console.error) {
      console.error('[SystemPilot ErrorBoundary]', error, errorInfo);
    }
    try {
      const msg = `[ErrorBoundary] ${error?.message || error} | ComponentStack: ${errorInfo?.componentStack?.slice(0, 300) || 'none'}`;
      api.logClientMessage('error', msg).catch(() => {});
    } catch (_) {}
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      referenceId: null,
      userMessage: null,
      showDetails: false,
      copiedRef: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyReference = () => {
    if (!this.state.referenceId) return;
    navigator.clipboard?.writeText(this.state.referenceId).then(() => {
      this.setState({ copiedRef: true });
      setTimeout(() => this.setState({ copiedRef: false }), 2000);
    }).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      const { referenceId, showDetails, copiedRef, error } = this.state;
      const sanitizedErrorName = error?.name || 'ApplicationError';
      const sanitizedErrorMsg = (error?.message || String(error) || 'An unexpected render error occurred').slice(0, 200);

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[340px] text-center bg-white dark:bg-surface-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 m-4">
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
            {referenceId && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  Reference: {referenceId}
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyReference}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Copy reference ID"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleRetry}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="flex items-center gap-1 text-slate-600 dark:text-slate-400"
            >
              {showDetails ? (
                <>Less Details <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Diagnostic Details <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </Button>
          </div>

          {showDetails && (
            <div className="w-full max-w-lg p-3 text-left rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1.5 text-slate-600 dark:text-slate-400 animate-fadeIn">
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                <span className="font-sans font-semibold text-slate-500">Classification:</span>
                <span className="text-rose-500">{sanitizedErrorName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                <span className="font-sans font-semibold text-slate-500">Diagnostic Reference:</span>
                <span>{referenceId || 'N/A'}</span>
              </div>
              <div>
                <span className="font-sans font-semibold text-slate-500 block mb-0.5">Sanitized Message:</span>
                <p className="break-all text-slate-700 dark:text-slate-300 bg-white dark:bg-surface-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                  {sanitizedErrorMsg}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
