import React, { useState, useCallback, useRef, useEffect } from "react";
import { MediaSource } from "../../types"; // Убедитесь, что путь верный

// Расширение типов MediaTrackConstraints для Electron
declare global {
  interface ElectronDesktopCapturerConstraints {
    mandatory: {
      chromeMediaSource: "desktop";
      chromeMediaSourceId: string;
    };
  }

  interface MediaTrackConstraints {
    mandatory?: {
      chromeMediaSource: string;
      chromeMediaSourceId: string;
    };
  }
}

interface UseMediaCaptureOptions {
  onDataAvailable: (data: Blob) => void; // Callback for audio/video data chunks
  onError: (error: string) => void; // Error handler
  timeslice?: number; // Interval for data chunks in ms (e.g., 1000 for 1 second)
}

interface UseMediaCaptureResult {
  isCapturing: boolean;
  startCapture: (audioSourceId: string, videoSourceId: string) => Promise<void>;
  stopCapture: () => void;
  error: string | null;
  isLoadingSources: boolean;
  availableAudioSources: MediaSource[];
  availableVideoSources: MediaSource[];
  loadSources: () => Promise<void>;
}

export const useMediaCapture = ({
  onDataAvailable,
  onError,
  timeslice = 1000, // Default to 1-second chunks
}: UseMediaCaptureOptions): UseMediaCaptureResult => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [availableAudioSources, setAvailableAudioSources] = useState<
    MediaSource[]
  >([]);
  const [availableVideoSources, setAvailableVideoSources] = useState<
    MediaSource[]
  >([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]); // Keep for potential future use

  // Define stopCapture early so it can be used in handleError's dependencies
  const stopCapture = useCallback(() => {
    console.log("Stopping media capture...");
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop(); // onstop handler will run
    } else {
      console.log("MediaRecorder was not active or doesn't exist.");
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      console.log("MediaStream tracks stopped.");
    } else {
      console.log("MediaStream does not exist.");
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    recordedChunksRef.current = [];
    if (isCapturing) {
      // Only set isCapturing if it was true
      setIsCapturing(false);
    }
  }, [isCapturing]); // isCapturing needed if setIsCapturing depends on previous state

  const handleError = useCallback(
    (message: string, err?: any) => {
      console.error("Media Capture Error:", message, err);
      setError(message); // Set error state
      onError(message); // Call external error handler
      stopCapture(); // Attempt to stop everything cleanly
    },
    [onError, stopCapture] // stopCapture is now stable and included
  );

  // Эта версия loadSources уже использует enumerateDevices + getDesktopSources
  const loadSources = useCallback(async () => {
    console.log("--- [Renderer] Вызов loadSources (v2) ---");
    console.log(
      "[Renderer] Проверка window.electronAPI:",
      !!window.electronAPI
    );

    setIsLoadingSources(true);
    setError(null); // Clear previous errors

    let audioInputs: MediaSource[] = [];
    let videoInputs: MediaSource[] = [];

    try {
      // 1. Получаем аудио устройства через API браузера
      console.log(
        "[Renderer] Запрос navigator.mediaDevices.enumerateDevices..."
      );
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("[Renderer] Получены устройства:", devices);

      audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          id: device.deviceId,
          name: device.label || `Микрофон ${audioInputs.length + 1}`,
        }));
      console.log("[Renderer] Отфильтрованы аудио входы:", audioInputs);

      // 2. Получаем desktop источники (экраны, окна) через Electron API
      if (typeof window.electronAPI?.getDesktopSources === "function") {
        console.log(
          "[Renderer] Запрос window.electronAPI.getDesktopSources..."
        );
        const desktopSources = await window.electronAPI.getDesktopSources();
        console.log("[Renderer] Получены desktop источники:", desktopSources);

        videoInputs = desktopSources.map((source) => ({
          id: source.id,
          name: source.name,
        }));
        console.log(
          "[Renderer] Отфильтрованы видео входы (desktop):",
          videoInputs
        );
      } else {
        console.warn(
          "[Renderer] API 'getDesktopSources' не доступен в preload."
        );
        handleError("API для получения источников экрана не найден.");
      }

      // 3. Обновляем состояние
      console.log("[Renderer] Установка состояния источников...");
      setAvailableAudioSources(audioInputs);
      setAvailableVideoSources(videoInputs);
      console.log("[Renderer] Состояние источников установлено.");
    } catch (err) {
      console.error(
        "[Renderer] Ошибка при вызове или обработке источников:",
        err
      );
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Неизвестная ошибка при загрузке источников";
      handleError(`Failed to load media sources: ${errorMsg}`, err);
    } finally {
      setIsLoadingSources(false);
    }
  }, [handleError]);

  const startCapture = useCallback(
    async (audioDeviceId: string, videoSourceId: string) => {
      // Используем audioDeviceId
      if (isCapturing) {
        console.warn("Capture is already in progress.");
        return;
      }
      console.log(
        `[Renderer] Starting capture - Audio DeviceID: ${audioDeviceId}, Video SourceID: ${videoSourceId}`
      );
      setError(null);
      setIsCapturing(true);
      recordedChunksRef.current = [];

      try {
        // Создаем объект constraints БЕЗ явной аннотации типа
        const constraints = {
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : false, // Используем deviceId
          video: videoSourceId
            ? {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: videoSourceId,
                },
              }
            : false,
        };

        console.log(
          "Using getUserMedia constraints:",
          JSON.stringify(constraints)
        );

        // @ts-ignore - Electron's API uses non-standard 'mandatory' property
        mediaStreamRef.current =
          await navigator.mediaDevices.getUserMedia(constraints);

        // --- MediaRecorder Setup ---
        let chosenMimeType: string | null = null;
        const preferredMimeType = "audio/webm;codecs=opus";
        const fallbackMimeType = "audio/webm";

        if (MediaRecorder.isTypeSupported(preferredMimeType)) {
          chosenMimeType = preferredMimeType;
        } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
          console.warn(
            `'${preferredMimeType}' not supported. Falling back to '${fallbackMimeType}'.`
          );
          chosenMimeType = fallbackMimeType;
        } else {
          throw new Error(
            `Neither '${preferredMimeType}' nor '${fallbackMimeType}' are supported by MediaRecorder.`
          );
        }
        console.log(`Using MediaRecorder mimeType: ${chosenMimeType}`);
        const options = { mimeType: chosenMimeType };

        if (!mediaStreamRef.current) {
          throw new Error(
            "MediaStream is not available after getUserMedia success."
          );
        }
        mediaRecorderRef.current = new MediaRecorder(
          mediaStreamRef.current,
          options
        );

        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            onDataAvailable(event.data);
          }
        };
        mediaRecorderRef.current.onerror = (event: Event) => {
          handleError("MediaRecorder encountered an error", event);
        };
        mediaRecorderRef.current.onstop = () => {
          console.log("MediaRecorder stopped successfully.");
        };

        mediaRecorderRef.current.start(timeslice);
        console.log(`MediaRecorder started with timeslice ${timeslice}ms`);
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Unknown error during capture start";
        handleError(`Failed to start media capture: ${errorMsg}`, err);
      }
    },
    // Зависимости могут немного отличаться, но основные должны быть здесь
    [isCapturing, onDataAvailable, timeslice, handleError]
  );

  // Effect for cleanup when the component unmounts or hook is removed
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    startCapture,
    stopCapture,
    error,
    isLoadingSources,
    availableAudioSources,
    availableVideoSources,
    loadSources,
  };
};
