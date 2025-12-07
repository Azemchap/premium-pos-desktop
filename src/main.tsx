import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./globals.css";

// Log when the app starts
console.log("🚀 Application starting...");

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element not found. Make sure there is a <div id='root'></div> in your HTML.");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                }}
            >
                <App />
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>
);

console.log("✅ Application rendered successfully");