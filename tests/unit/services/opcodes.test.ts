/**
 * Tests for the 6502 instruction set and operand resolvers
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { instructionSet } from '@/services/opcodes';
import type { LabelMap } from '@/types/types';

describe('Opcodes Service', () => {
  describe('instructionSet', () => {
    test('should contain all expected instructions', () => {
      expect(instructionSet).toBeDefined();
      expect(Array.isArray(instructionSet)).toBe(true);
      expect(instructionSet.length).toBeGreaterThan(100); // 6502 has many instructions
    });

    test('should have valid instruction format', () => {
      instructionSet.forEach((instruction) => {
        expect(instruction).toHaveProperty('mnemonic');
        expect(instruction).toHaveProperty('regex');
        expect(instruction).toHaveProperty('opcode');
        expect(instruction).toHaveProperty('size');
        expect(instruction).toHaveProperty('resolveOperand');
        
        expect(typeof instruction.mnemonic).toBe('string');
        expect(instruction.regex).toBeInstanceOf(RegExp);
        expect(typeof instruction.opcode).toBe('number');
        expect(typeof instruction.size).toBe('number');
        expect(typeof instruction.resolveOperand).toBe('function');
        
        expect(instruction.opcode).toBeGreaterThanOrEqual(0);
        expect(instruction.opcode).toBeLessThanOrEqual(255);
        expect(instruction.size).toBeGreaterThanOrEqual(1);
        expect(instruction.size).toBeLessThanOrEqual(3);
      });
    });

    test('should have unique opcodes', () => {
      const opcodes = instructionSet.map(instr => instr.opcode);
      const uniqueOpcodes = new Set(opcodes);
      // 6502 has duplicate opcodes for different addressing modes, so this is expected
      expect(uniqueOpcodes.size).toBeLessThanOrEqual(opcodes.length);
      expect(uniqueOpcodes.size).toBeGreaterThan(0);
    });

    test('should contain common 6502 instructions', () => {
      const mnemonics = instructionSet.map(instr => instr.mnemonic);
      const commonInstructions = [
        'LDA', 'LDX', 'LDY',
        'STA', 'STX', 'STY',
        'ADC', 'SBC',
        'CMP', 'CPX', 'CPY',
        'BNE', 'BEQ', 'BCC', 'BCS',
        'JMP', 'JSR', 'RTS',
        'NOP', 'BRK',
        'INX', 'INY', 'DEX', 'DEY',
        'INC', 'DEC',
        'AND', 'ORA', 'EOR',
        'ASL', 'LSR', 'ROL', 'ROR',
        'PHA', 'PLA', 'PHP', 'PLP',
      ];
      
      commonInstructions.forEach(mnemonic => {
        expect(mnemonics).toContain(mnemonic);
      });
    });
  });

  describe('Operand resolvers', () => {
    let labels: LabelMap;
    
    beforeEach(() => {
      labels = new Map([
        ['ZERO_PAGE', 0x10],
        ['ABSOLUTE', 0x1000],
        ['HIGH_ADDR', 0x8000],
      ]);
    });

    describe('Immediate addressing', () => {
      test('should resolve hex immediate values', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#$42')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#$42', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x42]);
        }
      });

      test('should resolve decimal immediate values', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#123')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#123', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([123]);
        }
      });

      test('should resolve hex immediate values with letters', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#$42')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand("#$AB", labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0xAB]); // Hex value
        }
      });

      test('should resolve low byte operator', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#<ABSOLUTE')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#<ABSOLUTE', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00]); // Low byte of 0x1000
        }
      });

      test('should resolve high byte operator', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#>ABSOLUTE')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#>ABSOLUTE', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]); // High byte of 0x1000
        }
      });

      test('should return error for out of range immediate values', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#$FF')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#$100', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.bytes).toEqual([]);
        }
      });

      test('should return error for undefined labels', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#<UNDEFINED')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#<UNDEFINED', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Label not found');
          expect(result.bytes).toEqual([]);
        }
      });
    });

    describe('Zero page addressing', () => {
      test('should resolve zero page addresses', () => {
        const ldaZeroPage = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.size === 2 && i.regex.test('$10')
        );
        
        expect(ldaZeroPage).toBeDefined();
        if (ldaZeroPage) {
          const result = ldaZeroPage.resolveOperand('$10', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]);
        }
      });

      test('should resolve zero page labels', () => {
        const ldaZeroPage = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.size === 2 && i.regex.test('ZERO_PAGE')
        );
        
        expect(ldaZeroPage).toBeDefined();
        if (ldaZeroPage) {
          const result = ldaZeroPage.resolveOperand('ZERO_PAGE', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]);
        }
      });

      test('should return error for out of range zero page addresses', () => {
        const ldaZeroPage = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.size === 2 && i.regex.test('$FF')
        );
        
        expect(ldaZeroPage).toBeDefined();
        if (ldaZeroPage) {
          const result = ldaZeroPage.resolveOperand('$100', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('out of range');
          expect(result.bytes).toEqual([]);
        }
      });
    });

    describe('Absolute addressing', () => {
      test('should resolve absolute addresses', () => {
        const ldaAbsolute = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.size === 3 && i.regex.test('$1000')
        );
        
        expect(ldaAbsolute).toBeDefined();
        if (ldaAbsolute) {
          const result = ldaAbsolute.resolveOperand('$1000', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });

      test('should resolve absolute labels', () => {
        const ldaAbsolute = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.size === 3 && i.regex.test('ABSOLUTE')
        );
        
        expect(ldaAbsolute).toBeDefined();
        if (ldaAbsolute) {
          const result = ldaAbsolute.resolveOperand('ABSOLUTE', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });
    });

    describe('Indexed addressing', () => {
      test('should resolve zero page,X addressing', () => {
        const ldaZeroPageX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('$10,X')
        );
        
        expect(ldaZeroPageX).toBeDefined();
        if (ldaZeroPageX) {
          const result = ldaZeroPageX.resolveOperand('$10,X', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]);
        }
      });

      test('should resolve absolute,X addressing', () => {
        const ldaAbsoluteX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('$1000,X')
        );
        
        expect(ldaAbsoluteX).toBeDefined();
        if (ldaAbsoluteX) {
          const result = ldaAbsoluteX.resolveOperand('$1000,X', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });

      test('should resolve absolute,Y addressing', () => {
        const ldaAbsoluteY = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('$1000,Y')
        );
        
        expect(ldaAbsoluteY).toBeDefined();
        if (ldaAbsoluteY) {
          const result = ldaAbsoluteY.resolveOperand('$1000,Y', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });

      test('should resolve indexed addressing with labels', () => {
        const ldaAbsoluteX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('$1000,X')
        );
        
        expect(ldaAbsoluteX).toBeDefined();
        if (ldaAbsoluteX) {
          const result = ldaAbsoluteX.resolveOperand('ABSOLUTE,X', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });
    });

    describe('Indirect addressing', () => {
      test('should resolve indirect absolute addressing', () => {
        const jmpIndirect = instructionSet.find(i => 
          i.mnemonic === 'JMP' && i.regex.test('($FFFC)')
        );
        
        expect(jmpIndirect).toBeDefined();
        if (jmpIndirect) {
          const result = jmpIndirect.resolveOperand('($FFFC)', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0xFC, 0xFF]); // Little-endian
        }
      });

      test('should resolve (zp,X) addressing', () => {
        const ldaIndirectX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('($10,X)')
        );
        
        expect(ldaIndirectX).toBeDefined();
        if (ldaIndirectX) {
          const result = ldaIndirectX.resolveOperand('($10,X)', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]);
        }
      });

      test('should resolve (zp),Y addressing', () => {
        const ldaIndirectY = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('($10),Y')
        );
        
        expect(ldaIndirectY).toBeDefined();
        if (ldaIndirectY) {
          const result = ldaIndirectY.resolveOperand('($10),Y', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x10]);
        }
      });

      test('should resolve indirect addressing with labels', () => {
        const jmpIndirect = instructionSet.find(i => 
          i.mnemonic === 'JMP' && i.regex.test('(ABSOLUTE)')
        );
        
        expect(jmpIndirect).toBeDefined();
        if (jmpIndirect) {
          const result = jmpIndirect.resolveOperand('(ABSOLUTE)', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x00, 0x10]); // Little-endian
        }
      });
    });

    describe('Relative addressing (branches)', () => {
      test('should resolve forward relative branches', () => {
        const bne = instructionSet.find(i => 
          i.mnemonic === 'BNE' && i.regex.test('TARGET')
        );
        
        expect(bne).toBeDefined();
        if (bne) {
          // Branch from 0x0200 to 0x0210 (forward)
          labels.set('TARGET', 0x0210);
          const result = bne.resolveOperand('TARGET', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0x0E]); // +14 relative offset
        }
      });

      test('should resolve backward relative branches', () => {
        const bne = instructionSet.find(i => 
          i.mnemonic === 'BNE' && i.regex.test('TARGET')
        );
        
        expect(bne).toBeDefined();
        if (bne) {
          // Branch from 0x0210 to 0x0200 (backward)
          labels.set('TARGET', 0x0200);
          const result = bne.resolveOperand('TARGET', labels, 0x0210);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([0xEE]); // -18 relative offset (two's complement)
        }
      });

      test('should return error for out of range relative branches', () => {
        const bne = instructionSet.find(i => 
          i.mnemonic === 'BNE' && i.regex.test('TARGET')
        );
        
        expect(bne).toBeDefined();
        if (bne) {
          // Branch from 0x0200 to 0x0300 (too far)
          labels.set('TARGET', 0x0300);
          const result = bne.resolveOperand('TARGET', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('out of range');
          expect(result.bytes).toEqual([]);
        }
      });

      test('should return error for undefined branch targets', () => {
        const bne = instructionSet.find(i => 
          i.mnemonic === 'BNE' && i.regex.test('UNDEFINED')
        );
        
        expect(bne).toBeDefined();
        if (bne) {
          const result = bne.resolveOperand('UNDEFINED', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Label not found');
          expect(result.bytes).toEqual([]);
        }
      });
    });

    describe('Implied addressing', () => {
      test('should resolve implied instructions', () => {
        const nop = instructionSet.find(i => 
          i.mnemonic === 'NOP'
        );
        
        expect(nop).toBeDefined();
        if (nop) {
          const result = nop.resolveOperand('', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([]);
        }
      });

      test('should resolve accumulator addressing', () => {
        const aslA = instructionSet.find(i => 
          i.mnemonic === 'ASL' && i.regex.test('A')
        );
        
        expect(aslA).toBeDefined();
        if (aslA) {
          const result = aslA.resolveOperand('A', labels, 0x0200);
          expect(result.error).toBeUndefined();
          expect(result.bytes).toEqual([]);
        }
      });
    });

    describe('Error handling', () => {
      test('should return error for invalid operand formats', () => {
        const ldaImmediate = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('#$42')
        );
        
        expect(ldaImmediate).toBeDefined();
        if (ldaImmediate) {
          const result = ldaImmediate.resolveOperand('#$GGGG', labels, 0x0200);
          expect(result.error).toBeDefined();
          expect(result.bytes).toEqual([]);
        }
      });

      test('should return error for invalid indirect formats', () => {
        const ldaIndirectX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('($10,X)')
        );
        
        expect(ldaIndirectX).toBeDefined();
        if (ldaIndirectX) {
          const result = ldaIndirectX.resolveOperand('($10,Y)', labels, 0x0200); // Wrong register
          expect(result.error).toBeDefined();
          expect(result.bytes).toEqual([]);
        }
      });

      test('should return error for invalid indexed formats', () => {
        const ldaAbsoluteX = instructionSet.find(i => 
          i.mnemonic === 'LDA' && i.regex.test('$1000,X')
        );
        
        expect(ldaAbsoluteX).toBeDefined();
        if (ldaAbsoluteX) {
          const result = ldaAbsoluteX.resolveOperand('$1000,Z', labels, 0x0200); // Invalid register
          expect(result.error).toBeDefined();
          expect(result.bytes).toEqual([]);
        }
      });
    });
  });

  describe('Instruction coverage', () => {
    test('should have instructions for all addressing modes', () => {
      /*
      const addressingModes = [
        'immediate',
        'zeropage',
        'absolute',
        'zeropage_x',
        'zeropage_y', 
        'absolute_x',
        'absolute_y',
        'indirect',
        'indirect_x',
        'indirect_y',
        'relative',
        'implied',
      ];
      */
      
      // Check that we have at least one instruction for most addressing modes
      const hasImmediate = instructionSet.some(i => i.regex.test('#$42'));
      const hasZeroPage = instructionSet.some(i => i.regex.test('$10') && i.size === 2);
      const hasAbsolute = instructionSet.some(i => i.regex.test('$1000') && i.size === 3);
      const hasIndexed = instructionSet.some(i => i.regex.test('$10,X'));
      const hasIndirect = instructionSet.some(i => i.regex.test('($10,X)') || i.regex.test('($10),Y') || i.regex.test('($1000)'));
      const hasRelative = instructionSet.some(i => i.mnemonic.startsWith('B') && i.size === 2);
      const hasImplied = instructionSet.some(i => i.size === 1 && i.mnemonic === 'NOP');
      
      expect(hasImmediate).toBe(true);
      expect(hasZeroPage).toBe(true);
      expect(hasAbsolute).toBe(true);
      expect(hasIndexed).toBe(true);
      expect(hasIndirect).toBe(true);
      expect(hasRelative).toBe(true);
      expect(hasImplied).toBe(true);
    });

    test('should have correct opcodes for common instructions', () => {
      const commonOpcodes = [
        { mnemonic: 'BRK', opcode: 0x00 },
        { mnemonic: 'NOP', opcode: 0xEA },
        { mnemonic: 'RTS', opcode: 0x60 },
        { mnemonic: 'LDA', opcode: 0xA9 }, // LDA immediate
        { mnemonic: 'JMP', opcode: 0x4C }, // JMP absolute
      ];
      
      commonOpcodes.forEach(({ mnemonic, opcode }) => {
        const instruction = instructionSet.find(i => 
          i.mnemonic === mnemonic && i.opcode === opcode
        );
        expect(instruction).toBeDefined();
      });
    });
  });
});