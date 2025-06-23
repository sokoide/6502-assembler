
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="mt-2 p-3 bg-red-900 border border-red-700 text-red-300 rounded-md text-sm shadow">
      <strong>Error:</strong> {message}
    </div>
  );
};
    