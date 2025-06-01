
import React from 'react';

interface AssemblyEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const AssemblyEditor: React.FC<AssemblyEditorProps> = ({ value, onChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (e.key === "Tab") {
      e.preventDefault();
      const tabString = "\t"; // Use a tab character for indentation

      const newValue = value.substring(0, start) + tabString + value.substring(end);

      onChange(newValue);

      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + tabString.length;
      }, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();

      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);

      // current line
      const lines = beforeCursor.split("\n");
      const currentLine = lines[lines.length - 1];

      const indentMatch = currentLine.match(/^[\t ]*/);
      const indent = indentMatch ? indentMatch[0] : "";

      const insertText = "\n" + indent;
      const newValue = beforeCursor + insertText + afterCursor;

      onChange(newValue);

      // move cursor to the end of the inserted text
      setTimeout(() => {
        const pos = start + insertText.length;
        el.selectionStart = el.selectionEnd = pos;
      }, 0);
    }
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Enter 6502 assembly code here..."
      className="w-full h-[30rem] md:h-[35rem] bg-gray-800 border border-gray-700 rounded-md p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y shadow-inner"
      spellCheck="false"
      aria-label="6502 Assembly Code Input"
    />
  );
};
