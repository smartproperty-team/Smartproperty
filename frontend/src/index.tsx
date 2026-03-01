// ===========================================
// Legacy Entry Point (Marketing Landing)
// ===========================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./style.css";
import Home3 from "./views/home3";
import NotFound from "./views/not-found";

function LegacyApp() {
  return (
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home3 />} />
          <Route path="*" element={<NotFound />} />
          <Route path="**" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  );
}

const container = document.getElementById("root") ?? document.getElementById("app");

if (container) {
  createRoot(container).render(<LegacyApp />);
}

export default LegacyApp;

