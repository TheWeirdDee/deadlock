'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <div className="glass-card p-8 max-w-md w-full border-t-2 border-red-500 text-center space-y-4">
            <p className="text-red-400 font-bold text-xs tracking-widest uppercase">Something went wrong</p>
            <p className="text-gray-500 text-xs font-mono">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="text-xs font-bold uppercase tracking-widest border border-white/20 px-4 py-2 hover:border-white/60 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
