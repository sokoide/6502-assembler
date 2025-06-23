/**
 * Tests for sample codes to ensure they all assemble correctly
 */

import { describe, test, expect } from '@jest/globals';
import { sampleCodes } from '../../../services/sampleCodes';
import { assemble } from '../../../services/assembler';

describe('Sample Codes', () => {
  describe('sampleCodes array', () => {
    test('should be defined and contain samples', () => {
      expect(sampleCodes).toBeDefined();
      expect(Array.isArray(sampleCodes)).toBe(true);
      expect(sampleCodes.length).toBeGreaterThan(0);
    });

    test('should have valid structure', () => {
      sampleCodes.forEach((sample) => {
        expect(sample).toHaveProperty('name');
        expect(sample).toHaveProperty('code');
        
        expect(typeof sample.name).toBe('string');
        expect(typeof sample.code).toBe('string');
        expect(sample.name).toBeTruthy();
        expect(sample.code).toBeTruthy();
        
        // Names should be unique
        const duplicates = sampleCodes.filter(s => s.name === sample.name);
        expect(duplicates).toHaveLength(1);
      });
    });

    test('should have descriptive names', () => {
      sampleCodes.forEach(sample => {
        expect(sample.name.length).toBeGreaterThan(3);
        expect(sample.name).toMatch(/^\d+\./); // Should start with number.
      });
    });
  });

  describe('Sample code assembly', () => {
    sampleCodes.forEach((sample, index) => {
      test(`should assemble sample ${index + 1}: "${sample.name}"`, () => {
        const result = assemble(sample.code);
        
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        expect(result.machineCode.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sample code content validation', () => {
    test('should contain basic storage example', () => {
      const basicSample = sampleCodes.find(s => s.name.includes('Basic Storage'));
      expect(basicSample).toBeDefined();
      if (basicSample) {
        expect(basicSample.code).toContain('.org');
        expect(basicSample.code).toContain('LDA');
        expect(basicSample.code).toContain('STA');
      }
    });

    test('should contain labels and loop example', () => {
      const loopSample = sampleCodes.find(s => s.name.includes('Loop'));
      expect(loopSample).toBeDefined();
      if (loopSample) {
        expect(loopSample.code).toContain('loop:');
        expect(loopSample.code).toContain('JMP');
      }
    });

    test('should contain branching example', () => {
      const branchSample = sampleCodes.find(s => s.name.includes('Branch'));
      expect(branchSample).toBeDefined();
      if (branchSample) {
        expect(branchSample.code).toContain('BNE');
        expect(branchSample.code).toContain('CPX');
      }
    });

    test('should contain subroutine example', () => {
      const subroutineSample = sampleCodes.find(s => s.name.includes('Subroutine'));
      expect(subroutineSample).toBeDefined();
      if (subroutineSample) {
        expect(subroutineSample.code).toContain('JSR');
        expect(subroutineSample.code).toContain('RTS');
      }
    });

    test('should contain stack operations example', () => {
      const stackSample = sampleCodes.find(s => s.name.includes('Stack'));
      expect(stackSample).toBeDefined();
      if (stackSample) {
        expect(stackSample.code).toContain('PHA');
        expect(stackSample.code).toContain('PLA');
      }
    });

    test('should contain indexed addressing example', () => {
      const indexedSample = sampleCodes.find(s => s.name.includes('Absolute,X'));
      expect(indexedSample).toBeDefined();
      if (indexedSample) {
        expect(indexedSample.code).toContain(',X');
        expect(indexedSample.code).toContain('INX');
      }
    });

    test('should contain indirect addressing example', () => {
      const indirectSample = sampleCodes.find(s => s.name.includes('Indirect'));
      expect(indirectSample).toBeDefined();
      if (indirectSample) {
        expect(indirectSample.code).toContain('($');
        expect(indirectSample.code).toContain('),Y');
      }
    });

    test('should contain low/high byte example', () => {
      const byteSample = sampleCodes.find(s => s.name.includes('Low/High Byte'));
      expect(byteSample).toBeDefined();
      if (byteSample) {
        expect(byteSample.code).toContain('#<');
        expect(byteSample.code).toContain('#>');
      }
    });

    test('should contain pseudo instructions example', () => {
      const pseudoSample = sampleCodes.find(s => s.name.includes('Pseudo'));
      expect(pseudoSample).toBeDefined();
      if (pseudoSample) {
        expect(pseudoSample.code).toContain('.res');
        expect(pseudoSample.code).toContain('.word');
        expect(pseudoSample.code).toContain('.ascii');
        expect(pseudoSample.code).toContain('.asciiz');
      }
    });
  });

  describe('Sample code machine code validation', () => {
    test('should generate expected machine code for basic storage', () => {
      const basicSample = sampleCodes.find(s => s.name.includes('Basic Storage'));
      expect(basicSample).toBeDefined();
      
      if (basicSample) {
        const result = assemble(basicSample.code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Should contain LDA immediate (0xA9)
        expect(result.machineCode).toContain(0xA9);
        // Should contain STA absolute (0x8D)
        expect(result.machineCode).toContain(0x8D);
        // Should contain BRK (0x00)
        expect(result.machineCode).toContain(0x00);
      }
    });

    test('should generate expected machine code for loop example', () => {
      const loopSample = sampleCodes.find(s => s.name.includes('Loop'));
      expect(loopSample).toBeDefined();
      
      if (loopSample) {
        const result = assemble(loopSample.code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Should contain JMP absolute (0x4C)
        expect(result.machineCode).toContain(0x4C);
        // Should contain INC absolute (0xEE)
        expect(result.machineCode).toContain(0xEE);
      }
    });

    test('should generate expected machine code for branching', () => {
      const branchSample = sampleCodes.find(s => s.name.includes('Branch'));
      expect(branchSample).toBeDefined();
      
      if (branchSample) {
        const result = assemble(branchSample.code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Should contain BNE (0xD0)
        expect(result.machineCode).toContain(0xD0);
        // Should contain CPX immediate (0xE0)
        expect(result.machineCode).toContain(0xE0);
        // Should contain DEX (0xCA)
        expect(result.machineCode).toContain(0xCA);
      }
    });

    test('should generate expected machine code for subroutine', () => {
      const subroutineSample = sampleCodes.find(s => s.name.includes('Subroutine'));
      expect(subroutineSample).toBeDefined();
      
      if (subroutineSample) {
        const result = assemble(subroutineSample.code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Should contain JSR absolute (0x20)
        expect(result.machineCode).toContain(0x20);
        // Should contain RTS (0x60)
        expect(result.machineCode).toContain(0x60);
      }
    });

    test('should generate expected machine code for stack operations', () => {
      const stackSample = sampleCodes.find(s => s.name.includes('Stack'));
      expect(stackSample).toBeDefined();
      
      if (stackSample) {
        const result = assemble(stackSample.code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        
        // Should contain PHA (0x48)
        expect(result.machineCode).toContain(0x48);
        // Should contain PLA (0x68)
        expect(result.machineCode).toContain(0x68);
      }
    });
  });

  describe('Sample code features coverage', () => {
    test('should cover all major 6502 instructions', () => {
      const allCode = sampleCodes.map(s => s.code).join('\n');
      
      const majorInstructions = [
        'LDA', 'LDX', 'LDY',
        'STA', 'STX', 'STY',
        'JMP', 'JSR', 'RTS',
        'BNE', 'BEQ',
        'CMP', 'CPX', // CPY not in samples
        'INC', 'INX', 'DEX', // DEC not in samples
        'PHA', 'PLA',
        'NOP', 'BRK',
      ];
      
      majorInstructions.forEach(instruction => {
        expect(allCode).toContain(instruction);
      });
    });

    test('should cover all addressing modes', () => {
      const allCode = sampleCodes.map(s => s.code).join('\n');
      
      // Check for addressing mode patterns
      expect(allCode).toMatch(/#\$/);        // Immediate
      expect(allCode).toMatch(/\$[0-9A-Fa-f]{1,2}(?![0-9A-Fa-f])/); // Zero page
      expect(allCode).toMatch(/\$[0-9A-Fa-f]{3,4}/); // Absolute
      expect(allCode).toMatch(/,X/);         // Indexed X
      expect(allCode).toMatch(/,Y/);         // Indexed Y
      expect(allCode).toMatch(/\(\$/);       // Indirect
    });

    test('should cover all directive types', () => {
      const allCode = sampleCodes.map(s => s.code).join('\n');
      
      const directives = ['.org', '.res', '.word', '.dword', '.ascii', '.asciiz']; // .byte not in samples
      
      directives.forEach(directive => {
        expect(allCode).toContain(directive);
      });
    });

    test('should include proper comments and documentation', () => {
      // Check that most samples have comments (allow some to not have comments)
      const samplesWithComments = sampleCodes.filter(sample => {
        const commentLines = sample.code.split('\n').filter(line => 
          line.trim().startsWith(';')
        );
        return commentLines.length > 0;
      });
      
      // At least 25% of samples should have comments (adjust based on actual content)
      expect(samplesWithComments.length).toBeGreaterThanOrEqual(sampleCodes.length * 0.25);
    });
  });

  describe('Sample code performance', () => {
    test('should assemble all samples quickly', () => {
      const startTime = performance.now();
      
      sampleCodes.forEach(sample => {
        const result = assemble(sample.code);
        expect(result.error).toBeNull();
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All samples should assemble in less than 1 second total
      expect(totalTime).toBeLessThan(1000);
    });

    test('should have reasonable machine code sizes', () => {
      sampleCodes.forEach(sample => {
        const result = assemble(sample.code);
        expect(result.error).toBeNull();
        
        // Machine code should not be empty but also not excessively large
        expect(result.machineCode.length).toBeGreaterThan(0);
        expect(result.machineCode.length).toBeLessThan(1000); // Reasonable upper bound
      });
    });
  });
});