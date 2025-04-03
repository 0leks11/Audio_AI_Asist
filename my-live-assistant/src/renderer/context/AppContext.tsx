import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating message IDs
import {
    AppState,
    AppContextValue,
    Message,
    WebSocketStatus,
    MediaSource,
} from '../../types';
import { useGeminiWebSocket } from '../hooks/useGeminiWebSocket';
import { useMediaCapture } from '../hooks/useMediaCapture';

// --- Constants ---
// TODO: Move to a config file or environment variables
const GEMINI_WEBSOCKET_URL = 'wss://your-gemini-websocket-endpoint'; // Replace with actual URL
const PRESET_PROMPT_TEMPLATE = `You are a live assistant integrated into a desktop application built with Electron. 
Your role is to receive real-time audio and screen capture streams from the application 
and provide concise, helpful, and accurate text responses in Russian only. 

Guidelines:
- Respond only in plain text in a chat format.
- Base your responses solely on the received audio and visual data.
- Do not output any other formats or media.
- Act as a live consultant: if the user is taking an exam or doing live coding, 
  provide advice and solutions based on what you 'hear' and 'see'.
- Always answer in Russian, and ensure that your responses are clear and relevant.

End every response with a brief summary if appropriate.`;
// Consider allowing user input to be appended or used differently
// const USER_CONTEXT_PROMPT = "\n\nUser context/request: {userInput}";


// --- Reducer Logic (Example) ---
// Define action types
type Action =
  | { type: 'ADD_MESSAGE'; payload: Omit<Message, 'id' | 'timestamp'> }
  | { type: 'SET_USER_PROMPT'; payload: string }
  | { type: 'SET_WEB_SOCKET_STATUS'; payload: WebSocketStatus }
  | { type: 'SET_WEB_SOCKET_ERROR'; payload: string | null }
  | { type: 'SET_IS_CAPTURING'; payload: boolean }
  | { type: 'SET_CAPTURE_ERROR'; payload: string | null }
  | { type: 'SET_MEDIA_SOURCES_LOADING'; payload: boolean }
  | { type: 'SET_MEDIA_SOURCES'; payload: { audio: MediaSource[]; video: MediaSource[] } }
  | { type: 'SET_SELECTED_SOURCES'; payload: { audioSourceId: string | null; videoSourceId: string | null } }
  | { type: 'SET_LOADING_RESPONSE'; payload: boolean };


const initialState: AppState = {
  chat: {
    messages: [],
    isLoadingResponse: false,
  },
  capture: {
    isCapturing: false,
    audioSourceId: null,
    videoSourceId: null,
    availableAudioSources: [],
    availableVideoSources: [],
    error: null,
    isLoadingSources: false,
  },
  geminiWebSocket: {
    status: 'disconnected',
    error: null,
  },
  userPrompt: '', // Initialize user prompt if needed
  presetPrompt: PRESET_PROMPT_TEMPLATE,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      const newMessage: Message = {
        ...action.payload,
        id: uuidv4(),
        timestamp: Date.now(),
      };
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, newMessage],
          isLoadingResponse: action.payload.sender === 'user', // Start loading when user sends
        },
      };
     case 'SET_LOADING_RESPONSE':
        return {
            ...state,
            chat: { ...state.chat, isLoadingResponse: action.payload },
        };
    case 'SET_USER_PROMPT':
      return { ...state, userPrompt: action.payload };
    case 'SET_WEB_SOCKET_STATUS':
      return {
        ...state,
        geminiWebSocket: { ...state.geminiWebSocket, status: action.payload },
      };
    case 'SET_WEB_SOCKET_ERROR':
       return {
        ...state,
        geminiWebSocket: { ...state.geminiWebSocket, error: action.payload },
      };
     case 'SET_IS_CAPTURING':
      return { ...state, capture: { ...state.capture, isCapturing: action.payload } };
    case 'SET_CAPTURE_ERROR':
       return { ...state, capture: { ...state.capture, error: action.payload } };
    case 'SET_MEDIA_SOURCES_LOADING':
        return { ...state, capture: { ...state.capture, isLoadingSources: action.payload }};
    case 'SET_MEDIA_SOURCES':
        return {
            ...state,
            capture: {
                ...state.capture,
                availableAudioSources: action.payload.audio,
                availableVideoSources: action.payload.video,
                // Reset selected if sources change? Or try to keep selection?
                // audioSourceId: state.capture.audioSourceId,
                // videoSourceId: state.capture.videoSourceId,
                isLoadingSources: false, // Ensure loading is false
            },
        };
    case 'SET_SELECTED_SOURCES':
        return {
            ...state,
            capture: {
                ...state.capture,
                audioSourceId: action.payload.audioSourceId,
                videoSourceId: action.payload.videoSourceId,
            },
        };
    default:
      return state;
  }
};


// --- Context Definition ---
const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


// --- Provider Component ---
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // --- WebSocket Integration ---
  const handleWebSocketMessage = useCallback((text: string) => {
     // Received a message from Gemini
    dispatch({ type: 'ADD_MESSAGE', payload: { text, sender: 'gemini' } });
    dispatch({ type: 'SET_LOADING_RESPONSE', payload: false }); // Stop loading indicator
    dispatch({ type: 'SET_WEB_SOCKET_ERROR', payload: null }); // Clear error on success
  }, []);

  const handleWebSocketError = useCallback((error: Event | string) => {
    const message = typeof error === 'string' ? error : 'WebSocket connection error';
    dispatch({ type: 'SET_WEB_SOCKET_ERROR', payload: message });
    dispatch({ type: 'SET_LOADING_RESPONSE', payload: false }); // Stop loading if error occurs
     // Consider stopping capture if WebSocket fails critically
     // stopCaptureInternal(); // Call the internal stop function if needed
  }, []);

  const handleWebSocketClose = useCallback(() => {
      // Only update status if not already error or disconnected intentionally
      if (state.geminiWebSocket.status !== 'error' && state.geminiWebSocket.status !== 'disconnected') {
           dispatch({ type: 'SET_WEB_SOCKET_STATUS', payload: 'disconnected' });
      }
      // Optionally attempt reconnect or notify user
  }, [state.geminiWebSocket.status]); // Depend on status

   const {
    status: wsStatus,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage: wsSendMessage,
    error: wsError,
  } = useGeminiWebSocket({
    url: GEMINI_WEBSOCKET_URL,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    onClose: handleWebSocketClose,
    // TODO: Add API Key handling if required
  });

   // Sync WebSocket status and error from hook to reducer state
  useEffect(() => {
    dispatch({ type: 'SET_WEB_SOCKET_STATUS', payload: wsStatus });
  }, [wsStatus]);

  useEffect(() => {
    // Only update if the hook reports an error different from the current state
    if (wsError !== state.geminiWebSocket.error) {
        dispatch({ type: 'SET_WEB_SOCKET_ERROR', payload: wsError });
    }
  }, [wsError, state.geminiWebSocket.error]);


  // --- Media Capture Integration ---
   const handleCaptureData = useCallback((data: Blob) => {
    // Send data chunk via WebSocket
    wsSendMessage(data);
  }, [wsSendMessage]); // wsSendMessage is memoized by its hook

  const handleCaptureError = useCallback((error: string) => {
    dispatch({ type: 'SET_CAPTURE_ERROR', payload: error });
    dispatch({ type: 'SET_IS_CAPTURING', payload: false }); // Ensure capturing stops on error
    wsDisconnect(); // Disconnect WebSocket if capture fails
  }, [wsDisconnect]);

   const {
    isCapturing: mediaIsCapturing,
    startCapture: mediaStartCapture,
    stopCapture: mediaStopCapture,
    error: captureError,
    isLoadingSources,
    availableAudioSources,
    availableVideoSources,
    loadSources: mediaLoadSources, // Renamed to avoid conflict
  } = useMediaCapture({
    onDataAvailable: handleCaptureData,
    onError: handleCaptureError,
    // timeslice: 1000, // Optional: configure timeslice
  });

  // Sync capture state and error from hook to reducer state
  useEffect(() => {
    dispatch({ type: 'SET_IS_CAPTURING', payload: mediaIsCapturing });
  }, [mediaIsCapturing]);

  useEffect(() => {
     if (captureError !== state.capture.error) {
        dispatch({ type: 'SET_CAPTURE_ERROR', payload: captureError });
     }
  }, [captureError, state.capture.error]);

  useEffect(() => {
      dispatch({ type: 'SET_MEDIA_SOURCES_LOADING', payload: isLoadingSources});
  }, [isLoadingSources]);

  useEffect(() => {
      // Simple check to see if sources differ before dispatching
      if (availableAudioSources !== state.capture.availableAudioSources || availableVideoSources !== state.capture.availableVideoSources) {
           dispatch({ type: 'SET_MEDIA_SOURCES', payload: { audio: availableAudioSources, video: availableVideoSources } });
      }
  }, [availableAudioSources, availableVideoSources, state.capture.availableAudioSources, state.capture.availableVideoSources]);


  // --- Actions exposed by Context ---
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    // If user message, potentially send it via WebSocket immediately or wait?
    // The current plan sends streams, not discrete user messages to Gemini?
    // If user text *should* be sent:
    // if (message.sender === 'user') {
    //    wsSendMessage(message.text);
    //    dispatch({ type: 'SET_LOADING_RESPONSE', payload: true });
    // }
  }, [/* wsSendMessage */]); // Add wsSendMessage if user text is sent

  const setUserPrompt = useCallback((prompt: string) => {
      dispatch({ type: 'SET_USER_PROMPT', payload: prompt });
  }, []);

  const loadMediaSources = useCallback(async () => {
      // Wrapper around the hook's loadSources
      dispatch({ type: 'SET_CAPTURE_ERROR', payload: null }); // Clear previous errors
      await mediaLoadSources();
  }, [mediaLoadSources]);

  const selectSources = useCallback((audioSourceId: string | null, videoSourceId: string | null) => {
        dispatch({ type: 'SET_SELECTED_SOURCES', payload: { audioSourceId, videoSourceId }});
  }, []);


  // Start the combined capture and WebSocket process
  const startCapture = useCallback(async (audioSourceId: string, videoSourceId: string) => {
    if (!audioSourceId || !videoSourceId) {
        handleCaptureError("Audio and Video sources must be selected.");
        return;
    }
    if (mediaIsCapturing || wsStatus === 'connecting' || wsStatus === 'connected') {
        console.warn("Capture or connection already active.");
        return;
    }

    // 1. Clear previous errors
    dispatch({ type: 'SET_CAPTURE_ERROR', payload: null });
    dispatch({ type: 'SET_WEB_SOCKET_ERROR', payload: null });

    // 2. Connect WebSocket
    wsConnect(); // Hook handles setting status to 'connecting' etc.

    // 3. Wait for WebSocket connection *before* starting media capture and sending prompt
    //    This requires managing async flow carefully.
    //    Option A: Use an effect that triggers mediaStartCapture when wsStatus becomes 'connected'.
    //    Option B: Poll or use a promise-based approach within this function (more complex).

    // Using an effect is cleaner (add to the Provider component):
    // useEffect(() => {
    //     if (wsStatus === 'connected' && state.capture.needsToStartCapture) { // Add a flag like 'needsToStartCapture'
    //         dispatch({ type: 'SET_NEEDS_TO_START_CAPTURE', payload: false });
    //         // Now start media capture
    //         // Ensure selected sources are available in state here
    //         const { audioSourceId, videoSourceId } = state.capture;
    //         if(audioSourceId && videoSourceId) {
    //              // Send initial prompt(s)
    //              wsSendMessage(state.presetPrompt);
    //              // Optionally add user prompt: wsSendMessage(state.userPrompt);
    //
    //              mediaStartCapture(audioSourceId, videoSourceId)
    //                  .catch(err => console.error("Failed to start media capture after connect", err)); // Error handled by hook too
    //         } else {
    //              handleCaptureError("Sources not selected when attempting to start capture post-connect.");
    //         }
    //     }
    // }, [wsStatus, state.capture.needsToStartCapture, mediaStartCapture, wsSendMessage, state.presetPrompt, state.userPrompt, state.capture.audioSourceId, state.capture.videoSourceId, handleCaptureError]);


    // Simpler inline async approach (less robust for edge cases):
    try {
        // Wait for connection (crude polling - promises/events better)
        await new Promise<void>((resolve, reject) => {
            const maxWait = 10000; // 10 seconds timeout
            const interval = 100;
            let waited = 0;

            const check = () => {
                const currentWs = wsStatusRef.current; // Need a ref to track latest status if using inline
                 if (currentWs === 'connected') {
                    resolve();
                } else if (currentWs === 'error' || currentWs === 'disconnected') {
                    reject(new Error(`WebSocket connection failed or closed: ${state.geminiWebSocket.error || 'Unknown reason'}`));
                } else if (waited >= maxWait) {
                    reject(new Error('WebSocket connection timed out'));
                } else {
                    waited += interval;
                    setTimeout(check, interval);
                }
            };
            // Need a ref to track status because wsStatus from closure might be stale
            const wsStatusRef = React.useRef(wsStatus);
            useEffect(() => { wsStatusRef.current = wsStatus }, [wsStatus]); // Keep ref updated

            check();
        });


        // 4. Send Preset Prompt via WebSocket
        wsSendMessage(state.presetPrompt);
        // Optionally add user prompt here if needed
        // if (state.userPrompt) { wsSendMessage(USER_CONTEXT_PROMPT.replace('{userInput}', state.userPrompt)); }


        // 5. Start Media Capture (will start sending data via onDataAvailable callback)
        await mediaStartCapture(audioSourceId, videoSourceId);

        // If mediaStartCapture succeeds, the state.capture.isCapturing will be true via its hook/effect


    } catch (error) {
        console.error("Error during startCapture sequence:", error);
        const message = error instanceof Error ? error.message : "Failed to start process";
        // Ensure states are reset
        dispatch({ type: 'SET_WEB_SOCKET_ERROR', payload: message });
        dispatch({ type: 'SET_CAPTURE_ERROR', payload: message });
        dispatch({ type: 'SET_IS_CAPTURING', payload: false });
        wsDisconnect(); // Ensure WebSocket is closed on failure
    }


  }, [
    mediaIsCapturing, wsStatus, state.presetPrompt, // state.userPrompt, // if user prompt is sent
    wsConnect, wsSendMessage, mediaStartCapture, wsDisconnect, handleCaptureError // Include handleCaptureError
  ]);

  // Stop the combined process
  const stopCapture = useCallback(() => {
    mediaStopCapture(); // Stops media recorder and streams
    wsDisconnect();     // Closes WebSocket connection
    // Reducer state for isCapturing and wsStatus will update via hooks/effects
    dispatch({ type: 'SET_LOADING_RESPONSE', payload: false }); // Ensure loading indicator is off
  }, [mediaStopCapture, wsDisconnect]);


  // Memoize context value
  const contextValue = useMemo<AppContextValue>(() => ({
    state,
    dispatch, // Exposing dispatch OR specific functions below
    // Specific actions:
    addMessage,
    startCapture,
    stopCapture,
    setUserPrompt,
    loadMediaSources,
    selectSources,
  }), [state, dispatch, addMessage, startCapture, stopCapture, setUserPrompt, loadMediaSources, selectSources]);


  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
