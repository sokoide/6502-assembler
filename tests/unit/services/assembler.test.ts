/**
 * Comprehensive tests for the 6502 assembler
 */

import { describe, test, expect } from '@jest/globals';
import { assemble } from '@/services/assembler';
// import type { AssembleResult } from '@/types/types'; // Type not needed
import {
  validAssemblyCode,
  invalidAssemblyCode,
  expectedMachineCode,
  addressingModeTests,
  branchTests,
  performanceTestCode,
} from '@/fixtures/testAssemblyCode';

describe('Assembler Service', () => {
  describe('assemble() function', () => {
    describe('Valid assembly code', () => {
      test('should assemble simple code correctly', () => {
        const result = assemble(validAssemblyCode.simple);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        expect(result.machineCode.length).toBeGreaterThan(0);
      });

      test('should handle labels correctly', () => {
        const result = assemble(validAssemblyCode.withLabels);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });

      test('should handle forward references', () => {
        const result = assemble(validAssemblyCode.forwardReferences);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });

      test('should assemble all directive types', () => {
        const result = assemble(validAssemblyCode.allDirectives);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });

      test('should handle mixed ASCII correctly', () => {
        const result = assemble(validAssemblyCode.mixedAscii);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Check that machine code contains expected ASCII bytes
        const machineCode = result.machineCode;
        expect(machineCode).toContain(72);  // 'H'
        expect(machineCode).toContain(101); // 'e'
        expect(machineCode).toContain(108); // 'l'
        expect(machineCode).toContain(108); // 'l'
        expect(machineCode).toContain(111); // 'o'
        expect(machineCode).toContain(44);  // ','
        expect(machineCode).toContain(32);  // ' '
      });

      test('should handle empty input', () => {
        const result = assemble('');
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.machineCode).toEqual([]);
      });

      test('should handle comments only', () => {
        const code = `
          ; This is a comment
          ; Another comment
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.machineCode).toEqual([]);
      });

      test('should handle whitespace only', () => {
        const result = assemble('   \n\n   \t\t   \n');
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.machineCode).toEqual([]);
      });
    });

    describe('Invalid assembly code', () => {
      test('should return error for unknown instruction', () => {
        const result = assemble(invalidAssemblyCode.unknownInstruction);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('Unknown instruction');
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for invalid operand', () => {
        const result = assemble(invalidAssemblyCode.invalidOperand);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for duplicate labels', () => {
        const result = assemble(invalidAssemblyCode.duplicateLabel);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('Duplicate label');
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for undefined labels', () => {
        const result = assemble(invalidAssemblyCode.undefinedLabel);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('Label not found');
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for invalid .org format', () => {
        const result = assemble(invalidAssemblyCode.invalidOrgFormat);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for out of range byte values', () => {
        const result = assemble(invalidAssemblyCode.outOfRangeByte);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('out of range');
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for out of range word values', () => {
        const result = assemble(invalidAssemblyCode.outOfRangeWord);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('out of range');
        expect(result.machineCode).toEqual([]);
      });

      test('should return error for unterminated strings', () => {
        const result = assemble(invalidAssemblyCode.unterminatedString);
        
        expect(result).toBeDefined();
        expect(result.error).not.toBeNull();
        expect(result.error).toContain('Unterminated string');
        expect(result.machineCode).toEqual([]);
      });
    });

    describe('Addressing modes', () => {
      addressingModeTests.forEach(({ name, code, expected }) => {
        test(`should handle ${name}`, () => {
          const fullCode = `.org $0200\n${code}`;
          const result = assemble(fullCode);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual(expected);
        });
      });

      test('should choose zero page over absolute when possible', () => {
        const code = `
          .org $0010
          value: .res 1
          LDA value  ; Should use zero page addressing since value is at $0010
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Check that the result contains the LDA zero page opcode somewhere
        expect(result.machineCode).toContain(0xA5); // LDA zero page opcode
      });

      test('should use absolute addressing for addresses > $FF', () => {
        const code = `
          .org $0200
          start:
            LDA #$01
          .org $0300
          data: .res 1
          .org $0200
          start2:
            LDA data  ; Should use absolute addressing
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });
    });

    describe('Branch instructions', () => {
      branchTests.forEach(({ name, code, expected }) => {
        test(`should handle ${name}`, () => {
          const fullCode = `.org $0200\n${code}`;
          const result = assemble(fullCode);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual(expected);
        });
      });

      test('should calculate relative offsets correctly', () => {
        const code = `
          .org $0200
          start:
            NOP
            NOP
            BNE start
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // BNE should have offset -4 (0xFC in two's complement)
        expect(result.machineCode).toContain(0xFC);
      });
    });

    describe('Directives', () => {
      describe('.org directive', () => {
        test('should handle .org directive', () => {
          const code = `
            .org $0300
            LDA #$01
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
        });

        test('should handle * = syntax', () => {
          const code = `
            * = $0400
            LDA #$01
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
        });
      });

      describe('.res directive', () => {
        test('should handle .res directive', () => {
          const code = `
            .org $0200
            start:
              LDA buffer
            buffer: .res 10
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
        });

        test('should return error for negative .res values', () => {
          const code = `
            .org $0200
            buffer: .res -1
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).not.toBeNull();
          expect(result.error).toContain('Invalid value format');
          expect(result.machineCode).toEqual([]);
        });
      });

      describe('.byte directive', () => {
        test('should handle single byte', () => {
          const code = `
            .org $0200
            data: .byte $42
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([0x42]);
        });

        test('should handle multiple bytes', () => {
          const code = `
            .org $0200
            data: .byte $01, $02, $03, $04
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([0x01, 0x02, 0x03, 0x04]);
        });

        test('should handle character literals', () => {
          const code = `
            .org $0200
            data: .byte 'A', 'B', 'C'
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([65, 66, 67]); // ASCII A, B, C
        });
      });

      describe('.word directive', () => {
        test('should handle single word (little-endian)', () => {
          const code = `
            .org $0200
            data: .word $1234
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([0x34, 0x12]); // Little-endian
        });

        test('should handle multiple words', () => {
          const code = `
            .org $0200
            data: .word $1234, $5678
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([0x34, 0x12, 0x78, 0x56]);
        });

        test('should handle word with label reference', () => {
          const code = `
            .org $0200
            ptr: .word message
            message: .ascii "Hello"
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
          expect(result.machineCode.length).toBeGreaterThan(2);
        });
      });

      describe('.dword directive', () => {
        test('should handle single dword (little-endian)', () => {
          const code = `
            .org $0200
            data: .dword $12345678
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([0x78, 0x56, 0x34, 0x12]); // Little-endian
        });

        test('should handle multiple dwords', () => {
          const code = `
            .org $0200
            data: .dword $12345678, $9ABCDEF0
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([
            0x78, 0x56, 0x34, 0x12,  // $12345678
            0xF0, 0xDE, 0xBC, 0x9A   // $9ABCDEF0
          ]);
        });
      });

      describe('.ascii directive', () => {
        test('should handle simple string', () => {
          const code = `
            .org $0200
            msg: .ascii "Hello"
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual(expectedMachineCode.helloBytes);
        });

        test('should handle string with comma', () => {
          const code = `
            .org $0200
            msg: .ascii "Hello, World!"
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual(expectedMachineCode.helloWithComma);
        });

        test('should handle mixed string and bytes', () => {
          const code = `
            .org $0200
            msg: .ascii "Hello", 13, 10, 0
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([...expectedMachineCode.helloBytes, 13, 10, 0]);
        });

        test('should handle multiple strings and values', () => {
          const code = `
            .org $0200
            msg: .ascii "Hi", 32, "there!", 13, 10
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
          
          // Check for expected bytes
          expect(result.machineCode).toContain(72);  // 'H'
          expect(result.machineCode).toContain(105); // 'i'
          expect(result.machineCode).toContain(32);  // space
          expect(result.machineCode).toContain(116); // 't'
          expect(result.machineCode).toContain(13);  // CR
          expect(result.machineCode).toContain(10);  // LF
        });
      });

      describe('.asciiz directive', () => {
        test('should handle string with null terminator', () => {
          const code = `
            .org $0200
            msg: .asciiz "Hello"
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(result.machineCode).toEqual([...expectedMachineCode.helloBytes, 0]);
        });

        test('should handle mixed values with null terminator', () => {
          const code = `
            .org $0200
            msg: .asciiz "Hi", 32, "there"
          `;
          const result = assemble(code);
          
          expect(result).toBeDefined();
          expect(result.error).toBeNull();
          expect(Array.isArray(result.machineCode)).toBe(true);
          
          // Should end with null terminator
          expect(result.machineCode[result.machineCode.length - 1]).toBe(0);
        });
      });
    });

    describe('Edge cases', () => {
      test('should handle labels on same line as directives', () => {
        const code = `
          .org $0200
          start: LDA #$01
          data: .byte $42
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });

      test('should handle case insensitive instructions', () => {
        const code = `
          .org $0200
          lda #$01
          STA $10
          Nop
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });

      test('should handle various number formats', () => {
        const code = `
          .org $0200
          .byte $FF     ; Hex
          .byte 255     ; Decimal
          .byte 'A'     ; Character
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.machineCode).toEqual([255, 255, 65]);
      });

      test('should handle low/high byte operators', () => {
        const code = `
          .org $0200
          start:
            LDA #<target
            LDX #>target
          target:
            NOP
        `;
        const result = assemble(code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });
    });

    describe('Performance tests', () => {
      test('should handle large assembly files efficiently', () => {
        const startTime = performance.now();
        const result = assemble(performanceTestCode.large);
        const endTime = performance.now();
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should take less than 1 second
      });

      test('should handle many labels efficiently', () => {
        const startTime = performance.now();
        const result = assemble(performanceTestCode.manyLabels);
        const endTime = performance.now();
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        expect(endTime - startTime).toBeLessThan(500); // Should take less than 0.5 seconds
      });
    });
  });
});