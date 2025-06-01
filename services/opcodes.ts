
import type { LabelMap } from '../types';

export interface OperandResolverOutput {
  bytes: number[];
  error?: string;
}

export type OperandResolver = (
  operandString: string,
  labels: LabelMap,
  currentInstructionAddress: number
) => OperandResolverOutput;

export interface InstructionVariant {
  mnemonic: string;
  regex: RegExp; // Regex to match the operand part
  opcode: number;
  size: 1 | 2 | 3; // Total instruction size in bytes
  resolveOperand: OperandResolver;
}

// --- Start of Operand Resolvers ---

const resolveImplied: OperandResolver = (_opStr, _labels, _currentInstructionAddress) => {
  return { bytes: [] };
};

const resolveAccumulator: OperandResolver = (_opStr, _labels, _currentInstructionAddress) => {
    if (_opStr.toUpperCase() === 'A' || _opStr === '') { // Empty operand for ASL, LSR etc. means accumulator
        return { bytes: [] };
    }
    return { bytes: [], error: "Accumulator addressing mode expects 'A' or empty operand."};
};


const resolveImmediate: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
  const parseNumericOrLabel = (valStr: string): { value?: number; error?: string } => {
    if (valStr.startsWith('$')) {
      const num = parseInt(valStr.substring(1), 16);
      if (isNaN(num)) return { error: `Invalid hex value: ${valStr}` };
      return { value: num };
    } else if (/^[0-9]+$/.test(valStr)) {
      const num = parseInt(valStr, 10);
      if (isNaN(num)) return { error: `Invalid decimal value: ${valStr}` };
      return { value: num };
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(valStr)) { // Label
      const addr = labels.get(valStr);
      if (addr === undefined) return { error: `Label not found: ${valStr}` };
      return { value: addr };
    }
    return { error: `Unrecognized value format for immediate: ${valStr}` };
  };

  let finalValue: number;

  if (opStr.startsWith('#<')) {
    const result = parseNumericOrLabel(opStr.substring(2).trim());
    if (result.error) return { bytes: [], error: `For low byte: ${result.error}` };
    if (result.value === undefined) return { bytes: [], error: `Value for low byte is undefined.` };
    finalValue = result.value! & 0xFF;
  } else if (opStr.startsWith('#>')) {
    const result = parseNumericOrLabel(opStr.substring(2).trim());
    if (result.error) return { bytes: [], error: `For high byte: ${result.error}` };
    if (result.value === undefined) return { bytes: [], error: `Value for high byte is undefined.` };
    finalValue = (result.value! >> 8) & 0xFF;
  } else if (opStr.startsWith('#$')) {
    finalValue = parseInt(opStr.substring(2), 16);
  } else if (opStr.startsWith('#')) {
    const valuePart = opStr.substring(1);
    if (/^[0-9]+$/.test(valuePart)) { // Decimal
        finalValue = parseInt(valuePart, 10);
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(valuePart)) { // Label (e.g. #MY_CONSTANT)
        const labelVal = labels.get(valuePart);
        if (labelVal === undefined) return { bytes: [], error: `Label used as immediate constant not found: ${valuePart}`};
        finalValue = labelVal; // Assume label stores the direct constant value
    }
     else {
        return { bytes: [], error: `Invalid immediate format: ${opStr}` };
    }
  } else {
    return { bytes: [], error: `Invalid immediate format (must start with #): ${opStr}` };
  }

  if (isNaN(finalValue) || finalValue < 0 || finalValue > 0xFF) {
    return { bytes: [], error: `Immediate value out of range (0-255) or invalid: ${opStr} (parsed as ${finalValue.toString(16)})` };
  }
  return { bytes: [finalValue] };
};


const resolveZeroPage: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
  let value: number | undefined;
  if (opStr.startsWith('$')) {
    value = parseInt(opStr.substring(1), 16);
  } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(opStr)) { // Label
    value = labels.get(opStr);
    if (value === undefined) return { bytes: [], error: `Label not found for Zero Page: ${opStr}` };
  } else {
    return { bytes: [], error: `Invalid Zero Page format: ${opStr}` };
  }

  if (isNaN(value) || value < 0 || value > 0xFF) {
    return { bytes: [], error: `Zero Page address out of range (0-255): ${opStr}` };
  }
  return { bytes: [value] };
};

const resolveAbsolute: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
  let value: number | undefined;
  if (opStr.startsWith('$')) {
    value = parseInt(opStr.substring(1), 16);
  } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(opStr)) { // Label
    value = labels.get(opStr);
    if (value === undefined) return { bytes: [], error: `Label not found for Absolute address: ${opStr}` };
  } else {
    return { bytes: [], error: `Invalid Absolute address format: ${opStr}` };
  }

  if (isNaN(value) || value < 0 || value > 0xFFFF) {
    return { bytes: [], error: `Absolute address out of range (0-65535): ${opStr}` };
  }
  return { bytes: [value & 0xFF, (value >> 8) & 0xFF] };
};

const resolveZeroPageIndexed: (indexedChar: 'X' | 'Y') => OperandResolver = 
 (indexedChar) => (opStr, labels, _currentInstructionAddress) => {
    const parts = opStr.split(',');
    if (parts.length !== 2 || parts[1].trim().toUpperCase() !== indexedChar) {
      return { bytes: [], error: `Invalid format for ZeroPage,${indexedChar}. Expected 'ADDRESS,${indexedChar}'. Got: ${opStr}` };
    }
    const addressPart = parts[0].trim();
    
    let value: number | undefined;
    if (addressPart.startsWith('$')) {
        value = parseInt(addressPart.substring(1), 16);
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(addressPart)) { // Label
        value = labels.get(addressPart);
        if (value === undefined) return { bytes: [], error: `Label not found for ZeroPage,${indexedChar}: ${addressPart}` };
    } else {
        return { bytes: [], error: `Invalid ZeroPage,${indexedChar} address format: ${addressPart}` };
    }

    if (isNaN(value) || value < 0 || value > 0xFF) {
      return { bytes: [], error: `ZeroPage,${indexedChar} address out of range (0-255): ${opStr}` };
    }
    return { bytes: [value] };
};

const resolveAbsoluteIndexed: (indexedChar: 'X' | 'Y') => OperandResolver = 
 (indexedChar) => (opStr, labels, _currentInstructionAddress) => {
    const parts = opStr.split(',');
    if (parts.length !== 2 || parts[1].trim().toUpperCase() !== indexedChar) {
      return { bytes: [], error: `Invalid format for Absolute,${indexedChar}. Expected 'ADDRESS,${indexedChar}'. Got: ${opStr}` };
    }
    const addressPart = parts[0].trim();
    
    let value: number | undefined;
    if (addressPart.startsWith('$')) {
        value = parseInt(addressPart.substring(1), 16);
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(addressPart)) { // Label
        value = labels.get(addressPart);
        if (value === undefined) return { bytes: [], error: `Label not found for Absolute,${indexedChar}: ${addressPart}` };
    } else {
        return { bytes: [], error: `Invalid Absolute,${indexedChar} address format: ${addressPart}` };
    }

    if (isNaN(value) || value < 0 || value > 0xFFFF) {
      return { bytes: [], error: `Absolute,${indexedChar} address out of range (0-65535): ${opStr}` };
    }
    return { bytes: [value & 0xFF, (value >> 8) & 0xFF] };
};

const resolveIndirectX: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
    // Matches ($NN,X) or (LABEL,X)
    const match = opStr.match(/^\((\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*),X\)$/i);
    if (!match) {
      return { bytes: [], error: `Invalid (Indirect,X) format: ${opStr}` };
    }
    const addressPart = match[1];
    let value: number | undefined;

    if (addressPart.startsWith('$')) {
        value = parseInt(addressPart.substring(1), 16);
    } else { // Label
        value = labels.get(addressPart);
        if (value === undefined) return { bytes: [], error: `Label not found for (Indirect,X): ${addressPart}` };
    }
    
    if (isNaN(value) || value < 0 || value > 0xFF) {
      return { bytes: [], error: `(Indirect,X) base address out of Zero Page range (0-255): ${opStr}` };
    }
    return { bytes: [value] };
};

const resolveIndirectY: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
    // Matches ($NN),Y or (LABEL),Y
    const match = opStr.match(/^\((\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*)\),Y$/i);
    if (!match) {
      return { bytes: [], error: `Invalid (Indirect),Y format: ${opStr}` };
    }
    const addressPart = match[1];
    let value: number | undefined;
    
    if (addressPart.startsWith('$')) {
        value = parseInt(addressPart.substring(1), 16);
    } else { // Label
        value = labels.get(addressPart);
        if (value === undefined) return { bytes: [], error: `Label not found for (Indirect),Y: ${addressPart}` };
    }

    if (isNaN(value) || value < 0 || value > 0xFF) {
      return { bytes: [], error: `(Indirect),Y base address out of Zero Page range (0-255): ${opStr}` };
    }
    return { bytes: [value] };
};


const resolveRelativeLabel: OperandResolver = (opStr, labels, currentInstructionAddress) => {
  const targetAddress = labels.get(opStr);
  if (targetAddress === undefined) {
    return { bytes: [], error: `Label not found for relative branch: ${opStr}` };
  }
  const instructionSize = 2; // Opcode + 1 byte offset for relative branches
  const nextInstructionAddress = currentInstructionAddress + instructionSize;
  const offset = targetAddress - nextInstructionAddress;

  if (offset < -128 || offset > 127) {
    return { bytes: [], error: `Relative branch target out of range for label ${opStr} (offset ${offset})` };
  }
  return { bytes: [offset & 0xFF] }; // Handles two's complement for negative offsets
};

const resolveIndirectAbsolute: OperandResolver = (opStr, labels, _currentInstructionAddress) => {
    // Matches ($NNNN) or (LABEL)
    const match = opStr.match(/^\((\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*)\)$/i);
    if (!match) {
      return { bytes: [], error: `Invalid Indirect Absolute format: ${opStr}` };
    }
    const addressPart = match[1];
    let value: number | undefined;

    if (addressPart.startsWith('$')) {
        value = parseInt(addressPart.substring(1), 16);
    } else { // Label
        value = labels.get(addressPart);
        if (value === undefined) return { bytes: [], error: `Label not found for Indirect Absolute: ${addressPart}` };
    }
    
    if (isNaN(value) || value < 0 || value > 0xFFFF) {
      return { bytes: [], error: `Indirect Absolute address out of range (0-65535): ${opStr}` };
    }
    return { bytes: [value & 0xFF, (value >> 8) & 0xFF] };
};


// --- End of Operand Resolvers ---

// Regex for matching operands
const R = {
  ACCUMULATOR: /^(A)?$/i, // Matches 'A' or empty (for implied accumulator ops like ASL)
  IMMEDIATE: /^#.+$/, // Generic immediate, handled by resolveImmediate
  ZEROPAGE: /^(?:\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*)$/, // $NN or LABEL
  ZEROPAGE_X: /^(?:\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*),X$/i, // $NN,X or LABEL,X
  ZEROPAGE_Y: /^(?:\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*),Y$/i, // $NN,Y or LABEL,Y
  ABSOLUTE: /^(?:\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*)$/, // $NNNN or LABEL
  ABSOLUTE_X: /^(?:\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*),X$/i, // $NNNN,X or LABEL,X
  ABSOLUTE_Y: /^(?:\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*),Y$/i, // $NNNN,Y or LABEL,Y
  INDIRECT_X: /^\((\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*),X\)$/i, // ($NN,X) or (LABEL,X)
  INDIRECT_Y: /^\((\$[0-9A-Fa-f]{1,2}|[A-Za-z_][A-Za-z0-9_]*)\),Y$/i, // ($NN),Y or (LABEL),Y
  RELATIVE: /^[A-Za-z_][A-Za-z0-9_]*$/, // Label for branches
  IMPLIED: /^$/, // No operand
  INDIRECT_ABS: /^\((\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*)\)$/i // ($NNNN) or (LABEL)
};

export const instructionSet: InstructionVariant[] = [
  // LDA
  { mnemonic: 'LDA', regex: R.IMMEDIATE,   opcode: 0xA9, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'LDA', regex: R.ZEROPAGE,    opcode: 0xA5, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'LDA', regex: R.ZEROPAGE_X,  opcode: 0xB5, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'LDA', regex: R.ABSOLUTE,    opcode: 0xAD, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'LDA', regex: R.ABSOLUTE_X,  opcode: 0xBD, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'LDA', regex: R.ABSOLUTE_Y,  opcode: 0xB9, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'LDA', regex: R.INDIRECT_X,  opcode: 0xA1, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'LDA', regex: R.INDIRECT_Y,  opcode: 0xB1, size: 2, resolveOperand: resolveIndirectY },
  // LDX
  { mnemonic: 'LDX', regex: R.IMMEDIATE,   opcode: 0xA2, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'LDX', regex: R.ZEROPAGE,    opcode: 0xA6, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'LDX', regex: R.ZEROPAGE_Y,  opcode: 0xB6, size: 2, resolveOperand: resolveZeroPageIndexed('Y') },
  { mnemonic: 'LDX', regex: R.ABSOLUTE,    opcode: 0xAE, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'LDX', regex: R.ABSOLUTE_Y,  opcode: 0xBE, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  // LDY
  { mnemonic: 'LDY', regex: R.IMMEDIATE,   opcode: 0xA0, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'LDY', regex: R.ZEROPAGE,    opcode: 0xA4, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'LDY', regex: R.ZEROPAGE_X,  opcode: 0xB4, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'LDY', regex: R.ABSOLUTE,    opcode: 0xAC, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'LDY', regex: R.ABSOLUTE_X,  opcode: 0xBC, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  // STA
  { mnemonic: 'STA', regex: R.ZEROPAGE,    opcode: 0x85, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'STA', regex: R.ZEROPAGE_X,  opcode: 0x95, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'STA', regex: R.ABSOLUTE,    opcode: 0x8D, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'STA', regex: R.ABSOLUTE_X,  opcode: 0x9D, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'STA', regex: R.ABSOLUTE_Y,  opcode: 0x99, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'STA', regex: R.INDIRECT_X,  opcode: 0x81, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'STA', regex: R.INDIRECT_Y,  opcode: 0x91, size: 2, resolveOperand: resolveIndirectY },
  // STX
  { mnemonic: 'STX', regex: R.ZEROPAGE,    opcode: 0x86, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'STX', regex: R.ZEROPAGE_Y,  opcode: 0x96, size: 2, resolveOperand: resolveZeroPageIndexed('Y') },
  { mnemonic: 'STX', regex: R.ABSOLUTE,    opcode: 0x8E, size: 3, resolveOperand: resolveAbsolute },
  // STY
  { mnemonic: 'STY', regex: R.ZEROPAGE,    opcode: 0x84, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'STY', regex: R.ZEROPAGE_X,  opcode: 0x94, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'STY', regex: R.ABSOLUTE,    opcode: 0x8C, size: 3, resolveOperand: resolveAbsolute },

  // Stack Operations
  { mnemonic: 'PHA', regex: R.IMPLIED,     opcode: 0x48, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'PLA', regex: R.IMPLIED,     opcode: 0x68, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'PHP', regex: R.IMPLIED,     opcode: 0x08, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'PLP', regex: R.IMPLIED,     opcode: 0x28, size: 1, resolveOperand: resolveImplied },


  // JMP
  { mnemonic: 'JMP', regex: R.ABSOLUTE,     opcode: 0x4C, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'JMP', regex: R.INDIRECT_ABS, opcode: 0x6C, size: 3, resolveOperand: resolveIndirectAbsolute },

  // Branch instructions (all use relative addressing)
  { mnemonic: 'BPL', regex: R.RELATIVE, opcode: 0x10, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BMI', regex: R.RELATIVE, opcode: 0x30, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BVC', regex: R.RELATIVE, opcode: 0x50, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BVS', regex: R.RELATIVE, opcode: 0x70, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BCC', regex: R.RELATIVE, opcode: 0x90, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BCS', regex: R.RELATIVE, opcode: 0xB0, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BNE', regex: R.RELATIVE, opcode: 0xD0, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BEQ', regex: R.RELATIVE, opcode: 0xF0, size: 2, resolveOperand: resolveRelativeLabel },

  // Other common instructions
  { mnemonic: 'RTS', regex: R.IMPLIED, opcode: 0x60, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'JSR', regex: R.ABSOLUTE, opcode: 0x20, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'NOP', regex: R.IMPLIED, opcode: 0xEA, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'BRK', regex: R.IMPLIED, opcode: 0x00, size: 1, resolveOperand: resolveImplied },

  // Arithmetic
  { mnemonic: 'ADC', regex: R.IMMEDIATE,   opcode: 0x69, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'ADC', regex: R.ZEROPAGE,    opcode: 0x65, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'ADC', regex: R.ZEROPAGE_X,  opcode: 0x75, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'ADC', regex: R.ABSOLUTE,    opcode: 0x6D, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'ADC', regex: R.ABSOLUTE_X,  opcode: 0x7D, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'ADC', regex: R.ABSOLUTE_Y,  opcode: 0x79, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'ADC', regex: R.INDIRECT_X,  opcode: 0x61, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'ADC', regex: R.INDIRECT_Y,  opcode: 0x71, size: 2, resolveOperand: resolveIndirectY },
  
  { mnemonic: 'SBC', regex: R.IMMEDIATE,   opcode: 0xE9, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'SBC', regex: R.ZEROPAGE,    opcode: 0xE5, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'SBC', regex: R.ZEROPAGE_X,  opcode: 0xF5, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'SBC', regex: R.ABSOLUTE,    opcode: 0xED, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'SBC', regex: R.ABSOLUTE_X,  opcode: 0xFD, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'SBC', regex: R.ABSOLUTE_Y,  opcode: 0xF9, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'SBC', regex: R.INDIRECT_X,  opcode: 0xE1, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'SBC', regex: R.INDIRECT_Y,  opcode: 0xF1, size: 2, resolveOperand: resolveIndirectY },

  // Comparisons
  { mnemonic: 'CMP', regex: R.IMMEDIATE,   opcode: 0xC9, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'CMP', regex: R.ZEROPAGE,    opcode: 0xC5, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'CMP', regex: R.ZEROPAGE_X,  opcode: 0xD5, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'CMP', regex: R.ABSOLUTE,    opcode: 0xCD, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'CMP', regex: R.ABSOLUTE_X,  opcode: 0xDD, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'CMP', regex: R.ABSOLUTE_Y,  opcode: 0xD9, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'CMP', regex: R.INDIRECT_X,  opcode: 0xC1, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'CMP', regex: R.INDIRECT_Y,  opcode: 0xD1, size: 2, resolveOperand: resolveIndirectY },

  { mnemonic: 'CPX', regex: R.IMMEDIATE,   opcode: 0xE0, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'CPX', regex: R.ZEROPAGE,    opcode: 0xE4, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'CPX', regex: R.ABSOLUTE,    opcode: 0xEC, size: 3, resolveOperand: resolveAbsolute },

  { mnemonic: 'CPY', regex: R.IMMEDIATE,   opcode: 0xC0, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'CPY', regex: R.ZEROPAGE,    opcode: 0xC4, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'CPY', regex: R.ABSOLUTE,    opcode: 0xCC, size: 3, resolveOperand: resolveAbsolute },

  // Increments/Decrements
  { mnemonic: 'INC', regex: R.ZEROPAGE,    opcode: 0xE6, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'INC', regex: R.ZEROPAGE_X,  opcode: 0xF6, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'INC', regex: R.ABSOLUTE,    opcode: 0xEE, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'INC', regex: R.ABSOLUTE_X,  opcode: 0xFE, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'INX', regex: R.IMPLIED,     opcode: 0xE8, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'INY', regex: R.IMPLIED,     opcode: 0xC8, size: 1, resolveOperand: resolveImplied },

  { mnemonic: 'DEC', regex: R.ZEROPAGE,    opcode: 0xC6, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'DEC', regex: R.ZEROPAGE_X,  opcode: 0xD6, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'DEC', regex: R.ABSOLUTE,    opcode: 0xCE, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'DEC', regex: R.ABSOLUTE_X,  opcode: 0xDE, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'DEX', regex: R.IMPLIED,     opcode: 0xCA, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'DEY', regex: R.IMPLIED,     opcode: 0x88, size: 1, resolveOperand: resolveImplied },

  // Shifts & Rotates
  { mnemonic: 'ASL', regex: R.ACCUMULATOR, opcode: 0x0A, size: 1, resolveOperand: resolveAccumulator },
  { mnemonic: 'ASL', regex: R.ZEROPAGE,    opcode: 0x06, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'ASL', regex: R.ZEROPAGE_X,  opcode: 0x16, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'ASL', regex: R.ABSOLUTE,    opcode: 0x0E, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'ASL', regex: R.ABSOLUTE_X,  opcode: 0x1E, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },

  { mnemonic: 'LSR', regex: R.ACCUMULATOR, opcode: 0x4A, size: 1, resolveOperand: resolveAccumulator },
  { mnemonic: 'LSR', regex: R.ZEROPAGE,    opcode: 0x46, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'LSR', regex: R.ZEROPAGE_X,  opcode: 0x56, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'LSR', regex: R.ABSOLUTE,    opcode: 0x4E, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'LSR', regex: R.ABSOLUTE_X,  opcode: 0x5E, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },

  { mnemonic: 'ROL', regex: R.ACCUMULATOR, opcode: 0x2A, size: 1, resolveOperand: resolveAccumulator },
  { mnemonic: 'ROL', regex: R.ZEROPAGE,    opcode: 0x26, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'ROL', regex: R.ZEROPAGE_X,  opcode: 0x36, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'ROL', regex: R.ABSOLUTE,    opcode: 0x2E, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'ROL', regex: R.ABSOLUTE_X,  opcode: 0x3E, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },

  { mnemonic: 'ROR', regex: R.ACCUMULATOR, opcode: 0x6A, size: 1, resolveOperand: resolveAccumulator },
  { mnemonic: 'ROR', regex: R.ZEROPAGE,    opcode: 0x66, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'ROR', regex: R.ZEROPAGE_X,  opcode: 0x76, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'ROR', regex: R.ABSOLUTE,    opcode: 0x6E, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'ROR', regex: R.ABSOLUTE_X,  opcode: 0x7E, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },

  // Logical
  { mnemonic: 'AND', regex: R.IMMEDIATE,   opcode: 0x29, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'AND', regex: R.ZEROPAGE,    opcode: 0x25, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'AND', regex: R.ZEROPAGE_X,  opcode: 0x35, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'AND', regex: R.ABSOLUTE,    opcode: 0x2D, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'AND', regex: R.ABSOLUTE_X,  opcode: 0x3D, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'AND', regex: R.ABSOLUTE_Y,  opcode: 0x39, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'AND', regex: R.INDIRECT_X,  opcode: 0x21, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'AND', regex: R.INDIRECT_Y,  opcode: 0x31, size: 2, resolveOperand: resolveIndirectY },

  { mnemonic: 'EOR', regex: R.IMMEDIATE,   opcode: 0x49, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'EOR', regex: R.ZEROPAGE,    opcode: 0x45, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'EOR', regex: R.ZEROPAGE_X,  opcode: 0x55, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'EOR', regex: R.ABSOLUTE,    opcode: 0x4D, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'EOR', regex: R.ABSOLUTE_X,  opcode: 0x5D, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'EOR', regex: R.ABSOLUTE_Y,  opcode: 0x59, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'EOR', regex: R.INDIRECT_X,  opcode: 0x41, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'EOR', regex: R.INDIRECT_Y,  opcode: 0x51, size: 2, resolveOperand: resolveIndirectY },

  { mnemonic: 'ORA', regex: R.IMMEDIATE,   opcode: 0x09, size: 2, resolveOperand: resolveImmediate },
  { mnemonic: 'ORA', regex: R.ZEROPAGE,    opcode: 0x05, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'ORA', regex: R.ZEROPAGE_X,  opcode: 0x15, size: 2, resolveOperand: resolveZeroPageIndexed('X') },
  { mnemonic: 'ORA', regex: R.ABSOLUTE,    opcode: 0x0D, size: 3, resolveOperand: resolveAbsolute },
  { mnemonic: 'ORA', regex: R.ABSOLUTE_X,  opcode: 0x1D, size: 3, resolveOperand: resolveAbsoluteIndexed('X') },
  { mnemonic: 'ORA', regex: R.ABSOLUTE_Y,  opcode: 0x19, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') },
  { mnemonic: 'ORA', regex: R.INDIRECT_X,  opcode: 0x01, size: 2, resolveOperand: resolveIndirectX },
  { mnemonic: 'ORA', regex: R.INDIRECT_Y,  opcode: 0x11, size: 2, resolveOperand: resolveIndirectY },
  
  // Bit Test
  { mnemonic: 'BIT', regex: R.ZEROPAGE,    opcode: 0x24, size: 2, resolveOperand: resolveZeroPage },
  { mnemonic: 'BIT', regex: R.ABSOLUTE,    opcode: 0x2C, size: 3, resolveOperand: resolveAbsolute },

  // Status Flag Instructions
  { mnemonic: 'CLC', regex: R.IMPLIED, opcode: 0x18, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'SEC', regex: R.IMPLIED, opcode: 0x38, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'CLI', regex: R.IMPLIED, opcode: 0x58, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'SEI', regex: R.IMPLIED, opcode: 0x78, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'CLD', regex: R.IMPLIED, opcode: 0xD8, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'SED', regex: R.IMPLIED, opcode: 0xF8, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'CLV', regex: R.IMPLIED, opcode: 0xB8, size: 1, resolveOperand: resolveImplied },

  // Transfer
  { mnemonic: 'TAX', regex: R.IMPLIED, opcode: 0xAA, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'TXA', regex: R.IMPLIED, opcode: 0x8A, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'TAY', regex: R.IMPLIED, opcode: 0xA8, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'TYA', regex: R.IMPLIED, opcode: 0x98, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'TSX', regex: R.IMPLIED, opcode: 0xBA, size: 1, resolveOperand: resolveImplied },
  { mnemonic: 'TXS', regex: R.IMPLIED, opcode: 0x9A, size: 1, resolveOperand: resolveImplied },
];
