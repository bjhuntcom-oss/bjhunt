"use client";

import { Component, type ReactNode } from "react";

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

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-[14px] text-white mb-2">Something went wrong</div>
          <p className="text-[11px] text-[var(--text-muted)] mb-4 max-w-[400px]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-white text-black text-[10px] uppercase tracking-wider hover:bg-white/90"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
