import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MediaSource } from '../../types';

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
  const [availableAudioSources, setAvailableAudioSources] = useState<MediaSource[]>([]);
  const [availableVideoSources, setAvailableVideoSources] = useState<MediaSource[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]); // Store chunks temporarily if needed

  const handleError = useCallback((message: string, err?: any) => {
      console.error(message, err);
      setError(message);
      onError(message);
      // Clean up any ongoing capture
      stopCapture();
  }, [onError]); // stopCapture is defined below, but its reference is stable

  const loadSources = useCallback(async () => {
    if (typeof window.electronAPI?.getMediaSources !== 'function') {
        handleError("Electron API for media sources not available. Check preload script.");
        return;
    }
    setIsLoadingSources(true);
    setError(null);
    try {
        console.log("Requesting media sources from main process...");
        const sources = await window.electronAPI.getMediaSources();
        console.log("Received media sources:", sources);
        setAvailableAudioSources(sources.audio);
        // Filter for screen/window sources for video
        setAvailableVideoSources(sources.video.filter(s => s.id.startsWith('screen:') || s.id.startsWith('window:')));
    } catch (err) {
        handleError('Failed to load media sources', err);
    } finally {
        setIsLoadingSources(false);
    }
  }, [handleError]); // Add handleError dependency

  const startCapture = useCallback(async (audioSourceId: string, videoSourceId: string) => {
    if (isCapturing) {
      console.warn('Capture already in progress.');
      return;
    }
    console.log(`Starting capture with Audio: ${audioSourceId}, Video: ${videoSourceId}`);
    setError(null);
    setIsCapturing(true); // Optimistic update, might be reset on error
    recordedChunksRef.current = [];

    try {
      const constraints: MediaStreamConstraints = {
        audio: audioSourceId
          ? { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: audioSourceId } }
          : false, // Or true for default mic, adjust as needed
        video: videoSourceId
          ? { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: videoSourceId } }
          : false, // Or capture default screen/window? Requires careful handling
      };

       // Use navigator.mediaDevices.getUserMedia with desktopCapture constraints
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);

      // --- MediaRecorder Setup ---
      // Determine mimeType based on browser support and API requirements
      // Common options: 'video/webm;codecs=vp9,opus', 'video/mp4', etc.
      // This needs careful selection based on what Gemini API accepts.
      const options = { mimeType: 'video/webm;codecs=vp9,opus' }; // Example! Verify Gemini requirements
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          // Fallback or error
          console.warn(`${options.mimeType} is not supported. Trying default.`);
          // options = { mimeType: 'video/webm' }; // Example fallback
           if (!MediaRecorder.isTypeSupported('video/webm')) { // Check basic webm
                throw new Error("No suitable mimeType found for MediaRecorder.");
           }
           options.mimeType = 'video/webm'; // Use basic webm if supported
      }

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send chunk immediately via WebSocket
          onDataAvailable(event.data);
          // Optionally store chunks if needed for other purposes
          // recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        handleError('MediaRecorder error', event);
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        // Any final cleanup if needed
      };

      // Start recording and emitting chunks periodically
      mediaRecorderRef.current.start(timeslice);
      console.log(`MediaRecorder started with timeslice ${timeslice}ms`);

    } catch (err) {
      handleError('Failed to start media capture', err);
      setIsCapturing(false); // Reset capturing state on error
      // Clean up potentially partially acquired stream
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, [isCapturing, onDataAvailable, timeslice, handleError]); // Added handleError

   const stopCapture = useCallback(() => {
    console.log('Stopping capture...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // onstop handler will run
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        console.log('MediaStream tracks stopped.');
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    recordedChunksRef.current = [];
    setIsCapturing(false);
    // Keep error state until a new action clears it or succeeds
  }, []); // No dependencies that change


  // Effect to load sources on mount (optional, could be triggered by UI)
  // useEffect(() => {
  //   loadSources();
  // }, [loadSources]); // Ensure loadSources is memoized if used here

   // Cleanup on unmount
   useEffect(() => {
    return () => {
      stopCapture(); // Ensure capture stops if component unmounts
    };
  }, [stopCapture]); // Make sure stopCapture is stable

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
