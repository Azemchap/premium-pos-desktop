import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error);
        console.error("Error info:", errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: "40px",
                    maxWidth: "800px",
                    margin: "0 auto",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                }}>
                    <div style={{
                        backgroundColor: "#fee",
                        border: "2px solid #f44",
                        borderRadius: "8px",
                        padding: "24px",
                    }}>
                        <h1 style={{
                            color: "#c00",
                            fontSize: "24px",
                            marginBottom: "16px",
                            marginTop: 0,
                        }}>
                            ⚠️ Something went wrong
                        </h1>

                        <p style={{
                            fontSize: "16px",
                            lineHeight: "1.5",
                            marginBottom: "16px",
                        }}>
                            The application encountered an unexpected error. This has been logged for investigation.
                        </p>

                        {this.state.error && (
                            <div style={{
                                backgroundColor: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                padding: "16px",
                                marginBottom: "16px",
                            }}>
                                <strong style={{ display: "block", marginBottom: "8px" }}>
                                    Error Message:
                                </strong>
                                <pre style={{
                                    margin: 0,
                                    fontSize: "14px",
                                    overflow: "auto",
                                    color: "#c00",
                                }}>
                                    {this.state.error.message}
                                </pre>
                            </div>
                        )}

                        {this.state.error?.stack && (
                            <details style={{ marginBottom: "16px" }}>
                                <summary style={{
                                    cursor: "pointer",
                                    padding: "8px",
                                    backgroundColor: "#f8f8f8",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                }}>
                                    Stack Trace (Click to expand)
                                </summary>
                                <pre style={{
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    padding: "16px",
                                    margin: 0,
                                    fontSize: "12px",
                                    overflow: "auto",
                                    maxHeight: "300px",
                                }}>
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        {this.state.errorInfo && (
                            <details>
                                <summary style={{
                                    cursor: "pointer",
                                    padding: "8px",
                                    backgroundColor: "#f8f8f8",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    marginBottom: "8px",
                                }}>
                                    Component Stack (Click to expand)
                                </summary>
                                <pre style={{
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    padding: "16px",
                                    margin: 0,
                                    fontSize: "12px",
                                    overflow: "auto",
                                    maxHeight: "300px",
                                }}>
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReload}
                            style={{
                                marginTop: "24px",
                                padding: "12px 24px",
                                backgroundColor: "#0066cc",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "16px",
                                cursor: "pointer",
                                fontWeight: "600",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0052a3"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#0066cc"}
                        >
                            🔄 Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;