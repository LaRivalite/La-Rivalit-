import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MatchProvider } from "./context/MatchContext";
import { SheetProvider } from "./context/SheetContext";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <MatchProvider>
      <SheetProvider>
          <App />
      </SheetProvider>
    </MatchProvider>
  </BrowserRouter>
);