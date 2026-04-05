// ADC typography — Geist variable fonts (loaded before any React renders)
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
