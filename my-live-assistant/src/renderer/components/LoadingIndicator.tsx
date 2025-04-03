import React from "react";
import "./LoadingIndicator.css"; // Add some basic spinner styling

interface LoadingIndicatorProps {
  size?: "small" | "medium" | "large";
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "medium",
  text,
}) => {
  const sizeClass = `loading-indicator--${size}`;
  return (
    <div className={`loading-indicator ${sizeClass}`}>
      <div className="spinner"></div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};
