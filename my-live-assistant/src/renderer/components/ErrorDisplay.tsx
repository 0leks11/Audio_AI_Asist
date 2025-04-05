import React from "react";
// Удаляем импорт CSS-файла
// import "./ErrorDisplay.css";

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
