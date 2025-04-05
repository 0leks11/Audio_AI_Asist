import React, { useState, useCallback, useRef, useEffect } from "react";
import { WebSocketStatus } from "../../types";

// Константа для URL бэкенда по умолчанию
const DEFAULT_BACKEND_URL = "ws://localhost:8080";

interface UseGeminiWebSocketOptions {
  url?: string; // URL бэкенд-сервера, по умолчанию localhost:8080
  onOpen?: () => void;
  onMessage: (message: string) => void; // Колбэк для полученных текстовых сообщений
  onError?: (error: Event | string) => void;
  onClose?: () => void;
}

interface UseGeminiWebSocketResult {
  status: WebSocketStatus;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (data: string | ArrayBuffer | Blob) => void; // Отправка данных (текст, аудио/видео)
  error: string | null;
  // Добавляем новые методы для работы с бэкендом
  startSession: (prompt: string) => void; // Начать сессию с промптом
  stopSession: () => void; // Остановить сессию
}

export const useGeminiWebSocket = ({
  url = DEFAULT_BACKEND_URL,
  onOpen,
  onMessage,
  onError,
  onClose,
}: UseGeminiWebSocketOptions): UseGeminiWebSocketResult => {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (
      webSocketRef.current &&
      webSocketRef.current.readyState === WebSocket.OPEN
    ) {
      console.log("WebSocket уже подключен.");
      return;
    }

    console.log(`Попытка подключения к бэкенду: ${url}`);
    setStatus("connecting");
    setError(null);

    try {
      webSocketRef.current = new WebSocket(url);

      webSocketRef.current.onopen = () => {
        console.log("WebSocket подключен к бэкенду.");
        setStatus("connected");
        setError(null);
        onOpen?.();
      };

      webSocketRef.current.onmessage = (event) => {
        // Предполагаем, что бэкенд отправляет JSON данные
        if (typeof event.data === "string") {
          console.log("Получено сообщение от бэкенда:", event.data);
          try {
            // Парсим JSON
            const data = JSON.parse(event.data);

            // Обрабатываем различные типы сообщений от бэкенда
            if (data.type === "text_response") {
              // Текстовый ответ от Gemini
              onMessage(data.content);
            } else if (data.type === "error") {
              // Ошибка от бэкенда
              setError(data.message);
              onError?.(data.message);
            } else if (data.type === "session_started") {
              // Сессия успешно запущена
              console.log("Сессия Gemini успешно запущена на бэкенде");
            } else if (data.type === "session_stopped") {
              // Сессия успешно остановлена
              console.log("Сессия Gemini остановлена на бэкенде");
            } else {
              // Передаем сырое сообщение, если тип не распознан
              onMessage(event.data);
            }
          } catch (err) {
            console.warn("Ошибка парсинга JSON от бэкенда:", err);
            // Если не JSON, просто передаем текст
            onMessage(event.data);
          }
        } else {
          console.warn(
            "Получено нетекстовое сообщение от бэкенда:",
            event.data
          );
          // Обрабатываем бинарные данные, если нужно
        }
      };

      webSocketRef.current.onerror = (event) => {
        console.error("Ошибка WebSocket:", event);
        const errorMessage = "Ошибка подключения к бэкенду.";
        setError(errorMessage);
        setStatus("error");
        onError?.(errorMessage);
      };

      webSocketRef.current.onclose = (event) => {
        console.log("WebSocket отключен от бэкенда.", event.reason);
        // Не устанавливаем статус 'disconnected', если это была ошибка
        if (status !== "error") {
          setStatus("disconnected");
        }
        webSocketRef.current = null;
        onClose?.();
      };
    } catch (err) {
      console.error("Не удалось создать WebSocket соединение:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Неизвестная ошибка WebSocket";
      setError(errorMessage);
      setStatus("error");
      onError?.(errorMessage);
    }
  }, [url, onOpen, onMessage, onError, onClose, status]);

  const disconnect = useCallback(() => {
    if (webSocketRef.current) {
      console.log("Отключение WebSocket...");
      webSocketRef.current.close();
      // обработчик onclose обновит состояние
    }
  }, []);

  const sendMessage = useCallback(
    (data: string | ArrayBuffer | Blob) => {
      if (
        webSocketRef.current &&
        webSocketRef.current.readyState === WebSocket.OPEN
      ) {
        try {
          webSocketRef.current.send(data);
        } catch (err) {
          console.error("Не удалось отправить сообщение через WebSocket:", err);
          setError("Не удалось отправить сообщение.");
          setStatus("error");
          onError?.("Не удалось отправить сообщение.");
        }
      } else {
        console.warn("Невозможно отправить сообщение, WebSocket не подключен.");
        setError("Невозможно отправить сообщение, WebSocket не подключен.");
      }
    },
    [onError]
  );

  // Новые методы для работы с бэкендом

  // Начать сессию с промптом
  const startSession = useCallback(
    (prompt: string) => {
      if (status !== "connected") {
        console.warn("Невозможно начать сессию, WebSocket не подключен.");
        return;
      }

      // Отправляем команду на запуск сессии
      const setupCommand = {
        type: "start_session",
        prompt: prompt,
      };

      console.log("Отправка команды начала сессии на бэкенд:", setupCommand);
      sendMessage(JSON.stringify(setupCommand));
    },
    [status, sendMessage]
  );

  // Остановить сессию
  const stopSession = useCallback(() => {
    if (status !== "connected") {
      console.warn("Невозможно остановить сессию, WebSocket не подключен.");
      return;
    }

    // Отправляем команду на остановку сессии
    const stopCommand = {
      type: "stop_session",
    };

    console.log("Отправка команды остановки сессии на бэкенд:", stopCommand);
    sendMessage(JSON.stringify(stopCommand));
  }, [status, sendMessage]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      webSocketRef.current?.close();
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    error,
    startSession,
    stopSession,
  };
};
