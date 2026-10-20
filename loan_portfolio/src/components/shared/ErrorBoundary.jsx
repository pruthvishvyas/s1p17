import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: '' };
  }
  static getDerivedStateFromError(err) {
    return { failed: true, message: err && err.message ? err.message : 'Unknown error' };
  }
  componentDidCatch(err) {
    console.error('ErrorBoundary caught:', err);
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="empty-message">This {this.props.label || 'panel'} could not be displayed.</p>
          <p className="empty-action">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
