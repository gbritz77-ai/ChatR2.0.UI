import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

// ─── Android status-bar offset ───────────────────────────────────────────────
// Set SYNCHRONOUSLY before React's first render so there is zero layout flash.
// We use navigator.userAgent (always available, no Capacitor bridge needed).
// Java's evaluateJavascript will refine the value later, but ONLY if it gets
// a value > 0 — so this default can never be accidentally reset to 0.
//
// 28px = ~28dp which matches Samsung One UI 6 status bar height.
// If Java measures a different value it will override this automatically.
if (/Android/i.test(navigator.userAgent)) {
  document.documentElement.style.setProperty('--android-top', '28px');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
