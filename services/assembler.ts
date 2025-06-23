
import { instructionSet, InstructionVariant } from './opcodes';
import type { ParsedLine, AssembleResult, LabelMap, ParsedResDirectiveLine, ParsedByteDirectiveLine, ParsedEquDirectiveLine, ParsedWordDirectiveLine, ParsedDwordDirectiveLine, ParsedAsciiDirectiveLine, ParsedAsciizDirectiveLine } from '../types';

const ORG_REGEX_FULL = /^(?:\*)\s*=\s*\$([0-9A-Fa-f]{1,4})|\.org\s+\$([0-9A-Fa-f]{1,4})$/i;
const ORG_REGEX_PART = /^(\.org)\s+\$([0-9A-Fa-f]{1,4})$/i; // For use after label
const STAR_ORG_REGEX_PART = /^(\*)\s*=\s*\$([0-9A-Fa-f]{1,4})$/i; // For use after label

const EQU_REGEX = /(.+)\s+^(EQU)\s+(.+)$/i;
const RES_REGEX = /^(\.RES)\s+(.+)$/i;
const BYTE_REGEX = /^(\.BYTE)\s+(.+)$/i;
const WORD_REGEX = /^(\.WORD)\s+(.+)$/i;
const DWORD_REGEX = /^(\.DWORD)\s+(.+)$/i;
const ASCII_REGEX = /^(\.ASCII)\s+(.+)$/i;
const ASCIIZ_REGEX = /^(\.ASCIIZ)\s+(.+)$/i;

// INSTRUCTION_REGEX matches a 3-letter mnemonic followed by anything.
const INSTRUCTION_REGEX = /^([A-Za-z]{3})\s*(.*)$/;

// Helper to parse mixed string and byte values (for .ascii and .asciiz)
function parseMixedValues(valuesStr: string, labels: LabelMap, context: string): { bytes: number[], error?: string } {
  const resultBytes: number[] = [];
  let i = 0;
  const input = valuesStr.trim();
  
  while (i < input.length) {
    // Skip whitespace
    while (i < input.length && /\s/.test(input[i])) {
      i++;
    }
    
    if (i >= input.length) break;
    
    // Check if we're starting a quoted string
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      i++; // Skip opening quote
      const start = i;
      
      // Find closing quote
      while (i < input.length && input[i] !== quote) {
        i++;
      }
      
      if (i >= input.length) {
        return { bytes: [], error: `Unterminated string in ${context}` };
      }
      
      const str = input.slice(start, i);
      i++; // Skip closing quote
      
      // Add ASCII bytes for each character
      for (let j = 0; j < str.length; j++) {
        resultBytes.push(str.charCodeAt(j));
      }
    } else {
      // Parse a numeric value or label
      const start = i;
      
      // Find the end of this value (next comma or end of string)
      while (i < input.length && input[i] !== ',') {
        i++;
      }
      
      const valueStr = input.slice(start, i).trim();
      if (valueStr === '') {
        return { bytes: [], error: `Empty value in ${context}` };
      }
      
      const value = parseValue(valueStr, labels, context);
      if (typeof value === 'string') {
        return { bytes: [], error: value };
      }
      if (value < 0 || value > 0xFF) {
        return { bytes: [], error: `${context} value '${valueStr}' out of range (0-255)` };
      }
      resultBytes.push(value);
    }
    
    // Skip comma if present
    while (i < input.length && /\s/.test(input[i])) {
      i++;
    }
    if (i < input.length && input[i] === ',') {
      i++;
    }
  }
  
  return { bytes: resultBytes };
}

// Helper to parse numeric value or label, returns number or error string
function parseValue(valueStr: string, labels: LabelMap, context: string): number | string {
  const s = valueStr.trim();
  if (s.startsWith('$')) {
    const n = parseInt(s.substring(1), 16);
    return isNaN(n) ? `Invalid hexadecimal value '${s}' for ${context}` : n;
  } else if (/^[0-9]+$/.test(s)) {
    const n = parseInt(s, 10);
    return isNaN(n) ? `Invalid decimal value '${s}' for ${context}` : n;
  } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) { // Label
    const val = labels.get(s);
    if (val === undefined) return `Label '${s}' not found for ${context}`;
    return val;
  } else if ((s.startsWith("'") && s.endsWith("'") && s.length === 3) || (s.startsWith('"') && s.endsWith('"') && s.length === 3)) {
    return s.charCodeAt(1); // ASCII value of character
  }
  return `Invalid value format '${s}' for ${context}`;
}


export function assemble(code: string): AssembleResult {
  const lines = code.split('\n');
  const labels = new Map<string, number>();
  const parsedLines: ParsedLine[] = [];
  let currentAddress = 0x0000; // Default ORG
  let error: string | null = null;

  // Pass 1: Build symbol table (labels) and parse lines
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    let processedLine = originalLine.trim();
    const lineNumber = i + 1;

    // 1. Skip full-line comments and empty lines
    if (processedLine.startsWith(';') || processedLine === '') {
      parsedLines.push({ lineNumber, originalLine, address: currentAddress, type: 'comment' });
      continue;
    }

    // 2. Strip end-of-line comments
    const commentIndex = processedLine.indexOf(';');
    if (commentIndex !== -1) {
      processedLine = processedLine.substring(0, commentIndex).trim();
      if (processedLine === '') {
        parsedLines.push({ lineNumber, originalLine, address: currentAddress, type: 'comment' });
        continue;
      }
    }

    // 3. Check for and process a label
    const labelMatch = processedLine.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    let contentAfterLabel = processedLine;
    let currentLineLabel: string | null = null;

    if (labelMatch) {
      currentLineLabel = labelMatch[1];
      contentAfterLabel = processedLine.substring(labelMatch[0].length).trim();

      // It's a location label
      if (labels.has(currentLineLabel)) {
        error = `Line ${lineNumber}: Duplicate label '${currentLineLabel}' defined. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }
      labels.set(currentLineLabel, currentAddress);
      parsedLines.push({
        lineNumber,
        originalLine: originalLine, // Store full original line for context if only label
        address: currentAddress,
        type: 'label',
        label: currentLineLabel
      });
    }

    // 4. If contentAfterLabel is empty, the line was only a label (or label + comment).
    if (contentAfterLabel === '') {
      continue;
    }

    // 5. Process directives or instructions from contentAfterLabel
    // Check for ORG directive (can't have a preceding label on the same line in this simplified model)
    // If currentLineLabel is null, it means ORG is not preceded by a label on this line.
    if (!currentLineLabel) {
      const orgMatchGlobal = contentAfterLabel.match(ORG_REGEX_FULL);
      if (orgMatchGlobal) {
        currentAddress = parseInt(orgMatchGlobal[1] || orgMatchGlobal[2], 16);
        parsedLines.push({
          lineNumber,
          originalLine,
          address: currentAddress,
          type: 'directive',
          directive: '.org',
          value: currentAddress
        });
        continue;
      }
    } else { // Label was present, check if ORG follows the label
      const orgMatchPart = contentAfterLabel.match(ORG_REGEX_PART) || contentAfterLabel.match(STAR_ORG_REGEX_PART);
      if (orgMatchPart) {
        // The label before ORG points to the address *before* ORG takes effect.
        // The ORG directive itself changes currentAddress for subsequent lines.
        const orgValue = parseInt(orgMatchPart[2], 16);
        parsedLines.push({
          lineNumber,
          originalLine,
          address: orgValue, // The ORG directive's "address" is its value
          type: 'directive',
          directive: '.org',
          value: orgValue
        });
        currentAddress = orgValue; // Update currentAddress for subsequent lines
        continue;
      }
    }

    // TODO: Check for EQU directive
    // const equMatch = contentAfterLabel.match(EQU_REGEX);
    // if (equMatch) {
    //   const equVarStr = equMatchForLabel[1].trim();
    //   const equVar = parseValue(equVarStr, labels, `var EQU directive`);
    //   const equValueStr = equMatchForLabel[3].trim();
    //   const equValue = parseValue(equValueStr, labels, `value EQU directive`);
    //   if (typeof equValue === 'string') {
    //     error = `Line ${lineNumber}: ${equValue}. Original line: '${originalLine}'`;
    //     return { machineCode: [], error };
    //   }
    //   labels.set(currentLineLabel, equValue);
    //   parsedLines.push({
    //     lineNumber,
    //     originalLine,
    //     address: equValue, // For EQU, address field stores the value
    //     type: 'directive',
    //     directive: 'EQU',
    //     label: currentLineLabel,
    //     value: equValue
    //   } as ParsedEquDirectiveLine);
    //   continue;
    // }

    // Check for .RES directive
    const resMatch = contentAfterLabel.match(RES_REGEX);
    if (resMatch) {
      const countStr = resMatch[2].trim();
      const count = parseValue(countStr, labels, ".res count");
      if (typeof count === 'string') {
        error = `Line ${lineNumber}: ${count}. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }
      if (count < 0) {
        error = `Line ${lineNumber}: .res count cannot be negative: ${countStr}. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.res',
        label: currentLineLabel || undefined, // Store label if it was on this line
        size: count
      } as ParsedResDirectiveLine);
      currentAddress += count;
      continue;
    }

    // Check for .BYTE directive
    const byteMatch = contentAfterLabel.match(BYTE_REGEX);
    if (byteMatch) {
      const valuesStr = byteMatch[2].split(',');
      const byteValues: number[] = [];
      for (const valStr of valuesStr) {
        const byteVal = parseValue(valStr, labels, ".byte value");
        if (typeof byteVal === 'string') {
          error = `Line ${lineNumber}: ${byteVal}. Original line: '${originalLine}'`;
          return { machineCode: [], error };
        }
        if (byteVal < 0 || byteVal > 0xFF) {
          error = `Line ${lineNumber}: .byte value '${valStr.trim()}' out of range (0-255). Original line: '${originalLine}'`;
          return { machineCode: [], error };
        }
        byteValues.push(byteVal);
      }
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.byte',
        label: currentLineLabel || undefined,
        values: byteValues
      } as ParsedByteDirectiveLine);
      currentAddress += byteValues.length;
      continue;
    }

    // Check for .WORD directive
    const wordMatch = contentAfterLabel.match(WORD_REGEX);
    if (wordMatch) {
      const valuesStr = wordMatch[2].split(',').map(s => s.trim());
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.word',
        label: currentLineLabel || undefined,
        valueStrings: valuesStr
      } as ParsedWordDirectiveLine);
      currentAddress += valuesStr.length * 2; // 2 bytes per word
      continue;
    }

    // Check for .DWORD directive
    const dwordMatch = contentAfterLabel.match(DWORD_REGEX);
    if (dwordMatch) {
      const valuesStr = dwordMatch[2].split(',').map(s => s.trim());
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.dword',
        label: currentLineLabel || undefined,
        valueStrings: valuesStr
      } as ParsedDwordDirectiveLine);
      currentAddress += valuesStr.length * 4; // 4 bytes per dword
      continue;
    }

    // Check for .ASCII directive
    const asciiMatch = contentAfterLabel.match(ASCII_REGEX);
    if (asciiMatch) {
      const valuesStr = asciiMatch[2]; // Everything after .ASCII
      const parseResult = parseMixedValues(valuesStr, labels, ".ascii");
      if (parseResult.error) {
        error = `Line ${lineNumber}: ${parseResult.error}. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.ascii',
        label: currentLineLabel || undefined,
        values: parseResult.bytes
      } as ParsedAsciiDirectiveLine);
      currentAddress += parseResult.bytes.length;
      continue;
    }

    // Check for .ASCIIZ directive
    const asciizMatch = contentAfterLabel.match(ASCIIZ_REGEX);
    if (asciizMatch) {
      const valuesStr = asciizMatch[2]; // Everything after .ASCIIZ
      const parseResult = parseMixedValues(valuesStr, labels, ".asciiz");
      if (parseResult.error) {
        error = `Line ${lineNumber}: ${parseResult.error}. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }
      parsedLines.push({
        lineNumber,
        originalLine,
        address: currentAddress, // Label (if any) points here
        type: 'directive',
        directive: '.asciiz',
        label: currentLineLabel || undefined,
        values: parseResult.bytes
      } as ParsedAsciizDirectiveLine);
      currentAddress += parseResult.bytes.length + 1; // +1 for null terminator
      continue;
    }


    // Check for INSTRUCTION
    const instructionMatch = contentAfterLabel.match(INSTRUCTION_REGEX);
    if (instructionMatch) {
      const mnemonic = instructionMatch[1].toUpperCase();
      const operand = instructionMatch[2].trim();

      // Find all matching variants for this mnemonic
      const candidateVariants = instructionSet.filter(variant => 
        variant.mnemonic === mnemonic && variant.regex.test(operand)
      );

      let instructionFound: InstructionVariant | null = null;
      
      if (candidateVariants.length === 1) {
        instructionFound = candidateVariants[0];
      } else if (candidateVariants.length > 1) {
        // Multiple matches - need to pick the right one
        // This typically happens with labels that could be ZP or ABS
        // For now, we'll defer this choice to pass 2 where labels are resolved
        // Pick the first match as default
        instructionFound = candidateVariants[0];
      } else {
        error = `Line ${lineNumber}: Unknown instruction or addressing mode for '${mnemonic}${operand ? ' ' + operand : ''}' from content '${contentAfterLabel}'. Original line: '${originalLine}'`;
        return { machineCode: [], error };
      }

      if (instructionFound) {
        parsedLines.push({
          lineNumber,
          originalLine: originalLine,
          address: currentAddress,
          type: 'instruction',
          mnemonic,
          operand,
          variant: instructionFound,
          candidateVariants // Store all candidates for pass 2 refinement
        });
        currentAddress += instructionFound.size;
      }
    } else {
      error = `Line ${lineNumber}: Syntax error or unrecognized statement: '${contentAfterLabel}'. Original line: '${originalLine}'`;
      return { machineCode: [], error };
    }
  } // End of Pass 1 loop

  // Pass 2: Generate machine code
  const machineCode: number[] = [];

  for (const pLine of parsedLines) {
    if (pLine.type === 'instruction' && pLine.variant) {
      // Smart instruction selection for ZP vs ABS addressing
      let finalVariant = pLine.variant;
      
      if (pLine.candidateVariants && pLine.candidateVariants.length > 1) {
        // Try to find a better variant based on operand resolution
        const operand = pLine.operand;
        
        // Check if operand is a label that resolves to zero page
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(operand)) {
          const labelValue = labels.get(operand);
          if (labelValue !== undefined) {
            // Choose ZP variant if value fits in zero page
            if (labelValue <= 0xFF) {
              const zpVariant = pLine.candidateVariants.find(v => v.size === 2);
              if (zpVariant) finalVariant = zpVariant;
            } else {
              const absVariant = pLine.candidateVariants.find(v => v.size === 3);
              if (absVariant) finalVariant = absVariant;
            }
          }
        }
      }
      
      const instructionBytes: number[] = [finalVariant.opcode];
      const operandResult = finalVariant.resolveOperand(pLine.operand, labels, pLine.address);

      if (operandResult.error) {
        error = `Line ${pLine.lineNumber}: Error resolving operand '${pLine.operand}' for ${pLine.mnemonic}: ${operandResult.error}. Original: '${pLine.originalLine}'`;
        return { machineCode: [], error };
      }
      instructionBytes.push(...operandResult.bytes);

      if (instructionBytes.length !== finalVariant.size) {
        error = `Line ${pLine.lineNumber}: Internal error - instruction size mismatch for ${pLine.mnemonic} ${pLine.operand}. Expected ${finalVariant.size}, got ${instructionBytes.length}. Original: '${pLine.originalLine}'`;
        return { machineCode: [], error };
      }
      machineCode.push(...instructionBytes);
    } else if (pLine.type === 'directive' && pLine.directive === '.byte') {
      machineCode.push(...pLine.values);
    } else if (pLine.type === 'directive' && pLine.directive === '.word') {
      // Resolve and generate little-endian bytes for each word value
      for (const valueStr of pLine.valueStrings) {
        const wordValue = parseValue(valueStr, labels, ".word value");
        if (typeof wordValue === 'string') {
          error = `Line ${pLine.lineNumber}: ${wordValue}. Original: '${pLine.originalLine}'`;
          return { machineCode: [], error };
        }
        if (wordValue < 0 || wordValue > 0xFFFF) {
          error = `Line ${pLine.lineNumber}: .word value '${valueStr}' out of range (0-65535). Original: '${pLine.originalLine}'`;
          return { machineCode: [], error };
        }
        machineCode.push(wordValue & 0xFF);        // Low byte
        machineCode.push((wordValue >> 8) & 0xFF); // High byte
      }
    } else if (pLine.type === 'directive' && pLine.directive === '.dword') {
      // Resolve and generate little-endian bytes for each dword value
      for (const valueStr of pLine.valueStrings) {
        const dwordValue = parseValue(valueStr, labels, ".dword value");
        if (typeof dwordValue === 'string') {
          error = `Line ${pLine.lineNumber}: ${dwordValue}. Original: '${pLine.originalLine}'`;
          return { machineCode: [], error };
        }
        if (dwordValue < 0 || dwordValue > 0xFFFFFFFF) {
          error = `Line ${pLine.lineNumber}: .dword value '${valueStr}' out of range (0-4294967295). Original: '${pLine.originalLine}'`;
          return { machineCode: [], error };
        }
        machineCode.push(dwordValue & 0xFF);         // Byte 0 (lowest)
        machineCode.push((dwordValue >> 8) & 0xFF);  // Byte 1
        machineCode.push((dwordValue >> 16) & 0xFF); // Byte 2
        machineCode.push((dwordValue >> 24) & 0xFF); // Byte 3 (highest)
      }
    } else if (pLine.type === 'directive' && pLine.directive === '.ascii') {
      // Generate bytes for mixed strings and values
      machineCode.push(...pLine.values);
    } else if (pLine.type === 'directive' && pLine.directive === '.asciiz') {
      // Generate bytes for mixed strings and values plus null terminator
      machineCode.push(...pLine.values);
      machineCode.push(0); // Null terminator
    }
    // .org, EQU, .res, comment, label-only lines do not generate machine code in this pass.
  } // End of Pass 2 loop

  return { machineCode, error };
}
