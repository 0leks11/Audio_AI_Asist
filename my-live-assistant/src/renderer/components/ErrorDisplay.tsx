import React from "react";
import "./ErrorDisplay.css"; // Add styling for errors

interface ErrorDisplayProps {
  message: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="error-display">
      <p>Error: {message}</p>
    </div>
  );
};
