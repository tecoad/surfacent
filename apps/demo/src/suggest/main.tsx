import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import "@fontsource-variable/inter";
import { DemoToolbar } from "../toolbar";
import SuggestLab from "./SuggestLab";
import "./suggest.css";

// Editing the page re-runs this module; reuse the root instead of mounting a second app.
const root: Root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;

root.render(
  <StrictMode>
    <SuggestLab />
    {import.meta.env.DEV && <DemoToolbar appName="Suggest test" />}
  </StrictMode>,
);
