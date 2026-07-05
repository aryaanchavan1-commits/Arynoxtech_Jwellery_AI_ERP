import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      if (window.electronAPI?.db?.run) {
        const id = crypto.randomUUID();
        window.electronAPI.db.run(
          "INSERT INTO audit_log (id, action, entity_type, old_value, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
          [id, 'RENDER_ERROR', 'APP', `Error: ${error.message}\nStack: ${errorInfo?.componentStack?.slice(0, 500)}`]
        );
      }
    } catch(e) {}
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 40, textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ color: '#f59e0b', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 500, fontSize: 14 }}>
            An unexpected error occurred. The error has been logged. You can try reloading the app.
          </p>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            padding: 16, marginBottom: 24, maxWidth: 600, width: '100%',
            textAlign: 'left', fontSize: 12, fontFamily: 'monospace', color: '#ef4444',
            overflow: 'auto', maxHeight: 200
          }}>
            <div>{this.state.error?.message}</div>
            {this.state.errorInfo && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>Stack trace</summary>
                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#94a3b8' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={this.handleReload} style={{
              padding: '12px 32px', background: '#f59e0b', color: '#0f172a',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>
              🔄 Reload App
            </button>
            <button onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); }} style={{
              padding: '12px 32px', background: '#1e293b', color: '#e2e8f0',
              border: '1px solid #334155', borderRadius: 8, fontSize: 14, cursor: 'pointer'
            }}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
