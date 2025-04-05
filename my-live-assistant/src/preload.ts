// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { MediaSource } from "./types"; // Import types if shared

contextBridge.exposeInMainWorld("electronAPI", {
  getMediaSources: async (): Promise<{
    audio: MediaSource[];
    video: MediaSource[];
  }> => {
    try {
      // Use desktopCapturer in the main process via IPC
      const sources = await ipcRenderer.invoke("get-media-sources");
      // Basic validation
      if (
        !sources ||
        !Array.isArray(sources.audio) ||
        !Array.isArray(sources.video)
      ) {
        console.error("Invalid sources received from main process:", sources);
        throw new Error("Received invalid media sources format.");
      }
      return sources;
    } catch (error) {
      console.error("Error invoking get-media-sources:", error);
      // Re-throw or return empty to indicate failure
      throw error; // Let the caller handle it
    }
  },
  getBackendPort: async () => {
    try {
      // Запрашиваем порт бэкенда из main process
      return await ipcRenderer.invoke("get-backend-port");
    } catch (error) {
      console.error("Error getting backend port from main process:", error);
      return "8080"; // Возвращаем порт по умолчанию в случае ошибки
    }
  },
  // Add other functions to expose here, e.g.:   // minimizeWindow: () => ipcRenderer.send('minimize-window'),
  // closeWindow: () => ipcRenderer.send('close-window'),
});
