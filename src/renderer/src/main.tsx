import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { createBrowserWebApi } from './webApi'

// If running in a web browser on http://localhost:5173, connect to local backend API
if (!window.api) {
  window.api = createBrowserWebApi()
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
