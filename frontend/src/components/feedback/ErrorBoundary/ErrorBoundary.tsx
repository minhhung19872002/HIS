import React from 'react';
import { HttpError } from '../../shared/HttpError';

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <HttpError
          code={500}
          variant='fullpage'
          desc={this.state.error ? `${this.state.error.name}: ${this.state.error.message}` : undefined}
          onRetry={() => { this.setState({ hasError: false, error: null }); }}
          onBack={() => { this.setState({ hasError: false, error: null }); window.history.back(); }}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
