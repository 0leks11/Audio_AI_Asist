import React, { useState, useEffect } from "react";
import { MediaSource } from "../../../../types";
import { LoadingIndicator } from "../../../components/LoadingIndicator"; // Shared component
import { ErrorDisplay } from "../../../components/ErrorDisplay"; // Shared component
import "./ControlPanel.css";

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
    onLoadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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

  return (
    <div className="control-panel">
      {displayError && <ErrorDisplay message={displayError} />}

      <div className="source-selectors">
        <div className="source-selector">
          <label htmlFor="audio-source">Audio Source:</label>
          <select
            id="audio-source"
            value={localAudioId ?? ""}
            onChange={handleAudioChange}
            disabled={isCapturing || isLoadingSources}
          >
            <option value="">
              {isLoadingSources ? "Loading..." : "Select Audio..."}
            </option>
            {availableAudioSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
        <div className="source-selector">
          <label htmlFor="video-source">Video Source:</label>
          <select
            id="video-source"
            value={localVideoId ?? ""}
            onChange={handleVideoChange}
            disabled={isCapturing || isLoadingSources}
          >
            <option value="">
              {isLoadingSources ? "Loading..." : "Select Video..."}
            </option>
            {availableVideoSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
        {isLoadingSources && (
          <LoadingIndicator size="small" text="Loading sources..." />
        )}
      </div>

      <div className="action-buttons">
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
              ? "Connecting..."
              : "Start Capture"}
          </button>
        ) : (
          <button
            onClick={onStopCapture}
            disabled={webSocketStatus === "connecting"}
          >
            Stop Capture
          </button>
        )}
        <button
          onClick={onLoadSources}
          disabled={isLoadingSources || isCapturing}
        >
          Refresh Sources
        </button>
      </div>
      <div className="status-indicator">
        <span>Capture: {isCapturing ? "Active" : "Inactive"}</span>
        <span> | </span>
        <span>Connection: {webSocketStatus}</span>
      </div>
    </div>
  );
};
