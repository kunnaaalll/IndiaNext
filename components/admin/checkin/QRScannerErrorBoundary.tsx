'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class QRScannerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('QR Scanner Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6 font-mono">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-white tracking-widest uppercase">
                  Scanner_Error
                </h1>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  The QR scanner encountered an error. This might be due to camera permissions or
                  browser compatibility.
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-[10px] text-zinc-400 text-left space-y-2">
              <p className="font-bold text-zinc-300">Error Details:</p>
              <p className="font-mono text-red-400">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
            </div>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 active:scale-95 rounded-2xl text-[10px] text-white font-black tracking-[0.3em] uppercase transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Restart_Scanner
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
