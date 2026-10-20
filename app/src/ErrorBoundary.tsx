import { Component, type ReactNode } from 'react'

// If something unexpected breaks, show a calm message instead of a blank window.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="fail" role="alert">
        <h1>Something went wrong.</h1>
        <p>Your files are safe. Crate only reads them. Reload to try again.</p>
        <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
