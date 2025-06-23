/**
 * Integration tests for the complete assembler workflow
 */

import { describe, test, expect } from '@jest/globals';
import { assemble } from '@/services/assembler';
import { sampleCodes } from '@/services/sampleCodes';
import { validateAssemblyCode, sanitizeErrorMessage } from '@/utils/validation';
import { formatMachineCode, formatElapsedTime, formatByteCount, formatAddress } from '@/utils/formatting';

describe('Assembler Integration Tests', () => {
  describe('End-to-end assembly workflow', () => {
    test('should complete full assembly workflow for simple program', () => {
      const code = `
        .org $0200
        start:
          LDA #$42
          STA $0300
          BRK
      `;
      
      // Validate input
      const validation = validateAssemblyCode(code);
      expect(validation.isValid).toBe(true);
      
      // Assemble code
      const startTime = performance.now();
      const result = assemble(code);
      const endTime = performance.now();
      
      // Check result
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      expect(result.machineCode.length).toBeGreaterThan(0);
      
      // Format output
      const formattedCode = formatMachineCode(result.machineCode);
      const formattedTime = formatElapsedTime(endTime - startTime);
      const formattedBytes = formatByteCount(result.machineCode.length);
      const formattedAddress = formatAddress(0x0200);
      
      expect(formattedCode).toMatch(/^[0-9A-F ]+$/);
      expect(formattedTime).toMatch(/\d+\.\d+\s(ms|μs|s)/);
      expect(formattedBytes).toMatch(/\d+\sbytes?/);
      expect(formattedAddress).toBe('$0200');
    });

    test('should handle error workflow gracefully', () => {
      const invalidCode = `
        .org $0200
        INVALID_INSTRUCTION #$42
      `;
      
      // Validate input (should pass basic validation)
      const validation = validateAssemblyCode(invalidCode);
      expect(validation.isValid).toBe(true);
      
      // Assemble code (should fail)
      const result = assemble(invalidCode);
      
      // Check error handling
      expect(result.error).not.toBeNull();
      expect(result.machineCode).toEqual([]);
      
      // Sanitize error message
      const sanitizedError = sanitizeErrorMessage(result.error);
      expect(typeof sanitizedError).toBe('string');
      expect(sanitizedError.length).toBeGreaterThan(0);
      expect(sanitizedError.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Complex assembly scenarios', () => {
    test('should handle forward and backward references', () => {
      const code = `
        .org $0200
        start:
          LDA #<message
          STA $10
          LDA #>message
          STA $11
          JMP end
        
        message:
          .ascii "Hello, World!"
        
        loop:
          DEX
          BNE loop
          JMP start
        
        end:
          BRK
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      expect(result.machineCode.length).toBeGreaterThan(10);
      
      // Should contain ASCII bytes for "Hello, World!"
      const machineCode = result.machineCode;
      expect(machineCode).toContain(72);  // 'H'
      expect(machineCode).toContain(101); // 'e'
      expect(machineCode).toContain(108); // 'l'
      expect(machineCode).toContain(111); // 'o'
    });

    test('should handle all directive types together', () => {
      const code = `
        .org $0200
        start:
          LDA var1
          LDX var2
          LDY #<string_data
          BRK
        
        ; Variables
        var1: .res 1
        var2: .res 1
        
        ; Data
        byte_data: .byte $01, $02, $03
        word_data: .word $1234, $5678
        dword_data: .dword $12345678
        
        ; Strings
        string_data: .ascii "Test", 13, 10
        c_string: .asciiz "Null-terminated"
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      
      // Check for specific data
      expect(result.machineCode).toContain(0x01); // .byte data
      expect(result.machineCode).toContain(0x02);
      expect(result.machineCode).toContain(0x03);
      expect(result.machineCode).toContain(0x34); // .word data (little-endian)
      expect(result.machineCode).toContain(0x12);
      expect(result.machineCode).toContain(84);   // 'T' in "Test"
      expect(result.machineCode).toContain(0);    // Null terminator
    });

    test('should handle complex branching logic', () => {
      const code = `
        .org $0200
        start:
          LDX #$05
        
        outer_loop:
          LDY #$03
        
        inner_loop:
          DEY
          BNE inner_loop
          DEX
          BNE outer_loop
          
          ; Test all branch types
          LDA #$00
          CMP #$00
          BEQ equal_test
          JMP error
        
        equal_test:
          LDA #$01
          CMP #$00
          BNE not_equal_test
          JMP error
        
        not_equal_test:
          LDA #$FF
          CMP #$80
          BCS carry_test
          JMP error
        
        carry_test:
          LDA #$7F
          CMP #$80
          BCC no_carry_test
          JMP error
        
        no_carry_test:
          JMP success
        
        error:
          LDA #$FF
          BRK
        
        success:
          LDA #$00
          BRK
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      
      // Should contain various branch instructions
      expect(result.machineCode).toContain(0xD0); // BNE
      expect(result.machineCode).toContain(0xF0); // BEQ
      expect(result.machineCode).toContain(0xB0); // BCS
      expect(result.machineCode).toContain(0x90); // BCC
      expect(result.machineCode).toContain(0x4C); // JMP
    });

    test('should handle zero page vs absolute addressing optimization', () => {
      const code = `
        .org $0200
        start:
          LDA zp_var      ; Should use zero page addressing
          STA abs_var     ; Should use absolute addressing
          BRK
        
        .org $0010
        zp_var: .res 1    ; In zero page
        
        .org $0300
        abs_var: .res 1   ; In absolute space
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      
      // First LDA should be zero page (0xA5), second STA should be absolute (0x8D)
      expect(result.machineCode).toContain(0xA5); // LDA zero page
      expect(result.machineCode).toContain(0x8D); // STA absolute
    });
  });

  describe('All sample codes integration', () => {
    test('should assemble all sample codes successfully', () => {
      let totalBytes = 0;
      let totalTime = 0;
      
      sampleCodes.forEach((sample) => {
        const startTime = performance.now();
        const result = assemble(sample.code);
        const endTime = performance.now();
        
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
        expect(result.machineCode.length).toBeGreaterThan(0);
        
        totalBytes += result.machineCode.length;
        totalTime += (endTime - startTime);
        
        // Verify formatting works
        const formatted = formatMachineCode(result.machineCode);
        expect(formatted).toMatch(/^[0-9A-F ]*$/);
      });
      
      // Performance checks
      expect(totalTime).toBeLessThan(5000); // All samples should assemble in < 5 seconds
      expect(totalBytes).toBeGreaterThan(50); // Should generate reasonable amount of code
      
      console.log(`Integration test: Assembled ${sampleCodes.length} samples, ${totalBytes} total bytes in ${totalTime.toFixed(2)}ms`);
    });

    test('should demonstrate all addressing modes', () => {
      const addressingModeTests = [
        { name: 'Immediate', code: 'LDA #$42', expectOpcode: 0xA9 },
        { name: 'Zero Page', code: 'LDA $42', expectOpcode: 0xA5 },
        { name: 'Absolute', code: 'LDA $1234', expectOpcode: 0xAD },
        { name: 'Zero Page,X', code: 'LDA $42,X', expectOpcode: 0xB5 },
        { name: 'Absolute,X', code: 'LDA $1234,X', expectOpcode: 0xBD },
        { name: 'Absolute,Y', code: 'LDA $1234,Y', expectOpcode: 0xB9 },
        { name: 'Indirect,X', code: 'LDA ($42,X)', expectOpcode: 0xA1 },
        { name: 'Indirect,Y', code: 'LDA ($42),Y', expectOpcode: 0xB1 },
      ];
      
      addressingModeTests.forEach(({ code, expectOpcode }) => {
        const fullCode = `.org $0200\n${code}`;
        const result = assemble(fullCode);
        
        expect(result.error).toBeNull();
        expect(result.machineCode[0]).toBe(expectOpcode);
      });
    });
  });

  describe('Performance and stress tests', () => {
    test('should handle large programs efficiently', () => {
      const largeProgram = `
        .org $0200
        ${Array.from({ length: 500 }, (_, i) => `    LDA #$${(i % 256).toString(16).padStart(2, '0')}`).join('\n')}
        BRK
      `;
      
      const startTime = performance.now();
      const result = assemble(largeProgram);
      const endTime = performance.now();
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      expect(result.machineCode.length).toBeGreaterThan(1000);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    test('should handle many labels efficiently', () => {
      const manyLabelsProgram = `
        .org $0200
        start:
          JMP end
        ${Array.from({ length: 200 }, (_, i) => `label${i}: NOP`).join('\n')}
        end:
          BRK
      `;
      
      const startTime = performance.now();
      const result = assemble(manyLabelsProgram);
      const endTime = performance.now();
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle deeply nested org directives', () => {
      const nestedOrgProgram = `
        .org $0200
        start: NOP
        
        .org $0300
        data1: .byte $01
        
        .org $0400
        data2: .word start
        
        .org $0500
        data3: .ascii "Test"
        
        .org $0200
        start2:
          LDA data1
          LDX data3
          BRK
      `;
      
      const result = assemble(nestedOrgProgram);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
    });
  });

  describe('Error recovery and robustness', () => {
    test('should provide detailed error information', () => {
      const errorCases = [
        {
          code: 'INVALID_INSTRUCTION #$42',
          expectedError: /unknown instruction/i,
        },
        {
          code: '.org $0200\nlabel:\nlabel: NOP',
          expectedError: /duplicate label/i,
        },
        {
          code: '.org $0200\nLDA undefined_label',
          expectedError: /label not found/i,
        },
        {
          code: '.org $0200\n.byte 256',
          expectedError: /out of range/i,
        },
      ];
      
      errorCases.forEach(({ code, expectedError }) => {
        const result = assemble(code);
        
        expect(result.error).not.toBeNull();
        expect(result.error).toMatch(expectedError);
        expect(result.machineCode).toEqual([]);
        
        // Error should be properly sanitized
        const sanitized = sanitizeErrorMessage(result.error);
        expect(typeof sanitized).toBe('string');
        expect(sanitized.length).toBeLessThanOrEqual(500);
      });
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        '',  // Empty input
        '   \n\n\t   ',  // Whitespace only
        '; Comment only',  // Comments only
        '.org $0200\n; Mixed comments\n  ; and whitespace\n\n',
      ];
      
      edgeCases.forEach(code => {
        const validation = validateAssemblyCode(code);
        expect(validation.isValid).toBe(true);
        
        const result = assemble(code);
        expect(result.error).toBeNull();
        expect(Array.isArray(result.machineCode)).toBe(true);
      });
    });
  });

  describe('Real-world assembly patterns', () => {
    test('should handle interrupt vector setup', () => {
      const code = `
        .org $0200
        start:
          SEI           ; Disable interrupts
          LDA #<irq_handler
          STA $FFFE     ; IRQ vector low
          LDA #>irq_handler
          STA $FFFF     ; IRQ vector high
          CLI           ; Enable interrupts
          JMP main_loop
        
        irq_handler:
          PHA           ; Save accumulator
          ; Handle interrupt
          PLA           ; Restore accumulator
          RTS           ; Return (using RTS instead of RTI for now)
        
        main_loop:
          NOP
          JMP main_loop
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
      expect(result.machineCode).toContain(0x78); // SEI
      expect(result.machineCode).toContain(0x58); // CLI
      expect(result.machineCode).toContain(0x48); // PHA
      expect(result.machineCode).toContain(0x68); // PLA
      expect(result.machineCode).toContain(0x60); // RTS
    });

    test('should handle memory-mapped I/O patterns', () => {
      const code = `
        .org $0200
        
        ; Memory-mapped I/O addresses (using direct addresses for now)
        start:
          LDA #$FF
          STA $6003     ; Set port A as output (VIA_DDRA)
          LDA #$00
          STA $6002     ; Set port B as input (VIA_DDRB)
          
          LDA #$55      ; Test pattern
          STA $6001     ; Output to port A (VIA_PORTA)
          
          LDA $6000     ; Read from port B (VIA_PORTB)
          BRK
      `;
      
      const result = assemble(code);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.machineCode)).toBe(true);
    });
  });
});