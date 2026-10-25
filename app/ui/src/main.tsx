import React from 'react';
import { createRoot } from 'react-dom/client';
import './firebase';
import './utils/skinViewerManager';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
