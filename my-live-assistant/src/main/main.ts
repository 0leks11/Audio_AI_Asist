// import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
// import path from 'path';
// // Make sure to define MediaSource type here as well or import if shared
// interface MediaSource { id: string; name: string; }

// function createWindow() {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       preload: path.join(__dirname, 'preload.js'), // Ensure correct path
//       contextIsolation: true,
//       nodeIntegration: false,
//     },
//   });
//   // Load your renderer URL (e.g., localhost during dev, index.html for build)
//    if (process.env.NODE_ENV === 'development') {
//      mainWindow.loadURL('http://localhost:3000'); // Adjust port if needed
//      mainWindow.webContents.openDevTools();
//    } else {
//      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')); // Adjust path
//    }
// }

// app.whenReady().then(() => {
//   // IPC Handler for getting sources
//   ipcMain.handle('get-media-sources', async (): Promise<{ audio: MediaSource[], video: MediaSource[] }> => {
//     console.log("Main process: Received request for media sources.");
//     try {
//       // Fetch desktop capturer sources (screens, windows)
//       const videoSourcesRaw = await desktopCapturer.getSources({ types: ['window', 'screen'] });
//       const videoSources: MediaSource[] = videoSourcesRaw.map(source => ({
//           id: source.id,
//           name: source.name,
//           // You might want to add source.displayId or other metadata if needed
//       }));

//       // Fetch audio input sources using navigator.mediaDevices in a hidden window?
//       // Or use a Node.js audio library in the main process (more complex setup).
//       // A simpler approach for audio often involves getting sources in the RENDERER
//       // using navigator.mediaDevices.enumerateDevices() and filtering for 'audioinput'.
//       // The `getUserMedia` call in the renderer will handle audio permissions.
//       // For system audio (loopback), it's OS-specific and harder.
//       // Let's assume for now audio sources are also retrieved in renderer via enumerateDevices,
//       // OR if you *need* system audio capture, you'd use a dedicated Node library here.
//       // Sending placeholder audio sources from main for structure:
//        const audioSources: MediaSource[] = [
//            // In a real app, populate this dynamically if possible from main,
//            // or let the renderer handle it entirely via enumerateDevices.
//            // { id: 'default', name: 'Default Microphone' } // Example
//        ];

//       // Let's refine: It's generally better for the *renderer* to get *all* sources
//       // using navigator.mediaDevices.enumerateDevices() because it handles permissions
//       // and provides a unified list. The main process is primarily needed for
//       // *desktopCapturer* specifically for screen/window IDs required by `getUserMedia`.

//       // REVISED IPC Handler: Only provide desktop sources from main.
//       // The renderer will merge these with its own enumerated devices.

//        const desktopSources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
//        console.log(`Main process: Found ${desktopSources.length} desktop sources.`);
//        // The renderer will need both `enumerateDevices` (for mics/cameras) and this list.
//        // Return just the desktop sources. The renderer combines them.
//        return desktopSources.map(s => ({ id: s.id, name: s.name })); // Now just returns video sources

//     } catch (error) {
//       console.error("Main process: Error getting media sources:", error);
//       throw error; // Propagate error back to renderer
//     }
//   });

//   createWindow();
//   // ... other main process setup
// });

// // --- Revised Plan ---
// // 1. Main Process: `ipcMain.handle('get-desktop-sources')` uses `desktopCapturer` and returns `[{ id, name }]`.
// // 2. Preload Script: Exposes `window.electronAPI.getDesktopSources()`.
// // 3. Renderer `useMediaCapture` hook:
// //    - Calls `navigator.mediaDevices.enumerateDevices()` to get all sources (mics, cameras).
// //    - Calls `window.electronAPI.getDesktopSources()` to get screen/window sources.
// //    - *Merges* these lists to populate `availableAudioSources` and `availableVideoSources`.
// //    - Passes the correct `chromeMediaSourceId` based on selection to `getUserMedia`.
