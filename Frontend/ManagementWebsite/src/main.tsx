import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/tailwind.css'
import './styles/components.css'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'

// The app is HashRouter-based (routes live under '#/...'), but the backend's VNPAY Return
// handler redirects to VNPAY_FRONTEND_RESULT_URL as a plain path
// (http://localhost:5173/payment/vnpay-result?txnRef=...) so that env var stays a literal,
// human-readable URL rather than encoding router internals. Bridge the two here, once,
// before the router mounts: land on that bare path and convert it into the equivalent
// hash route with the same query string, preserving txnRef.
if (window.location.pathname === '/payment/vnpay-result' && !window.location.hash) {
  window.location.replace('/#/payment/vnpay-result' + window.location.search)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
