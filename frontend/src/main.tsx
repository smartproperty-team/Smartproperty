// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const originalConsoleError = console.error;

const safeStringify = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      try {
        return Object.prototype.toString.call(value);
      } catch {
        return '[object]';
      }
    }
  }
  return String(value);
};

console.error = (...args: unknown[]) => {
  try {
    return originalConsoleError(...args);
  } catch (consoleError) {
    const safeArgs = args.map((arg) => {
      if (arg instanceof Error) return arg.message;
      return safeStringify(arg);
    });
    return originalConsoleError(
      '[SAFE CONSOLE ERROR]',
      ...safeArgs,
      safeStringify(consoleError),
    );
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
