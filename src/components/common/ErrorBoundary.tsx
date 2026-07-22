import React from 'react';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  lastError: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, lastError: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, lastError: error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return (
          <div>
            {this.props.fallback}
            <div className="text-xs text-muted-foreground mt-2 font-mono">
              Error: {this.state.lastError?.message || String(this.state.lastError)}
            </div>
          </div>
        );
      }
      return null;
    }
    return this.props.children;
  }
}
