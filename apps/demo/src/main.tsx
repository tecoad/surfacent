import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter";
import App from "./App";
import "./index.css";
import { DemoToolbar } from "./toolbar";

// Editing an aspect re-runs this module; reuse the root instead of mounting a second app.
const root: Root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;

root.render(
  <StrictMode>
    <App />
    {import.meta.env.DEV && <DemoToolbar appName="Surfacent demo" />}
  </StrictMode>,
);
