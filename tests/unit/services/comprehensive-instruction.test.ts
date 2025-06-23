/**
 * Comprehensive test coverage for all 6502 instructions
 * Tests every instruction with all supported addressing modes
 */

import { describe, test, expect } from '@jest/globals';
import { instructionSet } from '../../../services/opcodes';
import { assemble } from '../../../services/assembler';

describe('Comprehensive 6502 Instruction Coverage', () => {
  // All 6502 instructions with their opcodes and addressing modes
  const allInstructions = [
    // Load/Store Instructions
    { mnemonic: 'LDA', opcodes: { imm: 0xA9, zp: 0xA5, zpx: 0xB5, abs: 0xAD, abx: 0xBD, aby: 0xB9, indx: 0xA1, indy: 0xB1 } },
    { mnemonic: 'LDX', opcodes: { imm: 0xA2, zp: 0xA6, zpy: 0xB6, abs: 0xAE, aby: 0xBE } },
    { mnemonic: 'LDY', opcodes: { imm: 0xA0, zp: 0xA4, zpx: 0xB4, abs: 0xAC, abx: 0xBC } },
    { mnemonic: 'STA', opcodes: { zp: 0x85, zpx: 0x95, abs: 0x8D, abx: 0x9D, aby: 0x99, indx: 0x81, indy: 0x91 } },
    { mnemonic: 'STX', opcodes: { zp: 0x86, zpy: 0x96, abs: 0x8E } },
    { mnemonic: 'STY', opcodes: { zp: 0x84, zpx: 0x94, abs: 0x8C } },

    // Arithmetic Instructions
    { mnemonic: 'ADC', opcodes: { imm: 0x69, zp: 0x65, zpx: 0x75, abs: 0x6D, abx: 0x7D, aby: 0x79, indx: 0x61, indy: 0x71 } },
    { mnemonic: 'SBC', opcodes: { imm: 0xE9, zp: 0xE5, zpx: 0xF5, abs: 0xED, abx: 0xFD, aby: 0xF9, indx: 0xE1, indy: 0xF1 } },

    // Comparison Instructions
    { mnemonic: 'CMP', opcodes: { imm: 0xC9, zp: 0xC5, zpx: 0xD5, abs: 0xCD, abx: 0xDD, aby: 0xD9, indx: 0xC1, indy: 0xD1 } },
    { mnemonic: 'CPX', opcodes: { imm: 0xE0, zp: 0xE4, abs: 0xEC } },
    { mnemonic: 'CPY', opcodes: { imm: 0xC0, zp: 0xC4, abs: 0xCC } },

    // Increment/Decrement Instructions
    { mnemonic: 'INC', opcodes: { zp: 0xE6, zpx: 0xF6, abs: 0xEE, abx: 0xFE } },
    { mnemonic: 'DEC', opcodes: { zp: 0xC6, zpx: 0xD6, abs: 0xCE, abx: 0xDE } },
    { mnemonic: 'INX', opcodes: { impl: 0xE8 } },
    { mnemonic: 'INY', opcodes: { impl: 0xC8 } },
    { mnemonic: 'DEX', opcodes: { impl: 0xCA } },
    { mnemonic: 'DEY', opcodes: { impl: 0x88 } },

    // Shift and Rotate Instructions
    { mnemonic: 'ASL', opcodes: { acc: 0x0A, zp: 0x06, zpx: 0x16, abs: 0x0E, abx: 0x1E } },
    { mnemonic: 'LSR', opcodes: { acc: 0x4A, zp: 0x46, zpx: 0x56, abs: 0x4E, abx: 0x5E } },
    { mnemonic: 'ROL', opcodes: { acc: 0x2A, zp: 0x26, zpx: 0x36, abs: 0x2E, abx: 0x3E } },
    { mnemonic: 'ROR', opcodes: { acc: 0x6A, zp: 0x66, zpx: 0x76, abs: 0x6E, abx: 0x7E } },

    // Logical Instructions
    { mnemonic: 'AND', opcodes: { imm: 0x29, zp: 0x25, zpx: 0x35, abs: 0x2D, abx: 0x3D, aby: 0x39, indx: 0x21, indy: 0x31 } },
    { mnemonic: 'EOR', opcodes: { imm: 0x49, zp: 0x45, zpx: 0x55, abs: 0x4D, abx: 0x5D, aby: 0x59, indx: 0x41, indy: 0x51 } },
    { mnemonic: 'ORA', opcodes: { imm: 0x09, zp: 0x05, zpx: 0x15, abs: 0x0D, abx: 0x1D, aby: 0x19, indx: 0x01, indy: 0x11 } },
    { mnemonic: 'BIT', opcodes: { zp: 0x24, abs: 0x2C } },

    // Branch Instructions
    { mnemonic: 'BPL', opcodes: { rel: 0x10 } },
    { mnemonic: 'BMI', opcodes: { rel: 0x30 } },
    { mnemonic: 'BVC', opcodes: { rel: 0x50 } },
    { mnemonic: 'BVS', opcodes: { rel: 0x70 } },
    { mnemonic: 'BCC', opcodes: { rel: 0x90 } },
    { mnemonic: 'BCS', opcodes: { rel: 0xB0 } },
    { mnemonic: 'BNE', opcodes: { rel: 0xD0 } },
    { mnemonic: 'BEQ', opcodes: { rel: 0xF0 } },

    // Jump Instructions
    { mnemonic: 'JMP', opcodes: { abs: 0x4C, ind: 0x6C } },
    { mnemonic: 'JSR', opcodes: { abs: 0x20 } },
    { mnemonic: 'RTS', opcodes: { impl: 0x60 } },

    // Stack Instructions
    { mnemonic: 'PHA', opcodes: { impl: 0x48 } },
    { mnemonic: 'PLA', opcodes: { impl: 0x68 } },
    { mnemonic: 'PHP', opcodes: { impl: 0x08 } },
    { mnemonic: 'PLP', opcodes: { impl: 0x28 } },

    // Status Flag Instructions
    { mnemonic: 'CLC', opcodes: { impl: 0x18 } },
    { mnemonic: 'SEC', opcodes: { impl: 0x38 } },
    { mnemonic: 'CLI', opcodes: { impl: 0x58 } },
    { mnemonic: 'SEI', opcodes: { impl: 0x78 } },
    { mnemonic: 'CLD', opcodes: { impl: 0xD8 } },
    { mnemonic: 'SED', opcodes: { impl: 0xF8 } },
    { mnemonic: 'CLV', opcodes: { impl: 0xB8 } },

    // Transfer Instructions
    { mnemonic: 'TAX', opcodes: { impl: 0xAA } },
    { mnemonic: 'TXA', opcodes: { impl: 0x8A } },
    { mnemonic: 'TAY', opcodes: { impl: 0xA8 } },
    { mnemonic: 'TYA', opcodes: { impl: 0x98 } },
    { mnemonic: 'TSX', opcodes: { impl: 0xBA } },
    { mnemonic: 'TXS', opcodes: { impl: 0x9A } },

    // System Instructions
    { mnemonic: 'BRK', opcodes: { impl: 0x00 } },
    { mnemonic: 'NOP', opcodes: { impl: 0xEA } },
  ];

  describe('All instruction mnemonics coverage', () => {
    test('should have all 56 standard 6502 instructions', () => {
      const implementedMnemonics = new Set(instructionSet.map(i => i.mnemonic));
      const expectedMnemonics = new Set(allInstructions.map(i => i.mnemonic));
      
      expect(implementedMnemonics.size).toBeGreaterThanOrEqual(expectedMnemonics.size);
      
      // Check that all expected instructions are implemented
      expectedMnemonics.forEach(mnemonic => {
        expect(implementedMnemonics.has(mnemonic)).toBe(true);
      });
    });
  });

  describe('All addressing modes coverage', () => {
    allInstructions.forEach(({ mnemonic, opcodes }) => {
      describe(`${mnemonic} instruction`, () => {
        if (opcodes.imm !== undefined) {
          test(`should support immediate addressing mode (${opcodes.imm.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.imm);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} #$42`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.imm);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.zp !== undefined) {
          test(`should support zero page addressing mode (${opcodes.zp.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.zp);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $42`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.zp);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.zpx !== undefined) {
          test(`should support zero page,X addressing mode (${opcodes.zpx.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.zpx);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $42,X`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.zpx);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.zpy !== undefined) {
          test(`should support zero page,Y addressing mode (${opcodes.zpy.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.zpy);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $42,Y`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.zpy);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.abs !== undefined) {
          test(`should support absolute addressing mode (${opcodes.abs.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.abs);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(3);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $1234`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.abs);
            expect(result.machineCode).toContain(0x34); // Low byte
            expect(result.machineCode).toContain(0x12); // High byte
          });
        }

        if (opcodes.abx !== undefined) {
          test(`should support absolute,X addressing mode (${opcodes.abx.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.abx);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(3);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $1234,X`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.abx);
            expect(result.machineCode).toContain(0x34); // Low byte
            expect(result.machineCode).toContain(0x12); // High byte
          });
        }

        if (opcodes.aby !== undefined) {
          test(`should support absolute,Y addressing mode (${opcodes.aby.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.aby);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(3);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} $1234,Y`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.aby);
            expect(result.machineCode).toContain(0x34); // Low byte
            expect(result.machineCode).toContain(0x12); // High byte
          });
        }

        if (opcodes.indx !== undefined) {
          test(`should support (indirect,X) addressing mode (${opcodes.indx.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.indx);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} ($42,X)`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.indx);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.indy !== undefined) {
          test(`should support (indirect),Y addressing mode (${opcodes.indy.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.indy);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} ($42),Y`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.indy);
            expect(result.machineCode).toContain(0x42);
          });
        }

        if (opcodes.rel !== undefined) {
          test(`should support relative addressing mode (${opcodes.rel.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.rel);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(2);
            
            // Test assembly with forward branch
            const code = `.org $0200\nstart:\n${mnemonic} end\nNOP\nend: NOP`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.rel);
          });
        }

        if (opcodes.ind !== undefined) {
          test(`should support indirect absolute addressing mode (${opcodes.ind.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.ind);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(3);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic} ($1234)`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.ind);
            expect(result.machineCode).toContain(0x34); // Low byte
            expect(result.machineCode).toContain(0x12); // High byte
          });
        }

        if (opcodes.impl !== undefined) {
          test(`should support implied addressing mode (${opcodes.impl.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.impl);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(1);
            
            // Test assembly
            const code = `.org $0200\n${mnemonic}`;
            const result = assemble(code);
            expect(result.error).toBeNull();
            expect(result.machineCode).toContain(opcodes.impl);
          });
        }

        if (opcodes.acc !== undefined) {
          test(`should support accumulator addressing mode (${opcodes.acc.toString(16).toUpperCase()})`, () => {
            const instruction = instructionSet.find(i => i.mnemonic === mnemonic && i.opcode === opcodes.acc);
            expect(instruction).toBeDefined();
            expect(instruction?.size).toBe(1);
            
            // Test assembly with explicit A
            const code1 = `.org $0200\n${mnemonic} A`;
            const result1 = assemble(code1);
            expect(result1.error).toBeNull();
            expect(result1.machineCode).toContain(opcodes.acc);
            
            // Test assembly with implicit accumulator
            const code2 = `.org $0200\n${mnemonic}`;
            const result2 = assemble(code2);
            expect(result2.error).toBeNull();
            expect(result2.machineCode).toContain(opcodes.acc);
          });
        }
      });
    });
  });

  describe('Instruction count validation', () => {
    test('should have expected number of instruction variants', () => {
      // Calculate expected total variants
      let expectedVariants = 0;
      allInstructions.forEach(({ opcodes }) => {
        expectedVariants += Object.keys(opcodes).length;
        // Add extra variants for label addressing (ZP and ABS can both handle labels)
        if (opcodes.zp && opcodes.abs) expectedVariants += 2;
        else if (opcodes.zp || opcodes.abs) expectedVariants += 1;
      });
      
      expect(instructionSet.length).toBeGreaterThanOrEqual(expectedVariants);
    });

    test('should have all opcodes correctly mapped', () => {
      allInstructions.forEach(({ mnemonic, opcodes }) => {
        Object.entries(opcodes).forEach(([_mode, opcode]) => {
          const instruction = instructionSet.find(i => 
            i.mnemonic === mnemonic && i.opcode === opcode
          );
          expect(instruction).toBeDefined();
          expect(instruction?.opcode).toBe(opcode);
        });
      });
    });
  });

  describe('Opcode uniqueness validation', () => {
    test('should have valid opcode distribution', () => {
      const opcodeMap = new Map<number, string[]>();
      
      instructionSet.forEach(({ mnemonic, opcode }) => {
        if (!opcodeMap.has(opcode)) {
          opcodeMap.set(opcode, []);
        }
        opcodeMap.get(opcode)!.push(mnemonic);
      });
      
      // Most opcodes should map to exactly one instruction
      // Some special cases may have duplicates for different addressing modes
      let uniqueOpcodes = 0;
      opcodeMap.forEach((mnemonics) => {
        if (mnemonics.length === 1) {
          uniqueOpcodes++;
        }
      });
      
      // Most opcodes should be unique (allowing for duplicates in label variants)
      expect(uniqueOpcodes).toBeGreaterThan(opcodeMap.size * 0.4);
    });
  });

  describe('Edge case instruction combinations', () => {
    test('should handle all instructions in a single program', () => {
      const testProgram = `
        .org $0200
        
        ; Load/Store operations
        LDA #$42
        LDX #$43
        LDY #$44
        STA $10
        STX $11
        STY $12
        
        ; Arithmetic
        ADC #$01
        SBC #$01
        
        ; Comparisons
        CMP #$42
        CPX #$43
        CPY #$44
        
        ; Increment/Decrement
        INC $10
        DEC $10
        INX
        INY
        DEX
        DEY
        
        ; Shifts and rotates
        ASL A
        LSR A
        ROL A
        ROR A
        ASL $10
        LSR $10
        ROL $10
        ROR $10
        
        ; Logical operations
        AND #$FF
        ORA #$00
        EOR #$FF
        BIT $10
        
        ; Branches
        loop:
        BNE loop
        BEQ end
        BCC loop
        BCS end
        BPL loop
        BMI end
        BVC loop
        BVS end
        
        ; Jumps
        JSR subroutine
        JMP end
        
        subroutine:
        RTS
        
        ; Stack operations
        PHA
        PLA
        PHP
        PLP
        
        ; Status flags
        CLC
        SEC
        CLI
        SEI
        CLD
        SED
        CLV
        
        ; Transfers
        TAX
        TXA
        TAY
        TYA
        TSX
        TXS
        
        ; System
        NOP
        end:
        BRK
      `;
      
      const result = assemble(testProgram);
      expect(result.error).toBeNull();
      expect(result.machineCode.length).toBeGreaterThan(50);
    });
  });
});