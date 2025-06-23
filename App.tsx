
import React, { useState, useCallback, ChangeEvent, useMemo } from 'react';
import { AssemblyEditor } from './components/AssemblyEditor';
import { OutputDisplay } from './components/OutputDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { assemble } from './services/assembler';
import { sampleCodes } from './services/sampleCodes';
import { validateAssemblyCode, validateSampleIndex, sanitizeErrorMessage } from './utils/validation';
import { formatMachineCode, formatElapsedTime } from './utils/formatting';
import { Copy } from 'lucide-react'

const initialAssemblyCode = `\t.org $0200
; .org $0200 means the code starts at address $0200

; 'start:' is a label, case-sensitive
; the labe is not used (you can remove it)
start:
\tLDA #$C0 ; load $C0 int A register
\tLDX #$C1 ; load $C1 into X register
\tLDY #$C2 ; load $C2 into Y register
\tSTA $00  ; store A into Zero Page address $00
\tSTX $01  ; store X into Zero Page address $01
\tSTY $02  ; store Y into Zero Page address $02
loop:
\tJMP loop
`;

const App: React.FC = () => {
  const [assemblyCode, setAssemblyCode] = useState<string>(initialAssemblyCode);
  const [machineCode, setMachineCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string>('');

  const handleAssemble = useCallback(() => {
    const startTime = performance.now();
    setError('');
    setMachineCode('');
    setElapsedTime(null);
    setCopyStatus('');
    
    // Validate input
    const validation = validateAssemblyCode(assemblyCode);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      setElapsedTime(performance.now() - startTime);
      return;
    }
    
    try {
      const result = assemble(assemblyCode);
      if (result.error) {
        setError(result.error);
      } else {
        setMachineCode(formatMachineCode(result.machineCode));
      }
    } catch (e) {
      const errorMessage = sanitizeErrorMessage(e);
      setError(`Assembler error: ${errorMessage}`);
      console.error('Assembly error:', e);
    }
    
    const endTime = performance.now();
    setElapsedTime(endTime - startTime);
  }, [assemblyCode]);

  const handleLoadSample = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const sampleIndex = event.target.value;
    setSelectedSampleIndex(sampleIndex);
    setCopyStatus('');
    
    if (sampleIndex) {
      if (validateSampleIndex(sampleIndex, sampleCodes.length)) {
        const selectedSample = sampleCodes[parseInt(sampleIndex, 10)];
        setAssemblyCode(selectedSample.code);
        setError('');
        setMachineCode('');
        setElapsedTime(null);
      } else {
        setError('Invalid sample selection');
      }
    }
  }, []);

  const handleCopyMachineCode = useCallback(async () => {
    if (!machineCode) {
      setCopyStatus('Nothing to copy!');
      setTimeout(() => setCopyStatus(''), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(machineCode);
      setCopyStatus('Copied!');
    } catch (err) {
      console.error('Failed to copy machine code:', err);
      setCopyStatus('Failed to copy.');
    }
    setTimeout(() => setCopyStatus(''), 2000);
  }, [machineCode]);

  const sampleOptions = useMemo(() => 
    sampleCodes.map((sample, index) => (
      <option key={index} value={index.toString()}>
        {sample.name}
      </option>
    )), []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 selection:bg-blue-500 selection:text-white">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-sky-400">6502 Assembler</h1>
        <p className="text-gray-400 mt-1">Assemble 6502 code in your browser.</p>
        <p className="text-xs text-gray-500 mt-1">Note: Labels are case-sensitive. Mnemonics are case-insensitive.</p>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[minmax(0,600px)_400px] gap-6">
        <div className="flex flex-col font-mono text-base" style={{ tabSize: 2 }}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-sky-300">Assembly Code</h2>
          </div>
          <AssemblyEditor value={assemblyCode} onChange={setAssemblyCode} />
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAssemble}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md flex-grow sm:flex-grow-0"
            >
              Assemble
            </button>
            <div className="relative flex-grow">
              <select
                value={selectedSampleIndex}
                onChange={handleLoadSample}
                className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-semibold py-2 px-3 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 shadow-md appearance-none"
                aria-label="Load sample code"
              >
                <option value="" disabled>Load Sample...</option>
                {sampleOptions}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615L10 13.635l-4.484-4.472c-.408-.418-.436-1.17 0-1.615z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-sky-300">Machine Code</h2>
            {machineCode && (
              <button
                onClick={handleCopyMachineCode}
                className="p-1 bg-gray-700 hover:bg-gray-600 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
                title="Copy machine code"
                aria-label="Copy machine code to clipboard"
              >
                <Copy size={24} />
              </button>
            )}
          </div>
          <OutputDisplay machineCode={machineCode} />
          {copyStatus && (
            <p className={`text-xs mt-1 text-center ${copyStatus.includes('Failed') || copyStatus.includes('Nothing') ? 'text-yellow-400' : 'text-green-400'}`}>
              {copyStatus}
            </p>
          )}
          {error && <ErrorDisplay message={error} />}
          {elapsedTime !== null && !error && machineCode && (
             <p className="text-xs text-gray-500 mt-2">Assembled in {formatElapsedTime(elapsedTime)}.</p>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl mt-8 p-4 bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-sky-300 mb-2">Instructions & Notes</h3>
        <div className="text-sm text-gray-300 space-y-3">
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Supported Directives</h4>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><code>.org $XXXX</code> - Set origin address (e.g., <code>.org $8000</code>)</li>
              <li><code>.res COUNT</code> - Reserve COUNT bytes</li>
              <li><code>.byte VAL1, VAL2,...</code> - Define byte data</li>
              <li><code>.word VAL1, VAL2,...</code> - Define word data (16-bit, little-endian)</li>
              <li><code>.dword VAL1, VAL2,...</code> - Define double word data (32-bit, little-endian)</li>
              <li><code>.ascii "TEXT"</code> - Define ASCII string</li>
              <li><code>.asciiz "TEXT"</code> - Define null-terminated ASCII string</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Labels & Comments</h4>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Labels: Define with <code>LABELNAME:</code> (case-sensitive)</li>
              <li>Labels can be on the same line as instructions</li>
              <li>Comments: Start with <code>;</code> anywhere on a line</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Number Formats</h4>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Hexadecimal: <code>$FF</code>, <code>$1000</code></li>
              <li>Decimal: <code>123</code>, <code>255</code></li>
              <li>Character: <code>'A'</code> (ASCII value)</li>
              <li>Low/High byte: <code>#&lt;LABEL</code>, <code>#&gt;LABEL</code></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Addressing Modes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Immediate:</strong> <code>LDA #$FF</code></li>
                  <li><strong>Zero Page:</strong> <code>LDA $10</code></li>
                  <li><strong>Zero Page,X:</strong> <code>LDA $10,X</code></li>
                  <li><strong>Zero Page,Y:</strong> <code>LDX $10,Y</code></li>
                  <li><strong>Absolute:</strong> <code>LDA $1000</code></li>
                </ul>
              </div>
              <div>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Absolute,X:</strong> <code>LDA $1000,X</code></li>
                  <li><strong>Absolute,Y:</strong> <code>LDA $1000,Y</code></li>
                  <li><strong>Indirect:</strong> <code>JMP ($1000)</code></li>
                  <li><strong>(Indirect,X):</strong> <code>LDA ($10,X)</code></li>
                  <li><strong>(Indirect),Y:</strong> <code>LDA ($20),Y</code></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Features</h4>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Complete 6502 instruction set with all addressing modes</li>
              <li>Two-pass assembler with symbol table generation</li>
              <li>Real-time error reporting with line numbers</li>
              <li>Sample programs included for learning</li>
              <li>Copy machine code to clipboard</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI Generated App. For demonstration purposes.</p>
      </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
