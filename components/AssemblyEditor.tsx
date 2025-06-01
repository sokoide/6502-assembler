
import React from 'react';

interface AssemblyEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const AssemblyEditor: React.FC<AssemblyEditorProps> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter 6502 assembly code here..."
      className="w-full h-[30rem] md:h-[35rem] bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y shadow-inner"
      spellCheck="false"
      aria-label="6502 Assembly Code Input"
    />
  );
};
