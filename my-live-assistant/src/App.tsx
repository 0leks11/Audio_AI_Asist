import React from "react";
import { AppProvider, useAppContext } from "./renderer/context/AppContext";
import { ChatWindow } from "./renderer/features/Chat/components/ChatWindow";
import { ControlPanel } from "./renderer/features/Capture/components/ControlPanel";
// import { UserInputField } from './components/UserInputField'; // Add if needed

// Inner component to access context after provider is setup
const AppContent: React.FC = () => {
  console.log("Rendering AppContent component");
  const {
    state,
    startCapture,
    stopCapture,
    loadMediaSources,
    selectSources,
    // setUserPrompt // Add if user input field is used
  } = useAppContext();

  // ЗАЩИТНАЯ ПРОВЕРКА (для отладки)
  if (!state) {
    console.error("State из контекста еще не определен в AppContent!");
    return <div>Загрузка контекста...</div>;
  }

  console.log("AppContent state received:", state.geminiWebSocket.status);

  return (
    <div className="app-container">
      {/* <header className="app-header">
           <h1>Live Assistant</h1>
        </header> */}
      <main className="app-main">
        <ControlPanel
          isCapturing={state.capture.isCapturing}
          isLoadingSources={state.capture.isLoadingSources}
          availableAudioSources={state.capture.availableAudioSources}
          availableVideoSources={state.capture.availableVideoSources}
          selectedAudioSourceId={state.capture.audioSourceId}
          selectedVideoSourceId={state.capture.videoSourceId}
          captureError={state.capture.error}
          webSocketError={state.geminiWebSocket.error}
          webSocketStatus={state.geminiWebSocket.status}
          onStartCapture={startCapture}
          onStopCapture={stopCapture}
          onLoadSources={loadMediaSources}
          onSelectSources={selectSources}
        />
        <ChatWindow
          messages={state.chat.messages}
          isLoading={state.chat.isLoadingResponse}
        />
        {/* Optional: If user can add text prompts alongside streams */}
        {/* <UserInputField
          currentPrompt={state.userPrompt}
          onPromptChange={setUserPrompt}
          onSubmit={() => {}} // Define submit logic if needed
          disabled={state.capture.isCapturing}
         /> */}
      </main>
      {/* <footer className="app-footer">
            Status: {state.geminiWebSocket.status}
            {state.geminiWebSocket.error && ` | Error: ${state.geminiWebSocket.error}`}
            {state.capture.error && ` | Capture Error: ${state.capture.error}`}
        </footer> */}
    </div>
  );
};

// Main App component wrapping the Provider
const App: React.FC = () => {
  console.log("Rendering main App component");
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
