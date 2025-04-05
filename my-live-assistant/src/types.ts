/**
 * Represents a single message in the chat.
 */
export interface Message {
  id: string; // Unique identifier for the message
  text: string; // Content of the message
  sender: "user" | "gemini"; // Who sent the message
  timestamp: number; // Unix timestamp of when the message was created/received
}

/**
 * Represents the state of the WebSocket connection.
 */
export type WebSocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Represents available media sources.
 */
export interface MediaSource {
  id: string;
  name: string;
}

/**
 * Represents the state related to media capture.
 */
export interface CaptureState {
  isCapturing: boolean;
  audioSourceId: string | null; // Currently selected audio source ID
  videoSourceId: string | null; // Currently selected video source ID (e.g., screen/window ID)
  availableAudioSources: MediaSource[];
  availableVideoSources: MediaSource[]; // Screen/Window sources
  error: string | null; // Error message related to capture
  isLoadingSources: boolean; // Loading state for fetching sources
  selectedAudioSourceIdToStart: string | null; // ID аудио источника для старта
  selectedVideoSourceIdToStart: string | null; // ID видео источника для старта
}

/**
 * Represents the state related to the chat functionality.
 */
export interface ChatState {
  messages: Message[];
  isLoadingResponse: boolean; // True when waiting for a Gemini response
}

/**
 * Represents the state related to the WebSocket connection with Gemini API.
 */
export interface GeminiWebSocketState {
  status: WebSocketStatus;
  error: string | null; // Error message related to WebSocket connection
}

/**
 * Combined application state managed by contexts.
 * We might split this into multiple specific contexts for better separation.
 */
export interface AppState {
  chat: ChatState;
  capture: CaptureState;
  geminiWebSocket: GeminiWebSocketState;
  userPrompt: string; // Current user input prompt (if augmenting the preset)
  presetPrompt: string; // The main instruction prompt for Gemini
}

// Расширенный тип для dispatch с дополнительным свойством unsubscribe
export interface EnhancedDispatch extends React.Dispatch<any> {
  unsubscribe?: () => void;
}

// Type for the value provided by the AppContext
// We'll likely split this into more focused contexts
export interface AppContextValue {
  state: AppState;
  dispatch: EnhancedDispatch; // Используем расширенный тип
  // OR provide specific update functions:
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  startCapture: (audioSourceId: string, videoSourceId: string) => Promise<void>;
  stopCapture: () => void;
  setUserPrompt: (prompt: string) => void;
  loadMediaSources: () => Promise<void>;
  selectSources: (
    audioSourceId: string | null,
    videoSourceId: string | null
  ) => void;
  // ... other actions
}

// If using Electron's contextBridge for IPC
// Define the shape of the API exposed from preload script
export interface ElectronApi {
  getMediaSources: () => Promise<{
    audio: MediaSource[];
    video: MediaSource[];
  }>;
  getBackendPort: () => Promise<string>;
  // Add other IPC methods needed, e.g., related to window control
}

// Make it available on the window object if using contextBridge
declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}
