import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registrarPWA } from "./registrarPWA.js";

registrarPWA();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);