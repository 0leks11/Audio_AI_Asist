import React, { useState, useEffect } from "react";
import { MediaSource } from "../../../../types";
import { ErrorDisplay } from "../../../components/ErrorDisplay";
import { LoadingIndicator } from "../../../components/LoadingIndicator";

interface ControlPanelProps {
  isCapturing: boolean;
  isLoadingSources: boolean;
  availableAudioSources: MediaSource[];
  availableVideoSources: MediaSource[];
  selectedAudioSourceId: string | null;
  selectedVideoSourceId: string | null;
  captureError: string | null;
  webSocketError: string | null;
  webSocketStatus: string; // Pass status for display
  onStartCapture: (audioId: string, videoId: string) => void;
  onStopCapture: () => void;
  onLoadSources: () => void;
  onSelectSources: (audioId: string | null, videoId: string | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isCapturing,
  isLoadingSources,
  availableAudioSources,
  availableVideoSources,
  selectedAudioSourceId,
  selectedVideoSourceId,
  captureError,
  webSocketError,
  webSocketStatus,
  onStartCapture,
  onStopCapture,
  onLoadSources,
  onSelectSources,
}) => {
  // Логируем полученные пропсы источников при КАЖДОМ рендере
  console.log("[ControlPanel] РЕНДЕР. Пропсы источников:", {
    availableAudioSources,
    availableVideoSources,
  });

  // Use local state for dropdown selections before confirming
  const [localAudioId, setLocalAudioId] = useState<string | null>(
    selectedAudioSourceId
  );
  const [localVideoId, setLocalVideoId] = useState<string | null>(
    selectedVideoSourceId
  );

  // Update local state if the global selection changes (e.g., on load)
  useEffect(() => {
    setLocalAudioId(selectedAudioSourceId);
  }, [selectedAudioSourceId]);

  useEffect(() => {
    setLocalVideoId(selectedVideoSourceId);
  }, [selectedVideoSourceId]);

  // Load sources when the component mounts
  useEffect(() => {
    console.log("--- [ControlPanel] useEffect для загрузки источников ---");
    console.log(
      "[ControlPanel] onLoadSources доступен:",
      typeof onLoadSources === "function"
    );
    onLoadSources();
  }, []);

  const handleStartClick = () => {
    if (localAudioId && localVideoId) {
      onSelectSources(localAudioId, localVideoId); // Confirm selection in global state
      onStartCapture(localAudioId, localVideoId);
    } else {
      // Maybe show a validation message
      console.error("Please select both audio and video sources.");
    }
  };

  const handleAudioChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value || null;
    setLocalAudioId(newId);
    onSelectSources(newId, localVideoId); // Update global state on change
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value || null;
    setLocalVideoId(newId);
    onSelectSources(localAudioId, newId); // Update global state on change
  };

  const displayError = captureError || webSocketError;

  // Определяем классы для статуса соединения
  const getStatusClass = () => {
    switch (webSocketStatus) {
      case "connected":
        return "status-connected";
      case "connecting":
        return "status-connecting";
      case "error":
        return "status-error";
      default:
        return "status-disconnected";
    }
  };

  return (
    <div className="control-panel">
      <h2 className="control-panel-title">Управление записью</h2>

      {displayError && <ErrorDisplay message={displayError} />}

      <div className="source-selectors">
        <div className="source-selector">
          <label className="source-label" htmlFor="audio-source">
            Источник аудио:
          </label>
          <select
            className="source-select"
            id="audio-source"
            value={localAudioId ?? ""}
            onChange={handleAudioChange}
            disabled={isCapturing || isLoadingSources}
          >
            <option value="">
              {isLoadingSources ? "Загрузка..." : "Выберите источник аудио..."}
            </option>
            {availableAudioSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div className="source-selector">
          <label className="source-label" htmlFor="video-source">
            Источник видео:
          </label>
          <select
            className="source-select"
            id="video-source"
            value={localVideoId ?? ""}
            onChange={handleVideoChange}
            disabled={isCapturing || isLoadingSources}
          >
            <option value="">
              {isLoadingSources ? "Загрузка..." : "Выберите источник видео..."}
            </option>
            {availableVideoSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingSources && (
        <LoadingIndicator size="small" text="Загрузка источников..." />
      )}

      <div className="control-buttons">
        {!isCapturing ? (
          <button
            onClick={handleStartClick}
            disabled={
              !localAudioId ||
              !localVideoId ||
              isCapturing ||
              webSocketStatus === "connecting"
            }
          >
            {webSocketStatus === "connecting"
              ? "Подключение..."
              : "Начать запись"}
          </button>
        ) : (
          <button
            onClick={onStopCapture}
            disabled={webSocketStatus === "connecting"}
          >
            Остановить запись
          </button>
        )}
        <button
          onClick={onLoadSources}
          disabled={isLoadingSources || isCapturing}
        >
          Обновить источники
        </button>
      </div>

      <div className="status-indicator">
        <div className={`status-dot ${getStatusClass()}`}></div>
        <span>
          Статус: {isCapturing ? "Запись активна" : "Готов к записи"} |
          Соединение: {webSocketStatus}
        </span>
      </div>
    </div>
  );
};
