
import type { InstructionVariant } from './services/opcodes';

export type LabelMap = Map<string, number>;

export interface ParsedLineBase {
  lineNumber: number;
  originalLine: string;
  address: number; // Address at which this line's code/data would start, or value for EQU
}

export interface ParsedInstructionLine extends ParsedLineBase {
  type: 'instruction';
  mnemonic: string;
  operand: string;
  variant: InstructionVariant;
}

export interface ParsedLabelDefinitionLine extends ParsedLineBase { // For labels on their own line or before an instruction/data
  type: 'label';
  label: string;
}

export interface ParsedOrgDirectiveLine extends ParsedLineBase {
  type: 'directive';
  directive: 'ORG';
  value: number; // Address for ORG
}

export interface ParsedEquDirectiveLine extends ParsedLineBase {
  type: 'directive';
  directive: 'EQU';
  label: string; // The label being defined
  value: number; // The constant value
}

export interface ParsedResDirectiveLine extends ParsedLineBase {
  type: 'directive';
  directive: '.res';
  label?: string; // Optional label preceding .res
  size: number;   // Number of bytes to reserve
}

export interface ParsedByteDirectiveLine extends ParsedLineBase {
  type: 'directive';
  directive: '.byte';
  label?: string; // Optional label preceding .byte
  values: number[]; // Array of byte values
}

export interface ParsedCommentOrEmptyLine extends ParsedLineBase {
    type: 'comment' | 'empty';
}


export type ParsedDirectiveLine = ParsedOrgDirectiveLine | ParsedEquDirectiveLine | ParsedResDirectiveLine | ParsedByteDirectiveLine;
export type ParsedLine = ParsedInstructionLine | ParsedLabelDefinitionLine | ParsedDirectiveLine | ParsedCommentOrEmptyLine;


export interface AssembleResult {
  machineCode: number[];
  error: string | null;
}
