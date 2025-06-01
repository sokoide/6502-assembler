
import React, { useState, useCallback, ChangeEvent } from 'react';
import { AssemblyEditor } from './components/AssemblyEditor';
import { OutputDisplay } from './components/OutputDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { assemble } from './services/assembler';
import { sampleCodes } from './services/sampleCodes';

const initialAssemblyCode = `\t.org $0200\n
\tLDA #$C0
\tLDX #$C1
\tLDY #$C2
\tSTA $00
\tSTX $01
\tSTY $02
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
    setCopyStatus(''); // Clear copy status on new assembly
    try {
      const result = assemble(assemblyCode);
      if (result.error) {
        setError(result.error);
      } else {
        setMachineCode(result.machineCode.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' '));
      }
    } catch (e: any) {
      setError(`An unexpected error occurred: ${e.message}`);
    }
    const endTime = performance.now();
    setElapsedTime(endTime - startTime);
  }, [assemblyCode]);

  const handleLoadSample = (event: ChangeEvent<HTMLSelectElement>) => {
    const sampleIndex = event.target.value;
    setSelectedSampleIndex(sampleIndex);
    setCopyStatus(''); // Clear copy status on new sample load
    if (sampleIndex) {
      const selectedSample = sampleCodes[parseInt(sampleIndex, 10)];
      if (selectedSample) {
        setAssemblyCode(selectedSample.code);
        setError('');
        setMachineCode('');
        setElapsedTime(null);
      }
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 selection:bg-blue-500 selection:text-white">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-sky-400">6502 Assembler</h1>
        <p className="text-gray-400 mt-1">Assemble 6502 code in your browser.</p>
        <p className="text-xs text-gray-500 mt-1">Note: Labels are case-sensitive. Mnemonics are case-insensitive.</p>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
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
                {sampleCodes.map((sample, index) => (
                  <option key={index} value={index.toString()}>
                    {sample.name}
                  </option>
                ))}
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
                className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
                title="Copy machine code"
                aria-label="Copy machine code to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zm0 2h8v11H6V5zm6 1H8v1h4V6zm0 2H8v1h4V8zm0 2H8v1h4v-2z" />
                </svg>
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
             <p className="text-xs text-gray-500 mt-2">Assembled in {elapsedTime.toFixed(2)} ms.</p>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl mt-8 p-4 bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-sky-300 mb-2">Instructions & Notes</h3>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          <li>Supported directives:
            <code>ORG $XXXX</code>, <code>* = $XXXX</code> (set origin).
            <code>LABEL: .res COUNT</code> (reserve COUNT bytes).
            <code>LABEL: .byte VAL1, VAL2,...</code> (define byte data).
          </li>
          <li>Labels: Define with <code>LABELNAME:</code> (e.g., <code>MY_LOOP:</code>). Case-sensitive. Can be on same line as instruction/directive.</li>
          <li>Comments: Start with <code>;</code> (e.g., <code>; This is a comment</code>).</li>
          <li>Numbers & Values:
            <ul className="list-disc list-inside ml-4 text-xs text-gray-400">
              <li>Hex: <code>#$FF</code> (imm), <code>$FF</code> (ZP), <code>$FFFF</code> (abs). For <code>.res</code>, <code>.byte</code>: <code>$HH</code>.</li>
              <li>Decimal: <code>#123</code> (imm). For <code>.res</code>, <code>.byte</code>: <code>123</code>.</li>
              <li>Character (for <code>.byte</code>): <code>'A'</code>, <code>"B"</code> (ASCII value).</li>
              <li>Labels (for <code>.res</code>, <code>.byte</code> values, and instruction operands).</li>
              <li>Low/High byte (for immediate mode): <code>#&lt;$WORD</code>, <code>#&gt;$WORD</code>, <code>#&lt;LABEL</code>, <code>#&gt;LABEL</code>.</li>
            </ul>
          </li>
          <li>Addressing Modes (examples):
            <ul className="list-disc list-inside ml-4 text-xs text-gray-400">
              <li>Immediate: <code>LDA #$A9</code>, <code>LDX #10</code>, <code>LDA #&lt;MY_LABEL</code></li>
              <li>Zero Page: <code>STA $00</code>, <code>LDA ZP_LABEL</code></li>
              <li>Zero Page,X/Y: <code>LDA $10,X</code>, <code>LDX $10,Y</code></li>
              <li>Absolute: <code>JMP $C000</code>, <code>LDA MY_LABEL</code></li>
              <li>Absolute,X/Y: <code>STA $C000,X</code>, <code>LDA MY_LABEL,Y</code></li>
              <li>Indirect: <code>JMP ($C000)</code></li>
              <li>(Indirect,X): <code>LDA ($10,X)</code></li>
              <li>(Indirect),Y: <code>LDA ($20),Y</code></li>
              <li>Relative (for branches): <code>BNE MY_LOOP</code></li>
              <li>Implied/Accumulator: <code>NOP</code>, <code>INX</code>, <code>ASL A</code></li>
            </ul>
          </li>
          <li>The example output from the prompt (<code>A9 C0 ... 4C 0C 02</code>) is achieved with the initially pre-filled code using <code>.org $0200</code>, which means LOOP is at <code>$020C</code>, hence <code>JMP $020C</code> is <code>4C 0C 02</code>.</li>
        </ul>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI Generated App. For demonstration purposes.</p>
      </footer>
    </div>
  );
};

export default App;
