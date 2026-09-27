// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Entrance and scroll animations start from a hidden state. Scoping that
// state to this class means content stays visible if this script never runs.
document.documentElement.classList.add("motion-ready");

// Stripe is not set up here: PaymentInitiatePage creates its own <Elements>
// provider, so Stripe.js loads only when someone opens the payment page.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
