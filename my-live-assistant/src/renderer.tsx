/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 */

import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Получаем корневой элемент из HTML
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Создаем корень React
const root = createRoot(rootElement);

// Рендерим приложение
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("👋 React приложение успешно запущено с Tailwind CSS");
