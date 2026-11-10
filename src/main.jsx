import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontSize: "14px",
                borderRadius: "10px",
                background: "var(--card-bg)",
                color: "var(--text-main)",
                border: "1px solid var(--card-border)",
                                },
              success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
