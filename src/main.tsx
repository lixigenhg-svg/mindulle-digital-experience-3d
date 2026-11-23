import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import LuluDemo from './features/memorial/LuluDemo.jsx';

const isLuluDemo = new URLSearchParams(window.location.search).get('memorial') === 'lulu';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isLuluDemo ? <LuluDemo /> : <App />}
  </React.StrictMode>
);
