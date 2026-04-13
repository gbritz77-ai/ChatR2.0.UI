import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

// ─── Cross-platform status-bar offset ────────────────────────────────────────
// Android: env(safe-area-inset-top) is always 0 in Android WebView, so we
//   set --status-bar-top manually. Java's evaluateJavascript refines it later.
// iOS:     env(safe-area-inset-top) works natively in WebKit — no JS needed.
//   We leave --status-bar-top unset so the CSS fallback to env() takes over.
if (/Android/i.test(navigator.userAgent)) {
  document.documentElement.style.setProperty('--status-bar-top', '28px');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
