import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { ScrollArea } from './scroll-area';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // You can also send error reports to a logging service here
    const errorReport = {
      error: {
        message: error.message,
        stack: error.stack,
      },
      errorInfo: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', errorReport);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTitle className="text-lg font-semibold mb-2">
              Something went wrong
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-4">
                <p className="text-sm">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>

                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-slate-950">
                    <pre className="text-xs text-slate-200 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </ScrollArea>
                )}

                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="secondary"
                    onClick={this.handleReset}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleReload}
                  >
                    Reload page
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}