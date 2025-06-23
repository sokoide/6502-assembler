/**
 * Tests for formatting utility functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  formatMachineCode,
  formatElapsedTime,
  formatByteCount,
  formatAddress,
} from '../../../utils/formatting';

describe('Formatting Utils', () => {
  describe('formatMachineCode', () => {
    test('should format empty array', () => {
      const result = formatMachineCode([]);
      expect(result).toBe('');
    });

    test('should format single byte', () => {
      const result = formatMachineCode([0x42]);
      expect(result).toBe('42');
    });

    test('should format multiple bytes', () => {
      const result = formatMachineCode([0x01, 0x02, 0x03]);
      expect(result).toBe('01 02 03');
    });

    test('should format bytes with zero padding', () => {
      const result = formatMachineCode([0x1, 0xA, 0xFF]);
      expect(result).toBe('01 0A FF');
    });

    test('should format all possible byte values', () => {
      const result = formatMachineCode([0x00, 0x7F, 0x80, 0xFF]);
      expect(result).toBe('00 7F 80 FF');
    });

    test('should format large array of bytes', () => {
      const bytes = Array.from({ length: 256 }, (_, i) => i);
      const result = formatMachineCode(bytes);
      
      expect(result).toContain('00');
      expect(result).toContain('FF');
      expect(result.split(' ')).toHaveLength(256);
      
      // Check that all values are uppercase
      expect(result).toMatch(/^[0-9A-F ]+$/);
    });

    test('should handle common 6502 opcodes', () => {
      const opcodes = [0xA9, 0x8D, 0x4C, 0x00]; // LDA #, STA abs, JMP abs, BRK
      const result = formatMachineCode(opcodes);
      expect(result).toBe('A9 8D 4C 00');
    });

    test('should format ASCII-range bytes correctly', () => {
      const asciiBytes = [65, 66, 67]; // 'A', 'B', 'C'
      const result = formatMachineCode(asciiBytes);
      expect(result).toBe('41 42 43');
    });
  });

  describe('formatElapsedTime', () => {
    describe('Microseconds', () => {
      test('should format sub-millisecond times in microseconds', () => {
        expect(formatElapsedTime(0.5)).toBe('500.0 μs');
        expect(formatElapsedTime(0.1)).toBe('100.0 μs');
        expect(formatElapsedTime(0.001)).toBe('1.0 μs');
      });

      test('should format very small times', () => {
        expect(formatElapsedTime(0.0001)).toBe('0.1 μs');
        expect(formatElapsedTime(0.9999)).toBe('999.9 μs');
      });

      test('should handle zero time', () => {
        expect(formatElapsedTime(0)).toBe('0.0 μs');
      });
    });

    describe('Milliseconds', () => {
      test('should format millisecond times', () => {
        expect(formatElapsedTime(1)).toBe('1.00 ms');
        expect(formatElapsedTime(10)).toBe('10.00 ms');
        expect(formatElapsedTime(100)).toBe('100.00 ms');
        expect(formatElapsedTime(999)).toBe('999.00 ms');
      });

      test('should format decimal milliseconds', () => {
        expect(formatElapsedTime(1.5)).toBe('1.50 ms');
        expect(formatElapsedTime(10.25)).toBe('10.25 ms');
        expect(formatElapsedTime(999.99)).toBe('999.99 ms');
      });

      test('should handle boundary at 1ms', () => {
        expect(formatElapsedTime(0.999)).toBe('999.0 μs');
        expect(formatElapsedTime(1.0)).toBe('1.00 ms');
        expect(formatElapsedTime(1.001)).toBe('1.00 ms');
      });
    });

    describe('Seconds', () => {
      test('should format second times', () => {
        expect(formatElapsedTime(1000)).toBe('1.00 s');
        expect(formatElapsedTime(2500)).toBe('2.50 s');
        expect(formatElapsedTime(10000)).toBe('10.00 s');
      });

      test('should format large times', () => {
        expect(formatElapsedTime(60000)).toBe('60.00 s');
        expect(formatElapsedTime(3600000)).toBe('3600.00 s');
      });

      test('should handle boundary at 1000ms', () => {
        expect(formatElapsedTime(999.99)).toBe('999.99 ms');
        expect(formatElapsedTime(1000.0)).toBe('1.00 s');
        expect(formatElapsedTime(1000.01)).toBe('1.00 s');
      });
    });

    describe('Edge cases', () => {
      test('should handle very large numbers', () => {
        expect(formatElapsedTime(999999999)).toBe('1000000.00 s');
      });

      test('should handle precise decimal values', () => {
        expect(formatElapsedTime(1.234)).toBe('1.23 ms');
        expect(formatElapsedTime(1234.567)).toBe('1.23 s');
      });
    });
  });

  describe('formatByteCount', () => {
    describe('Singular forms', () => {
      test('should format zero bytes (plural)', () => {
        expect(formatByteCount(0)).toBe('0 bytes');
      });

      test('should format one byte (singular)', () => {
        expect(formatByteCount(1)).toBe('1 byte');
      });
    });

    describe('Plural forms', () => {
      test('should format two bytes (plural)', () => {
        expect(formatByteCount(2)).toBe('2 bytes');
      });

      test('should format many bytes (plural)', () => {
        expect(formatByteCount(100)).toBe('100 bytes');
        expect(formatByteCount(1000)).toBe('1000 bytes');
        expect(formatByteCount(65536)).toBe('65536 bytes');
      });
    });

    describe('Edge cases', () => {
      test('should handle negative numbers', () => {
        expect(formatByteCount(-1)).toBe('-1 bytes'); // Technically invalid but should work
        expect(formatByteCount(-2)).toBe('-2 bytes');
      });

      test('should handle decimal numbers', () => {
        expect(formatByteCount(1.5)).toBe('1.5 bytes');
        expect(formatByteCount(2.0)).toBe('2 bytes');
      });

      test('should handle very large numbers', () => {
        expect(formatByteCount(999999999)).toBe('999999999 bytes');
      });
    });
  });

  describe('formatAddress', () => {
    describe('Default prefix ($)', () => {
      test('should format simple addresses', () => {
        expect(formatAddress(0x0000)).toBe('$0000');
        expect(formatAddress(0x0001)).toBe('$0001');
        expect(formatAddress(0xFFFF)).toBe('$FFFF');
      });

      test('should format with zero padding', () => {
        expect(formatAddress(0x1)).toBe('$0001');
        expect(formatAddress(0x10)).toBe('$0010');
        expect(formatAddress(0x100)).toBe('$0100');
        expect(formatAddress(0x1000)).toBe('$1000');
      });

      test('should format common 6502 addresses', () => {
        expect(formatAddress(0x0200)).toBe('$0200'); // Common start address
        expect(formatAddress(0x0300)).toBe('$0300'); // Common data area
        expect(formatAddress(0xFFFC)).toBe('$FFFC'); // Reset vector
        expect(formatAddress(0xFFFE)).toBe('$FFFE'); // IRQ vector
      });

      test('should format hex letters in uppercase', () => {
        expect(formatAddress(0xABCD)).toBe('$ABCD');
        expect(formatAddress(0xDEAD)).toBe('$DEAD');
        expect(formatAddress(0xBEEF)).toBe('$BEEF');
        expect(formatAddress(0xCAFE)).toBe('$CAFE');
      });
    });

    describe('Custom prefix', () => {
      test('should format with custom prefix', () => {
        expect(formatAddress(0x1234, '0x')).toBe('0x1234');
        expect(formatAddress(0x5678, '#')).toBe('#5678');
        expect(formatAddress(0x9ABC, '')).toBe('9ABC');
      });

      test('should format with no prefix', () => {
        expect(formatAddress(0x1234, '')).toBe('1234');
        expect(formatAddress(0x0000, '')).toBe('0000');
        expect(formatAddress(0xFFFF, '')).toBe('FFFF');
      });

      test('should format with longer prefixes', () => {
        expect(formatAddress(0x1234, 'addr:')).toBe('addr:1234');
        expect(formatAddress(0x5678, 'location_')).toBe('location_5678');
      });

      test('should format with special character prefixes', () => {
        expect(formatAddress(0x1234, '@')).toBe('@1234');
        expect(formatAddress(0x5678, '&')).toBe('&5678');
        expect(formatAddress(0x9ABC, '%')).toBe('%9ABC');
      });
    });

    describe('Edge cases', () => {
      test('should handle boundary values', () => {
        expect(formatAddress(0)).toBe('$0000');
        expect(formatAddress(0xFFFF)).toBe('$FFFF');
      });

      test('should handle values that would exceed 16-bit', () => {
        // These might be invalid for 6502 but should still format
        expect(formatAddress(0x10000)).toBe('$10000'); // Formats as-is
        expect(formatAddress(0x12345)).toBe('$12345'); // Formats as-is
      });

      test('should handle negative numbers', () => {
        // JavaScript converts negative numbers when using toString(16)
        expect(formatAddress(-1)).toBe('$00-1'); // Negative numbers get formatted with padStart
      });

      test('should format addresses commonly used in assembly examples', () => {
        const commonAddresses = [
          0x0200, // Program start
          0x0300, // Data area
          0x1000, // Absolute addressing example
          0x8000, // High memory
          0xC000, // ROM area
          0xE000, // I/O area
          0xF000, // Vector area
        ];

        commonAddresses.forEach(addr => {
          const result = formatAddress(addr);
          expect(result).toMatch(/^\$[0-9A-F]{4}$/);
          expect(result.length).toBe(5); // $ + 4 hex digits
        });
      });
    });

    describe('Type safety and validation', () => {
      test('should handle decimal numbers correctly', () => {
        expect(formatAddress(512)).toBe('$0200');  // 512 decimal = 0x0200
        expect(formatAddress(768)).toBe('$0300');  // 768 decimal = 0x0300
        expect(formatAddress(4096)).toBe('$1000'); // 4096 decimal = 0x1000
      });

      test('should handle floating point numbers', () => {
        expect(formatAddress(512.7)).toBe('$200.B3333333334'); // Formats decimal part in hex
        expect(formatAddress(512.9)).toBe('$200.E6666666666'); // Formats decimal part in hex
      });
    });
  });

  describe('Integration tests', () => {
    test('should format typical assembler output', () => {
      const machineCode = [0xA9, 0x01, 0x8D, 0x00, 0x03, 0x00];
      const address = 0x0200;
      const byteCount = machineCode.length;
      const elapsedTime = 12.5;

      expect(formatMachineCode(machineCode)).toBe('A9 01 8D 00 03 00');
      expect(formatAddress(address)).toBe('$0200');
      expect(formatByteCount(byteCount)).toBe('6 bytes');
      expect(formatElapsedTime(elapsedTime)).toBe('12.50 ms');
    });

    test('should format empty assembler result', () => {
      const machineCode: number[] = [];
      const address = 0x0200;
      const byteCount = 0;
      const elapsedTime = 0.5;

      expect(formatMachineCode(machineCode)).toBe('');
      expect(formatAddress(address)).toBe('$0200');
      expect(formatByteCount(byteCount)).toBe('0 bytes');
      expect(formatElapsedTime(elapsedTime)).toBe('500.0 μs');
    });

    test('should format large assembler result', () => {
      const machineCode = Array.from({ length: 1000 }, (_, i) => i % 256);
      const address = 0x8000;
      const byteCount = machineCode.length;
      const elapsedTime = 1500;

      expect(formatMachineCode(machineCode)).toContain('00 01 02');
      expect(formatMachineCode(machineCode)).toContain('FF 00 01');
      expect(formatAddress(address)).toBe('$8000');
      expect(formatByteCount(byteCount)).toBe('1000 bytes');
      expect(formatElapsedTime(elapsedTime)).toBe('1.50 s');
    });
  });
});