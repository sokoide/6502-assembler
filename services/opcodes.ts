
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
  } else if (/^[0-9]+$/.test(opStr)) {
    value = parseInt(opStr, 10);
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
  } else if (/^[0-9]+$/.test(opStr)) {
    value = parseInt(opStr, 10);
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

// Helper function to determine if an operand resolves to zero page (not currently used)
/*
function isZeroPageOperand(opStr: string, labels: LabelMap): boolean {
  if (opStr.startsWith('$')) {
    const hexValue = parseInt(opStr.substring(1), 16);
    return !isNaN(hexValue) && hexValue <= 0xFF;
  } else if (/^[0-9]+$/.test(opStr)) {
    const decValue = parseInt(opStr, 10);
    return !isNaN(decValue) && decValue <= 0xFF;
  } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(opStr)) {
    const value = labels.get(opStr);
    return value !== undefined && value <= 0xFF;
  }
  return false;
}
*/

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
    } else if (/^[0-9]+$/.test(addressPart)) {
        value = parseInt(addressPart, 10);
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
    } else if (/^[0-9]+$/.test(addressPart)) {
        value = parseInt(addressPart, 10);
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
    const match = opStr.match(/^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*),X\)$/i);
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
    const match = opStr.match(/^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)\),Y$/i);
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
    const match = opStr.match(/^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)\)$/i);
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

// Regex for matching operands - order matters for disambiguation
const R = {
  ACCUMULATOR: /^(A)?$/i, // Matches 'A' or empty (for implied accumulator ops like ASL)
  IMMEDIATE: /^#.+$/, // Generic immediate, handled by resolveImmediate
  
  // Indexed addressing modes first (more specific)
  ZEROPAGE_X: /^(?:\$[0-9A-Fa-f]{1,2}|[0-9]{1,3}),X$/i, // $NN,X or decimal for ZP
  ZEROPAGE_Y: /^(?:\$[0-9A-Fa-f]{1,2}|[0-9]{1,3}),Y$/i, // $NN,Y or decimal for ZP
  ABSOLUTE_X: /^(?:\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*),X$/i, // $NNNN,X or LABEL,X
  ABSOLUTE_Y: /^(?:\$[0-9A-Fa-f]{3,4}|[A-Za-z_][A-Za-z0-9_]*),Y$/i, // $NNNN,Y or LABEL,Y
  
  // Indirect addressing modes
  INDIRECT_X: /^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*),X\)$/i, // ($NN,X) or (LABEL,X)
  INDIRECT_Y: /^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)\),Y$/i, // ($NN),Y or (LABEL),Y
  INDIRECT_ABS: /^\((\$[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9_]*)\)$/i, // ($NNNN) or (LABEL)
  
  // Direct addressing modes - Zero page must come before absolute for hex disambiguation
  ZEROPAGE: /^\$[0-9A-Fa-f]{1,2}$/, // $NN only (1-2 hex digits)
  ABSOLUTE: /^\$[0-9A-Fa-f]{3,4}$/, // $NNNN only (3-4 hex digits)
  
  // Label addressing - need to resolve during assembly to determine ZP vs ABS
  LABEL: /^[A-Za-z_][A-Za-z0-9_]*$/, // Label for any addressing mode
  RELATIVE: /^[A-Za-z_][A-Za-z0-9_]*$/, // Label for branches (same as LABEL)
  IMPLIED: /^$/, // No operand
};

/**
 * Creates instruction variants for a given mnemonic with all supported addressing modes
 * @param mnemonic - The instruction mnemonic (e.g., 'LDA', 'STA')
 * @param opcodes - Object mapping addressing mode abbreviations to opcodes
 * @returns Array of InstructionVariant objects
 */
const createInstructionVariants = (mnemonic: string, opcodes: { 
  imm?: number, zp?: number, zpx?: number, zpy?: number, 
  abs?: number, abx?: number, aby?: number, 
  indx?: number, indy?: number, impl?: number, acc?: number 
}) => {
  const variants: InstructionVariant[] = [];
  
  if (opcodes.imm !== undefined) variants.push({ mnemonic, regex: R.IMMEDIATE, opcode: opcodes.imm, size: 2, resolveOperand: resolveImmediate });
  if (opcodes.indx !== undefined) variants.push({ mnemonic, regex: R.INDIRECT_X, opcode: opcodes.indx, size: 2, resolveOperand: resolveIndirectX });
  if (opcodes.indy !== undefined) variants.push({ mnemonic, regex: R.INDIRECT_Y, opcode: opcodes.indy, size: 2, resolveOperand: resolveIndirectY });
  if (opcodes.zpx !== undefined) variants.push({ mnemonic, regex: R.ZEROPAGE_X, opcode: opcodes.zpx, size: 2, resolveOperand: resolveZeroPageIndexed('X') });
  if (opcodes.zpy !== undefined) variants.push({ mnemonic, regex: R.ZEROPAGE_Y, opcode: opcodes.zpy, size: 2, resolveOperand: resolveZeroPageIndexed('Y') });
  if (opcodes.abx !== undefined) variants.push({ mnemonic, regex: R.ABSOLUTE_X, opcode: opcodes.abx, size: 3, resolveOperand: resolveAbsoluteIndexed('X') });
  if (opcodes.aby !== undefined) variants.push({ mnemonic, regex: R.ABSOLUTE_Y, opcode: opcodes.aby, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') });
  if (opcodes.zp !== undefined) variants.push({ mnemonic, regex: R.ZEROPAGE, opcode: opcodes.zp, size: 2, resolveOperand: resolveZeroPage });
  if (opcodes.abs !== undefined) variants.push({ mnemonic, regex: R.ABSOLUTE, opcode: opcodes.abs, size: 3, resolveOperand: resolveAbsolute });
  if (opcodes.impl !== undefined) variants.push({ mnemonic, regex: R.IMPLIED, opcode: opcodes.impl, size: 1, resolveOperand: resolveImplied });
  if (opcodes.acc !== undefined) variants.push({ mnemonic, regex: R.ACCUMULATOR, opcode: opcodes.acc, size: 1, resolveOperand: resolveAccumulator });
  
  // Add label variants for ZP and ABS if both are supported
  if (opcodes.zp !== undefined && opcodes.abs !== undefined) {
    variants.push({ mnemonic, regex: R.LABEL, opcode: opcodes.zp, size: 2, resolveOperand: resolveZeroPage });
    variants.push({ mnemonic, regex: R.LABEL, opcode: opcodes.abs, size: 3, resolveOperand: resolveAbsolute });
  } else if (opcodes.zp !== undefined) {
    variants.push({ mnemonic, regex: R.LABEL, opcode: opcodes.zp, size: 2, resolveOperand: resolveZeroPage });
  } else if (opcodes.abs !== undefined) {
    variants.push({ mnemonic, regex: R.LABEL, opcode: opcodes.abs, size: 3, resolveOperand: resolveAbsolute });
  }
  
  // Add label variants for indexed addressing
  if (opcodes.zpx !== undefined && opcodes.abx !== undefined) {
    variants.push({ mnemonic, regex: /^[A-Za-z_][A-Za-z0-9_]*,X$/i, opcode: opcodes.zpx, size: 2, resolveOperand: resolveZeroPageIndexed('X') });
    variants.push({ mnemonic, regex: /^[A-Za-z_][A-Za-z0-9_]*,X$/i, opcode: opcodes.abx, size: 3, resolveOperand: resolveAbsoluteIndexed('X') });
  }
  if (opcodes.zpy !== undefined && opcodes.aby !== undefined) {
    variants.push({ mnemonic, regex: /^[A-Za-z_][A-Za-z0-9_]*,Y$/i, opcode: opcodes.zpy, size: 2, resolveOperand: resolveZeroPageIndexed('Y') });
    variants.push({ mnemonic, regex: /^[A-Za-z_][A-Za-z0-9_]*,Y$/i, opcode: opcodes.aby, size: 3, resolveOperand: resolveAbsoluteIndexed('Y') });
  }
  
  return variants;
};

export const instructionSet: InstructionVariant[] = [
  // Load/Store instructions
  ...createInstructionVariants('LDA', { imm: 0xA9, zp: 0xA5, zpx: 0xB5, abs: 0xAD, abx: 0xBD, aby: 0xB9, indx: 0xA1, indy: 0xB1 }),
  ...createInstructionVariants('LDX', { imm: 0xA2, zp: 0xA6, zpy: 0xB6, abs: 0xAE, aby: 0xBE }),
  ...createInstructionVariants('LDY', { imm: 0xA0, zp: 0xA4, zpx: 0xB4, abs: 0xAC, abx: 0xBC }),
  ...createInstructionVariants('STA', { zp: 0x85, zpx: 0x95, abs: 0x8D, abx: 0x9D, aby: 0x99, indx: 0x81, indy: 0x91 }),
  ...createInstructionVariants('STX', { zp: 0x86, zpy: 0x96, abs: 0x8E }),
  ...createInstructionVariants('STY', { zp: 0x84, zpx: 0x94, abs: 0x8C }),
  
  // Stack Operations
  ...createInstructionVariants('PHA', { impl: 0x48 }),
  ...createInstructionVariants('PLA', { impl: 0x68 }),
  ...createInstructionVariants('PHP', { impl: 0x08 }),
  ...createInstructionVariants('PLP', { impl: 0x28 }),

  // Control Flow
  ...createInstructionVariants('JMP', { abs: 0x4C }),
  { mnemonic: 'JMP', regex: R.INDIRECT_ABS, opcode: 0x6C, size: 3, resolveOperand: resolveIndirectAbsolute },
  ...createInstructionVariants('JSR', { abs: 0x20 }),
  ...createInstructionVariants('RTS', { impl: 0x60 }),
  ...createInstructionVariants('BRK', { impl: 0x00 }),
  ...createInstructionVariants('NOP', { impl: 0xEA }),

  // Branch instructions
  { mnemonic: 'BPL', regex: R.RELATIVE, opcode: 0x10, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BMI', regex: R.RELATIVE, opcode: 0x30, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BVC', regex: R.RELATIVE, opcode: 0x50, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BVS', regex: R.RELATIVE, opcode: 0x70, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BCC', regex: R.RELATIVE, opcode: 0x90, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BCS', regex: R.RELATIVE, opcode: 0xB0, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BNE', regex: R.RELATIVE, opcode: 0xD0, size: 2, resolveOperand: resolveRelativeLabel },
  { mnemonic: 'BEQ', regex: R.RELATIVE, opcode: 0xF0, size: 2, resolveOperand: resolveRelativeLabel },

  // Arithmetic
  ...createInstructionVariants('ADC', { imm: 0x69, zp: 0x65, zpx: 0x75, abs: 0x6D, abx: 0x7D, aby: 0x79, indx: 0x61, indy: 0x71 }),
  ...createInstructionVariants('SBC', { imm: 0xE9, zp: 0xE5, zpx: 0xF5, abs: 0xED, abx: 0xFD, aby: 0xF9, indx: 0xE1, indy: 0xF1 }),

  // Comparisons
  ...createInstructionVariants('CMP', { imm: 0xC9, zp: 0xC5, zpx: 0xD5, abs: 0xCD, abx: 0xDD, aby: 0xD9, indx: 0xC1, indy: 0xD1 }),
  ...createInstructionVariants('CPX', { imm: 0xE0, zp: 0xE4, abs: 0xEC }),
  ...createInstructionVariants('CPY', { imm: 0xC0, zp: 0xC4, abs: 0xCC }),

  // Increment/Decrement
  ...createInstructionVariants('INC', { zp: 0xE6, zpx: 0xF6, abs: 0xEE, abx: 0xFE }),
  ...createInstructionVariants('DEC', { zp: 0xC6, zpx: 0xD6, abs: 0xCE, abx: 0xDE }),
  ...createInstructionVariants('INX', { impl: 0xE8 }),
  ...createInstructionVariants('INY', { impl: 0xC8 }),
  ...createInstructionVariants('DEX', { impl: 0xCA }),
  ...createInstructionVariants('DEY', { impl: 0x88 }),

  // Shifts & Rotates
  ...createInstructionVariants('ASL', { acc: 0x0A, zp: 0x06, zpx: 0x16, abs: 0x0E, abx: 0x1E }),
  ...createInstructionVariants('LSR', { acc: 0x4A, zp: 0x46, zpx: 0x56, abs: 0x4E, abx: 0x5E }),
  ...createInstructionVariants('ROL', { acc: 0x2A, zp: 0x26, zpx: 0x36, abs: 0x2E, abx: 0x3E }),
  ...createInstructionVariants('ROR', { acc: 0x6A, zp: 0x66, zpx: 0x76, abs: 0x6E, abx: 0x7E }),

  // Logical
  ...createInstructionVariants('AND', { imm: 0x29, zp: 0x25, zpx: 0x35, abs: 0x2D, abx: 0x3D, aby: 0x39, indx: 0x21, indy: 0x31 }),
  ...createInstructionVariants('EOR', { imm: 0x49, zp: 0x45, zpx: 0x55, abs: 0x4D, abx: 0x5D, aby: 0x59, indx: 0x41, indy: 0x51 }),
  ...createInstructionVariants('ORA', { imm: 0x09, zp: 0x05, zpx: 0x15, abs: 0x0D, abx: 0x1D, aby: 0x19, indx: 0x01, indy: 0x11 }),

  // Bit Test
  ...createInstructionVariants('BIT', { zp: 0x24, abs: 0x2C }),

  // Status Flag Instructions
  ...createInstructionVariants('CLC', { impl: 0x18 }),
  ...createInstructionVariants('SEC', { impl: 0x38 }),
  ...createInstructionVariants('CLI', { impl: 0x58 }),
  ...createInstructionVariants('SEI', { impl: 0x78 }),
  ...createInstructionVariants('CLD', { impl: 0xD8 }),
  ...createInstructionVariants('SED', { impl: 0xF8 }),
  ...createInstructionVariants('CLV', { impl: 0xB8 }),

  // Transfer Instructions
  ...createInstructionVariants('TAX', { impl: 0xAA }),
  ...createInstructionVariants('TXA', { impl: 0x8A }),
  ...createInstructionVariants('TAY', { impl: 0xA8 }),
  ...createInstructionVariants('TYA', { impl: 0x98 }),
  ...createInstructionVariants('TSX', { impl: 0xBA }),
  ...createInstructionVariants('TXS', { impl: 0x9A })
];
