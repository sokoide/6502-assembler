import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Assembler error boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-900 border border-red-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-300 mb-4">Something went wrong</h2>
            <p className="text-red-200 mb-4">
              The assembler encountered an unexpected error. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <details className="text-xs text-red-300 mt-4">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 text-left bg-red-950 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}