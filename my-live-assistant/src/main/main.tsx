import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import path from "path";

interface MediaSource {
  id: string;
  name: string;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle(
    "get-media-sources",
    async (): Promise<{ audio: MediaSource[]; video: MediaSource[] }> => {
      console.log("Main process: Received request for media sources.");
      try {
        const videoSourcesRaw = await desktopCapturer.getSources({
          types: ["window", "screen"],
        });
        const videoSources: MediaSource[] = videoSourcesRaw.map((source) => ({
          id: source.id,
          name: source.name,
        }));

        const audioSources: MediaSource[] = [];

        const desktopSources = await desktopCapturer.getSources({
          types: ["window", "screen"],
        });
        console.log(
          `Main process: Found ${desktopSources.length} desktop sources.`
        );

        return {
          audio: audioSources,
          video: videoSources,
        };
      } catch (error) {
        console.error("Main process: Error getting media sources:", error);
        throw error;
      }
    }
  );

  createWindow();
});
