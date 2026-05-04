// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51QwtaHCdbmFmls5VgXjMi6xq3hp8X2dSLmYMf0rY9aJROXfe3ZO6Z9mtxejKrKgtT59YtpaG3qpDlp8o7gKh061V00PTfumZHa",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Elements stripe={stripePromise}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Elements>
  </StrictMode>,
);
