import React, { useState, useCallback, useRef, useEffect } from "react";
import { MediaSource } from "../../types"; // Ensure this path is correct

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

  const loadSources = useCallback(async () => {
    // Use optional chaining and check function existence
    if (typeof window.electronAPI?.getMediaSources !== "function") {
      // Use handleError for consistency
      handleError(
        "Electron API 'getMediaSources' not available. Check preload script."
      );
      return;
    }
    setIsLoadingSources(true);
    setError(null); // Clear previous errors
    try {
      console.log("Requesting media sources from main process...");
      // Assuming getMediaSources returns { audio: MediaSource[], video: MediaSource[] }
      const sources = await window.electronAPI.getMediaSources();
      if (
        !sources ||
        !Array.isArray(sources.audio) ||
        !Array.isArray(sources.video)
      ) {
        throw new Error(
          "Invalid media sources format received from main process."
        );
      }
      console.log("Received media sources:", sources);
      setAvailableAudioSources(sources.audio);
      // Filter video sources for screen or window types
      setAvailableVideoSources(
        sources.video.filter(
          (s) => s.id.startsWith("screen:") || s.id.startsWith("window:")
        )
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Unknown error loading media sources";
      handleError(`Failed to load media sources: ${errorMsg}`, err);
    } finally {
      setIsLoadingSources(false);
    }
  }, [handleError]); // Dependency on handleError is correct

  const startCapture = useCallback(
    async (audioSourceId: string, videoSourceId: string) => {
      if (isCapturing) {
        console.warn("Capture is already in progress.");
        return;
      }
      console.log(
        `Starting capture - Audio: ${audioSourceId}, Video: ${videoSourceId}`
      );
      setError(null); // Clear previous errors
      setIsCapturing(true); // Set capturing state
      recordedChunksRef.current = [];

      try {
        // Build constraints using Electron's mandatory property for desktop capture
        const constraints = {
          audio: audioSourceId
            ? {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: audioSourceId,
                },
              }
            : false, // Set to false if no audio source selected
          video: videoSourceId
            ? {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: videoSourceId,
                },
              }
            : false, // Set to false if no video source selected
        };

        console.log(
          "Using getUserMedia constraints:",
          JSON.stringify(constraints)
        );

        // Get media stream using the constraints
        // Use @ts-expect-error because 'mandatory' is not part of standard Web API types
        // but is specific to Electron's desktopCapturer
        mediaStreamRef.current =
          // @ts-expect-error Electron's constraints use non-standard 'mandatory' property
          await navigator.mediaDevices.getUserMedia(constraints);

        // --- MediaRecorder Setup ---
        // Determine the best mimeType, prioritizing Opus for audio efficiency
        let chosenMimeType: string | null = null;
        const preferredMimeType = "audio/webm;codecs=opus";
        const fallbackMimeType = "audio/webm"; // Basic WebM audio as fallback

        if (MediaRecorder.isTypeSupported(preferredMimeType)) {
          chosenMimeType = preferredMimeType;
        } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
          console.warn(
            `'${preferredMimeType}' not supported. Falling back to '${fallbackMimeType}'.`
          );
          chosenMimeType = fallbackMimeType;
        } else {
          // If neither common audio webm format is supported, throw an error.
          throw new Error(
            `Neither '${preferredMimeType}' nor '${fallbackMimeType}' are supported by MediaRecorder.`
          );
        }

        console.log(`Using MediaRecorder mimeType: ${chosenMimeType}`);
        const options = { mimeType: chosenMimeType };

        // Create MediaRecorder instance
        if (!mediaStreamRef.current) {
          // Should not happen if getUserMedia succeeded, but check defensively
          throw new Error(
            "MediaStream is not available after getUserMedia success."
          );
        }
        mediaRecorderRef.current = new MediaRecorder(
          mediaStreamRef.current,
          options
        );

        // Setup event listeners for the recorder
        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            // Call the callback with the data chunk
            onDataAvailable(event.data);
          }
        };

        mediaRecorderRef.current.onerror = (event: Event) => {
          // Use the centralized error handler
          handleError("MediaRecorder encountered an error", event);
        };

        mediaRecorderRef.current.onstop = () => {
          console.log("MediaRecorder stopped successfully.");
          // Additional cleanup related to recorder stopping can go here if needed
        };

        // Start recording, triggering ondataavailable every 'timeslice' milliseconds
        mediaRecorderRef.current.start(timeslice);
        console.log(`MediaRecorder started with timeslice ${timeslice}ms`);
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Unknown error during capture start";
        // Use the centralized error handler, which also calls stopCapture
        handleError(`Failed to start media capture: ${errorMsg}`, err);
        // No need to call setIsCapturing(false) here, handleError -> stopCapture does it.
        // No need to manually stop tracks here, handleError -> stopCapture does it.
      }
    },
    [isCapturing, onDataAvailable, timeslice, handleError] // Dependencies seem correct
  );

  // Effect for cleanup when the component unmounts or hook is removed
  useEffect(() => {
    // Return the cleanup function
    return () => {
      stopCapture(); // Ensure capture stops cleanly
    };
  }, [stopCapture]); // Dependency on stable stopCapture function

  // Return the state and functions for the consumer of the hook
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
