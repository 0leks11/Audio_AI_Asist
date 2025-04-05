// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

console.log("[Preload] Инициализация preload.ts");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Новый метод для получения только desktop источников (экраны и окна)
  getDesktopSources: async () => {
    try {
      console.log("[Preload] Вызов getDesktopSources через IPC");
      const sources = await ipcRenderer.invoke("get-desktop-sources");
      console.log("[Preload] Получены desktop источники:", sources);
      return sources;
    } catch (error) {
      console.error("[Preload] Ошибка получения desktop источников:", error);
      return []; // Возвращаем пустой массив в случае ошибки
    }
  },
  getBackendPort: async () => {
    try {
      console.log("[Preload] Вызов getBackendPort через IPC");
      const result = await ipcRenderer.invoke("get-backend-port");
      console.log("[Preload] Получен порт бэкенда:", result);
      return result;
    } catch (error) {
      console.error("[Preload] Ошибка получения порта бэкенда:", error);
      return "8080"; // Возвращаем порт по умолчанию в случае ошибки
    }
  },
});
