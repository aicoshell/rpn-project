import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Docs from './Docs'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

const el = document.getElementById('root')!
createRoot(el).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
