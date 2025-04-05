// src/renderer/context/AppContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useState, // Добавляем useState для управления состоянием ожидания старта
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  AppState,
  AppContextValue,
  Message,
  WebSocketStatus,
  MediaSource,
} from "../../types";
import { useGeminiWebSocket } from "../hooks/useGeminiWebSocket";
import { useMediaCapture } from "../hooks/useMediaCapture";

// --- Константы ---
// Вместо использования константы напрямую, мы будем получать URL динамически
// const BACKEND_WEBSOCKET_URL = `ws://localhost:${process.env.BACKEND_PORT || 8080}`;
const PRESET_PROMPT_TEMPLATE = `You are a live assistant... (ваш полный промпт)`; // Сокращено для примера

// --- Reducer Logic (без изменений, кроме удаления ошибочной строки) ---
type Action =
  | { type: "ADD_MESSAGE"; payload: Omit<Message, "id" | "timestamp"> }
  | { type: "SET_USER_PROMPT"; payload: string }
  | { type: "SET_WEB_SOCKET_STATUS"; payload: WebSocketStatus }
  | { type: "SET_WEB_SOCKET_ERROR"; payload: string | null }
  | { type: "SET_IS_CAPTURING"; payload: boolean }
  | { type: "SET_CAPTURE_ERROR"; payload: string | null }
  | { type: "SET_MEDIA_SOURCES_LOADING"; payload: boolean }
  | {
      type: "SET_MEDIA_SOURCES";
      payload: { audio: MediaSource[]; video: MediaSource[] };
    }
  | {
      type: "SET_SELECTED_SOURCES";
      payload: { audioSourceId: string | null; videoSourceId: string | null };
    }
  | { type: "SET_LOADING_RESPONSE"; payload: boolean }
  // Добавляем действие для временного хранения ID для старта
  | {
      type: "SET_SOURCES_TO_START";
      payload: {
        audioSourceId: string | null;
        videoSourceId: string | null;
      } | null;
    };

const initialState: AppState = {
  chat: { messages: [], isLoadingResponse: false },
  capture: {
    isCapturing: false,
    audioSourceId: null,
    videoSourceId: null,
    availableAudioSources: [],
    availableVideoSources: [],
    error: null,
    isLoadingSources: false,
    // Добавляем поля для хранения ID на время старта
    selectedAudioSourceIdToStart: null,
    selectedVideoSourceIdToStart: null,
  },
  geminiWebSocket: { status: "disconnected", error: null },
  userPrompt: "",
  presetPrompt: PRESET_PROMPT_TEMPLATE,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "ADD_MESSAGE" /* ... */:
      break;
    case "SET_LOADING_RESPONSE" /* ... */:
      break;
    case "SET_USER_PROMPT" /* ... */:
      break;
    case "SET_WEB_SOCKET_STATUS" /* ... */:
      break;
    case "SET_WEB_SOCKET_ERROR" /* ... */:
      break;
    case "SET_IS_CAPTURING" /* ... */:
      break;
    case "SET_CAPTURE_ERROR" /* ... */:
      break;
    case "SET_MEDIA_SOURCES_LOADING" /* ... */:
      break;
    case "SET_MEDIA_SOURCES":
      // Логгируем перед изменением состояния
      console.log("[Reducer] Обновление источников:", action.payload);
      return {
        // Возвращаем НОВЫЙ объект state
        ...state,
        capture: {
          // Создаем НОВЫЙ объект capture
          ...state.capture,
          availableAudioSources: action.payload.audio,
          availableVideoSources: action.payload.video,
          isLoadingSources: false, // Убедимся, что сбрасываем флаг загрузки
        },
      };
    case "SET_SELECTED_SOURCES" /* ... */:
      break;
    // Обрабатываем новое действие
    case "SET_SOURCES_TO_START":
      return {
        ...state,
        capture: {
          ...state.capture,
          selectedAudioSourceIdToStart: action.payload?.audioSourceId ?? null,
          selectedVideoSourceIdToStart: action.payload?.videoSourceId ?? null,
        },
      };
    // --- ОШИБОЧНАЯ СТРОКА УДАЛЕНА ОТСЮДА ---
    default:
      return state;
  }
  // Реализации других кейсов редьюсера остаются как раньше...
  return state; // Заглушка, добавьте реальную логику
};

// --- Context Definition ---
const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext должен использоваться внутри AppProvider");
  }
  return context;
};

// --- Provider Component ---
interface AppProviderProps {
  children: React.ReactNode;
}
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Состояние для управления асинхронным процессом старта и URL бэкенда
  const [pendingAction, setPendingAction] = useState<"startCapture" | null>(
    null
  );
  const [backendUrl, setBackendUrl] = useState<string | null>(null);

  // Эффект для получения порта бэкенда из main процесса через preload
  useEffect(() => {
    const fetchBackendPort = async () => {
      try {
        // Используем API из preload скрипта для получения порта
        const port = await window.electronAPI.getBackendPort();
        setBackendUrl(`ws://localhost:${port}`);
        console.log(
          `Получен порт бэкенда: ${port}, URL: ws://localhost:${port}`
        );
      } catch (error) {
        console.error("Не удалось получить порт бэкенда:", error);
        // Устанавливаем URL по умолчанию при ошибке
        setBackendUrl("ws://localhost:8080");
      }
    };
    fetchBackendPort();
  }, []);

  // --- WebSocket Integration ---
  const handleWebSocketMessage = useCallback(
    (data: string | ArrayBuffer | Blob) => {
      if (typeof data === "string") {
        try {
          const message = JSON.parse(data);
          console.log("Сообщение от бэкенда:", message);

          if (message.type === "text_response") {
            dispatch({
              type: "ADD_MESSAGE",
              payload: { text: message.content, sender: "gemini" },
            });
            dispatch({ type: "SET_LOADING_RESPONSE", payload: false });
            dispatch({ type: "SET_WEB_SOCKET_ERROR", payload: null }); // Очистка ошибки при успехе
          } else if (message.type === "session_started") {
            console.log("Бэкенд подтвердил старт сессии Gemini.");
            // Можно обновить UI, если необходимо
          } else if (message.type === "session_stopped") {
            console.log("Бэкенд подтвердил остановку сессии Gemini.");
            // Можно обновить UI
          } else if (message.type === "error") {
            console.error("Ошибка от бэкенда:", message.message);
            dispatch({
              type: "SET_WEB_SOCKET_ERROR",
              payload: `Backend: ${message.message}`,
            });
            dispatch({ type: "SET_LOADING_RESPONSE", payload: false });
            // Если ошибка критическая, возможно, стоит остановить захват?
            // mediaStopCapture(); // Вызовет stopCapture ниже
            // setPendingAction(null); // Отменяем ожидание старта
          }
          // ... обработка других сообщений ...
        } catch (error) {
          console.error("Не удалось распарсить JSON от бэкенда:", data, error);
          // Можно отправить общую ошибку парсинга
          dispatch({
            type: "SET_WEB_SOCKET_ERROR",
            payload: "Invalid message format from backend",
          });
        }
      } else {
        console.warn("Получены неожиданные бинарные данные от бэкенда.");
      }
    },
    [dispatch]
  ); // Убрали mediaStopCapture из зависимостей, если он не используется напрямую

  const handleWebSocketError = useCallback(
    (error: Event | string) => {
      const message =
        typeof error === "string" ? error : "WebSocket connection error";
      console.error("WebSocket Error Callback:", message);
      dispatch({ type: "SET_WEB_SOCKET_ERROR", payload: message });
      dispatch({ type: "SET_LOADING_RESPONSE", payload: false });
      setPendingAction(null); // Отменяем ожидание старта при ошибке WS
    },
    [dispatch]
  );

  const handleWebSocketClose = useCallback(
    () => {
      console.log("WebSocket Closed Callback");
      // Обновляем статус только если он не был ошибкой или уже disconnected
      // Сравнение со state может быть ненадёжным из-за замыкания, лучше использовать статус из хука ws
      // if (state.geminiWebSocket.status !== 'error' && state.geminiWebSocket.status !== 'disconnected') {
      //    dispatch({ type: 'SET_WEB_SOCKET_STATUS', payload: 'disconnected' });
      // }
      // Статус обновится через useEffect ниже, слушающий wsStatus
      setPendingAction(null); // Отменяем ожидание старта при закрытии WS
    },
    [
      /* dispatch, state.geminiWebSocket.status */
    ]
  ); // Убрали зависимости state

  const {
    status: wsStatus,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage: wsSendMessage,
    error: wsError, // Ошибка из хука
  } = useGeminiWebSocket({
    url: backendUrl || "ws://localhost:8080", // Используем динамический URL или запасной вариант
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    onClose: handleWebSocketClose,
  });

  // Синхронизация статуса и ошибки WS из хука в состояние
  useEffect(() => {
    // Обновляем статус в Redux состоянии
    dispatch({ type: "SET_WEB_SOCKET_STATUS", payload: wsStatus });
  }, [wsStatus]);

  useEffect(() => {
    // Обновляем ошибку, только если она изменилась
    // Сравниваем с ошибкой в состоянии, чтобы избежать лишних диспатчей
    if (wsError !== state.geminiWebSocket.error) {
      dispatch({ type: "SET_WEB_SOCKET_ERROR", payload: wsError });
    }
  }, [wsError, state.geminiWebSocket.error]);

  // --- Media Capture Integration ---
  const handleCaptureData = useCallback(
    (data: Blob) => {
      if (wsStatus === "connected") {
        wsSendMessage(data);
      } else {
        console.warn("WebSocket не подключен, не могу отправить медиа-чанк.");
        // Возможно, стоит остановить захват, если WS отвалился
        // mediaStopCapture(); // Вызовет stopCapture ниже
      }
    },
    [wsSendMessage, wsStatus /* mediaStopCapture */]
  ); // Убрали mediaStopCapture

  const handleCaptureError = useCallback(
    (error: string) => {
      console.error("Media Capture Error Callback:", error);
      dispatch({ type: "SET_CAPTURE_ERROR", payload: error });
      dispatch({ type: "SET_IS_CAPTURING", payload: false });
      setPendingAction(null); // Отменяем ожидание старта при ошибке захвата
      // Если захват упал, скорее всего, нужно и WS закрыть
      wsDisconnect();
    },
    [dispatch, wsDisconnect]
  );

  const {
    isCapturing: mediaIsCapturing,
    startCapture: mediaStartCapture,
    stopCapture: mediaStopCapture,
    error: captureError,
    isLoadingSources,
    availableAudioSources,
    availableVideoSources,
    loadSources: mediaLoadSources,
  } = useMediaCapture({
    onDataAvailable: handleCaptureData,
    onError: handleCaptureError,
  });

  // Синхронизация состояния и ошибки захвата из хука в состояние
  useEffect(() => {
    dispatch({ type: "SET_IS_CAPTURING", payload: mediaIsCapturing });
  }, [mediaIsCapturing, dispatch]);

  useEffect(() => {
    if (captureError !== state.capture.error)
      dispatch({ type: "SET_CAPTURE_ERROR", payload: captureError });
  }, [captureError, state.capture.error, dispatch]);

  useEffect(() => {
    dispatch({ type: "SET_MEDIA_SOURCES_LOADING", payload: isLoadingSources });
  }, [isLoadingSources, dispatch]);

  useEffect(() => {
    // Добавляем лог ПЕРЕД диспатчем
    console.log("[AppContext] Синхронизация источников из хука:", {
      audio: availableAudioSources,
      video: availableVideoSources,
    });
    // Добавим проверку, чтобы не диспатчить пустые массивы, если они уже такие (хотя это не должно мешать)
    if (
      availableAudioSources !== state.capture.availableAudioSources ||
      availableVideoSources !== state.capture.availableVideoSources
    ) {
      dispatch({
        type: "SET_MEDIA_SOURCES",
        payload: { audio: availableAudioSources, video: availableVideoSources },
      });
    }
  }, [
    availableAudioSources,
    availableVideoSources,
    dispatch,
    state.capture.availableAudioSources,
    state.capture.availableVideoSources,
  ]);

  // --- Эффект для управления процессом старта ---
  useEffect(() => {
    // Этот эффект сработает, когда изменится pendingAction или wsStatus
    if (pendingAction === "startCapture" && wsStatus === "connected") {
      console.log("WS подключен, начинаем захват...");
      // Сбрасываем флаг ожидания
      setPendingAction(null);

      // Получаем ID источников, сохраненные перед стартом
      const audioId = state.capture.selectedAudioSourceIdToStart;
      const videoId = state.capture.selectedVideoSourceIdToStart;

      if (audioId && videoId) {
        // 1. Отправляем команду инициализации сессии на бэкенд
        const setupCommand = {
          type: "start_session",
          prompt: state.presetPrompt,
        };
        wsSendMessage(JSON.stringify(setupCommand));

        // 2. Запускаем захват медиа (асинхронно)
        // Ошибки mediaStartCapture будут обработаны в handleCaptureError
        mediaStartCapture(audioId, videoId).catch((err) => {
          // Дополнительная обработка ошибки старта, если нужно
          console.error("Не удалось запустить mediaStartCapture:", err);
          // handleCaptureError уже должен был вызваться хуком, но можно добавить
          if (!state.capture.error) {
            // Проверяем, не установлена ли уже ошибка
            handleCaptureError(
              `Failed to init media capture: ${err.message || err}`
            );
          }
        });
        // Не очищаем ID здесь, пусть остаются до следующего выбора/старта
        dispatch({ type: "SET_SOURCES_TO_START", payload: null });
      } else {
        console.error("IDs источников не найдены при попытке старта захвата.");
        handleCaptureError("Source IDs missing for capture start.");
        wsDisconnect(); // Отключаемся, если не можем стартовать
        // Очищаем ID
        dispatch({ type: "SET_SOURCES_TO_START", payload: null });
      }
    } else if (
      pendingAction === "startCapture" &&
      (wsStatus === "error" || wsStatus === "disconnected")
    ) {
      // Ошибка WS произошла во время ожидания старта захвата
      console.error(
        "Ошибка или отключение WS во время ожидания старта захвата."
      );
      setPendingAction(null); // Сбрасываем флаг ожидания
      // Очищаем ID
      dispatch({ type: "SET_SOURCES_TO_START", payload: null });
      // Ошибка WS уже должна быть установлена через useEffect/handleWebSocketError
      // Можно добавить ошибку захвата для ясности
      if (!state.capture.error && !state.geminiWebSocket.error) {
        dispatch({
          type: "SET_CAPTURE_ERROR",
          payload: "WS connection failed before capture could start.",
        });
      }
    }
  }, [
    pendingAction,
    wsStatus,
    state.presetPrompt,
    state.capture.selectedAudioSourceIdToStart, // Включаем зависимости
    state.capture.selectedVideoSourceIdToStart, // Включаем зависимости
    wsSendMessage,
    mediaStartCapture,
    handleCaptureError, // Включаем зависимости
    wsDisconnect,
    dispatch, // Включаем dispatch
    // Не включаем state.capture.error и state.geminiWebSocket.error, чтобы избежать циклов
  ]);

  // --- Actions exposed by Context ---
  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      /* ... как раньше ... */
    },
    []
  );
  const setUserPrompt = useCallback((prompt: string) => {
    /* ... как раньше ... */
  }, []);
  const loadMediaSources = useCallback(async () => {
    console.log("--- [AppContext] Вызов loadMediaSources ---");
    if (typeof mediaLoadSources === "function") {
      console.log("[AppContext] mediaLoadSources доступен, вызываем...");
      try {
        await mediaLoadSources();
        console.log("[AppContext] mediaLoadSources выполнен успешно");
      } catch (error) {
        console.error("[AppContext] Ошибка в mediaLoadSources:", error);
      }
    } else {
      console.error(
        "[AppContext] mediaLoadSources не является функцией!",
        mediaLoadSources
      );
    }
  }, [mediaLoadSources]);
  const selectSources = useCallback(
    (audioSourceId: string | null, videoSourceId: string | null) => {
      dispatch({
        type: "SET_SELECTED_SOURCES",
        payload: { audioSourceId, videoSourceId },
      });
    },
    []
  );

  // Переписанный startCapture - теперь он просто инициирует процесс
  const startCapture = useCallback(
    async (audioSourceId: string, videoSourceId: string) => {
      if (mediaIsCapturing || pendingAction === "startCapture") {
        console.warn("Захват уже идет или находится в процессе запуска.");
        return;
      }
      if (!audioSourceId || !videoSourceId) {
        handleCaptureError("Аудио и Видео источники должны быть выбраны.");
        return;
      }

      console.log("Инициируем старт захвата...");
      // 1. Очищаем предыдущие ошибки
      dispatch({ type: "SET_CAPTURE_ERROR", payload: null });
      dispatch({ type: "SET_WEB_SOCKET_ERROR", payload: null });

      // 2. Сохраняем выбранные ID для использования в useEffect
      dispatch({
        type: "SET_SOURCES_TO_START",
        payload: { audioSourceId, videoSourceId },
      });

      // 3. Устанавливаем флаг ожидания
      setPendingAction("startCapture");

      // 4. Подключаемся к WebSocket (если еще не подключены)
      // Если уже connected, useEffect все равно сработает из-за изменения pendingAction
      if (wsStatus !== "connected" && wsStatus !== "connecting") {
        wsConnect();
      } else if (wsStatus === "connected") {
        // Если уже подключены, manually trigger a re-check in the effect might be needed
        // if the effect logic somehow missed the initial connection state.
        // Но стандартно useEffect [pendingAction, wsStatus] должен сработать.
        console.log(
          "WS уже подключен, ожидаем срабатывания useEffect для старта захвата..."
        );
      }

      // Вся остальная логика (отправка команды, запуск mediaStartCapture) перенесена в useEffect
    },
    [
      mediaIsCapturing,
      pendingAction,
      wsStatus, // Следим за текущими состояниями
      handleCaptureError, // Используем для вывода ошибки
      wsConnect,
      dispatch, // Функции
      // Не включаем state.presetPrompt и т.д., они используются в useEffect
    ]
  );

  // stopCapture - останавливает все
  const stopCapture = useCallback(() => {
    console.log("Инициируем остановку захвата...");
    setPendingAction(null); // Отменяем ожидание старта, если оно было
    mediaStopCapture(); // Останавливает медиа
    wsDisconnect(); // Отключает WebSocket
    dispatch({ type: "SET_LOADING_RESPONSE", payload: false });
    // Состояния isCapturing и wsStatus обновятся через useEffect
    // Очищаем ID для старта
    dispatch({ type: "SET_SOURCES_TO_START", payload: null });
  }, [mediaStopCapture, wsDisconnect, dispatch]);

  // Memoize context value
  const contextValue = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch, // Оставляем dispatch, если он нужен где-то еще
      // Specific actions:
      addMessage,
      startCapture,
      stopCapture,
      setUserPrompt,
      loadMediaSources,
      selectSources,
    }),
    [
      state,
      dispatch,
      addMessage,
      startCapture,
      stopCapture,
      setUserPrompt,
      loadMediaSources,
      selectSources,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
