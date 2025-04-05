import React from "react";


interface ErrorDisplayProps {
  message: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="error-display">
      <h3 className="error-display-title">Ошибка</h3>
      <p className="error-display-message">{message}</p>
    </div>
  );
};
