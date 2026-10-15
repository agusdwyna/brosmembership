import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <span className="text-danger text-xl font-bold">!</span>
          </div>
          <h2 className="text-[16px] font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-[13px] text-secondary mb-1 max-w-md">
            An unexpected error occurred while rendering this page.
          </p>
          {this.state.error && (
            <p className="text-[12px] text-muted font-mono bg-bg px-3 py-2 rounded-[4px] mb-4 max-w-lg overflow-auto">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button onClick={this.handleReset}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
