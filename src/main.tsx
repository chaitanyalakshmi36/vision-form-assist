import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { supabase } from "./lib/supabase";

supabase.auth.getSession().then(({ data }) => {
  const session = data.session;

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
