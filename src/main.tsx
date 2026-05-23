// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // 如果没有这个文件，可以先创建一个空的

ReactDOM.createRoot(document.getElementById("root")!).render(
  //<React.StrictMode>
  <App />,
  //</React.StrictMode>,
);
