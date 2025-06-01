
import React from 'react';

interface OutputDisplayProps {
  machineCode: string;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ machineCode }) => {
  if (!machineCode) {
    return (
      <div className="w-full h-32 bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-gray-500 flex items-center justify-center shadow-inner" aria-live="polite">
        Machine code will appear here...
      </div>
    );
  }

  return (
    <pre className="w-full h-auto min-h-32 max-h-[35rem] overflow-auto bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-green-400 whitespace-pre-wrap break-all shadow-inner" aria-live="polite">
      {machineCode}
    </pre>
  );
};
