import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="size-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="size-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Algo correu mal</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            Ocorreu um erro inesperado. Pode tentar novamente ou recarregar a página.
          </p>
          {this.state.error && (
            <details className="text-xs text-gray-400 mb-4 max-w-lg text-left bg-gray-50 p-3 rounded border border-gray-200">
              <summary className="cursor-pointer font-medium">Detalhes do erro</summary>
              <pre className="mt-2 overflow-auto">{this.state.error.message}</pre>
            </details>
          )}
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">Tentar novamente</Button>
            <Button onClick={() => window.location.reload()}>Recarregar página</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
