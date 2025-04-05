import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import path from "path"; // Path может быть не нужен после удаления path.join

// Эти константы будут предоставлены Webpack плагином Electron Forge
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Определяем тип только для видео
interface DesktopSource {
  id: string;
  name: string;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY, // Используем константу
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Загружаем URL рендерера, предоставленный Webpack
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Открываем DevTools в режиме разработки
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // --- Регистрируем ВСЕ обработчики IPC здесь ---

  ipcMain.handle("get-desktop-sources", async (): Promise<DesktopSource[]> => {
    console.log("--- [Main Process] Получен запрос get-desktop-sources ---");
    try {
      const videoSourcesRaw = await desktopCapturer.getSources({
        types: ["window", "screen"],
      });
      const videoSources: DesktopSource[] = videoSourcesRaw.map((source) => ({
        id: source.id,
        name: source.name,
      }));
      console.log(
        `--- [Main Process] Найдено desktop источников: ${videoSources.length} ---`
      );
      return videoSources;
    } catch (error) {
      console.error("--- [Main Process] Ошибка в get-desktop-sources:", error);
      throw error;
    }
  });

  ipcMain.handle("get-backend-port", () => {
    console.log("--- [Main Process] Получен запрос get-backend-port ---");
    return process.env.BACKEND_PORT || "8080";
  });

  // --- Создаем окно ---
  createWindow();
});

// Стандартная обработка закрытия и активации
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
