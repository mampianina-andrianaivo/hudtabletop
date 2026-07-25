import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('hud-multiplayer-storage-v1');
    } catch (e) {
      console.error(e);
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0d11] text-white flex flex-col items-center justify-center p-6 text-center font-cinzel">
          <div className="max-w-md bg-black/80 border-2 border-red-600 rounded-lg p-6 shadow-2xl">
            <h1 className="text-xl font-bold text-red-500 mb-2">Display Error Encountered</h1>
            <p className="text-xs text-gray-300 font-sans mb-6">
              An unexpected interface error occurred. You can reset your view to return safely to the Home Dashboard.
            </p>
            <button
              onClick={this.handleReset}
              className="wow-button py-2.5 px-6 font-bold text-sm bg-red-950/80 border border-red-500 text-red-300 hover:bg-red-900 rounded uppercase tracking-wider"
            >
              Reset & Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
