import { contextBridge, ipcRenderer } from "electron";
import { MediaSource } from "../types"; // Исправлен путь к типам

// Определяем объект API, который будет предоставлен
const electronAPI = {
  // Функция для получения desktop источников (экраны, окна)
  getDesktopSources: (): Promise<MediaSource[]> => {
    console.log("[Preload] Вызов getDesktopSources через IPC"); // Логгирование
    return ipcRenderer
      .invoke("get-desktop-sources")
      .then((sources) => {
        console.log("[Preload] Получены desktop источники:", sources); // Логгирование
        // Простая проверка, что это массив (можно добавить более строгую)
        if (!Array.isArray(sources)) {
          console.error(
            "[Preload] Некорректные источники получены из main:",
            sources
          );
          throw new Error("Получен некорректный формат desktop источников.");
        }
        return sources;
      })
      .catch((error) => {
        console.error("[Preload] Ошибка получения desktop источников:", error); // Логгирование ошибки
        throw error; // Перебрасываем ошибку для обработки в рендерере
      });
  },

  // Функция для получения порта бэкенда
  getBackendPort: (): Promise<string> => {
    console.log("[Preload] Вызов getBackendPort через IPC"); // Логгирование
    return ipcRenderer
      .invoke("get-backend-port")
      .then((port) => {
        console.log("[Preload] Получен порт бэкенда:", port); // Логгирование
        // Проверка, что это строка
        if (typeof port !== "string") {
          console.error("[Preload] Некорректный порт получен из main:", port);
          throw new Error("Получен некорректный формат порта бэкенда.");
        }
        return port;
      })
      .catch((error) => {
        console.error("[Preload] Ошибка получения порта бэкенда:", error); // Логгирование ошибки
        throw error; // Перебрасываем ошибку
      });
  },
  // Добавь сюда другие функции, если они понадобятся
};

// Предоставляем API рендереру безопасно
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

console.log(
  "[Preload] Инициализация preload.ts завершена, electronAPI предоставлен."
); // Логгирование

// Этот блок нужен, чтобы TypeScript знал о window.electronAPI в рендерере.
// Если он уже есть в types.ts или другом d.ts файле, его можно не дублировать здесь.
/*
declare global {
  interface Window {
    electronAPI: typeof electronAPI; // Используем выведенный тип
    // Или можно использовать явный интерфейс:
    // electronAPI: import('../types').ElectronApi;
  }
}
*/
