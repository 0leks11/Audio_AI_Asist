import React, { useState, useCallback, useRef, useEffect } from "react";
import { WebSocketStatus } from "../../types";

interface UseGeminiWebSocketOptions {
  url: string; // Gemini WebSocket API endpoint
  onOpen?: () => void;
  onMessage: (message: string) => void; // Callback for received text messages
  onError?: (error: Event | string) => void;
  onClose?: () => void;
  apiKey?: string; // Optional API Key if needed for connection
}

interface UseGeminiWebSocketResult {
  status: WebSocketStatus;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (data: string | ArrayBuffer | Blob) => void; // Send data (text prompt, audio/video chunks)
  error: string | null;
}

export const useGeminiWebSocket = ({
  url,
  onOpen,
  onMessage,
  onError,
  onClose,
  apiKey, // Handle API key securely
}: UseGeminiWebSocketOptions): UseGeminiWebSocketResult => {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (
      webSocketRef.current &&
      webSocketRef.current.readyState === WebSocket.OPEN
    ) {
      console.log("WebSocket already connected.");
      return;
    }

    console.log("Attempting to connect WebSocket...");
    setStatus("connecting");
    setError(null);

    try {
      // Add API key to URL or headers if required by Gemini API
      const connectionUrl = apiKey ? `${url}?apiKey=${apiKey}` : url; // Example, adjust based on API spec
      webSocketRef.current = new WebSocket(connectionUrl);

      webSocketRef.current.onopen = () => {
        console.log("WebSocket connected.");
        setStatus("connected");
        setError(null);
        onOpen?.();
      };

      webSocketRef.current.onmessage = (event) => {
        // Assuming Gemini sends text data
        if (typeof event.data === "string") {
          console.log("WebSocket message received:", event.data);
          onMessage(event.data);
        } else {
          console.warn("Received non-text WebSocket message:", event.data);
          // Handle binary data if needed, though the requirement specifies text responses
        }
      };

      webSocketRef.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        const errorMessage = "WebSocket connection error."; // Provide more specific error if possible
        setError(errorMessage);
        setStatus("error");
        onError?.(errorMessage);
      };

      webSocketRef.current.onclose = (event) => {
        console.log("WebSocket disconnected.", event.reason);
        // Don't set status to 'disconnected' if it was an error
        if (status !== "error") {
          setStatus("disconnected");
        }
        webSocketRef.current = null;
        onClose?.();
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown WebSocket error";
      setError(errorMessage);
      setStatus("error");
      onError?.(errorMessage);
    }
  }, [url, apiKey, onOpen, onMessage, onError, onClose, status]); // Include status to prevent reconnect if error occurred

  const disconnect = useCallback(() => {
    if (webSocketRef.current) {
      console.log("Disconnecting WebSocket...");
      webSocketRef.current.close();
      // onclose handler will update state
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
          console.error("Failed to send WebSocket message:", err);
          setError("Failed to send message.");
          setStatus("error"); // Or handle send errors differently
          onError?.("Failed to send message.");
        }
      } else {
        console.warn("Cannot send message, WebSocket is not connected.");
        setError("Cannot send message, WebSocket is not connected.");
        // Optionally try to reconnect or notify user
      }
    },
    [onError]
  ); // Don't depend on status here to allow trying to send

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webSocketRef.current?.close();
    };
  }, []);

  return { status, connect, disconnect, sendMessage, error };
};
