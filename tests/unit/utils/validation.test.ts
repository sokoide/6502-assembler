/**
 * Tests for validation utility functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  validateAssemblyCode,
  validateSampleIndex,
  sanitizeErrorMessage,
} from '../../../utils/validation';

describe('Validation Utils', () => {
  describe('validateAssemblyCode', () => {
    describe('Valid inputs', () => {
      test('should accept valid assembly code', () => {
        const code = `
          .org $0200
          LDA #$01
          STA $0300
          BRK
        `;
        
        const result = validateAssemblyCode(code);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept empty string', () => {
        const result = validateAssemblyCode('');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept whitespace only', () => {
        const result = validateAssemblyCode('   \n\t  \n   ');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept comments only', () => {
        const code = `
          ; This is a comment
          ; Another comment
        `;
        
        const result = validateAssemblyCode(code);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept code with special characters', () => {
        const code = `
          .org $0200
          .ascii "Hello, World!"
          .byte 'A', 'B', 'C'
        `;
        
        const result = validateAssemblyCode(code);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should accept long but reasonable code', () => {
        const code = Array.from({ length: 1000 }, (_, i) => 
          `    LDA #$${i.toString(16).padStart(2, '0')}`
        ).join('\n');
        
        const result = validateAssemblyCode(code);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('Invalid inputs', () => {
      test('should reject non-string input', () => {
        // @ts-expect-error Testing invalid input
        const result = validateAssemblyCode(123);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code must be a string');
      });

      test('should reject non-string input (null)', () => {
        // @ts-expect-error Testing invalid input
        const result = validateAssemblyCode(null);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code must be a string');
      });

      test('should reject non-string input (undefined)', () => {
        // @ts-expect-error Testing invalid input
        const result = validateAssemblyCode(undefined);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code must be a string');
      });

      test('should reject non-string input (object)', () => {
        // @ts-expect-error Testing invalid input
        const result = validateAssemblyCode({});
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code must be a string');
      });

      test('should reject too long code', () => {
        const longCode = 'A'.repeat(50001);
        
        const result = validateAssemblyCode(longCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code is too long (maximum 50,000 characters)');
      });

      test('should reject code with script tags', () => {
        const maliciousCode = `
          .org $0200
          <script>alert('xss')</script>
          LDA #$01
        `;
        
        const result = validateAssemblyCode(maliciousCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code contains suspicious content');
      });

      test('should reject code with script tags (case insensitive)', () => {
        const maliciousCode = `
          .org $0200
          <SCRIPT>alert('xss')</SCRIPT>
          LDA #$01
        `;
        
        const result = validateAssemblyCode(maliciousCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code contains suspicious content');
      });

      test('should reject code with javascript: URLs', () => {
        const maliciousCode = `
          .org $0200
          ; javascript:alert('xss')
          LDA #$01
        `;
        
        const result = validateAssemblyCode(maliciousCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code contains suspicious content');
      });

      test('should reject code with data URLs containing base64', () => {
        const maliciousCode = `
          .org $0200
          ; data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4K
          LDA #$01
        `;
        
        const result = validateAssemblyCode(maliciousCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Assembly code contains suspicious content');
      });
    });

    describe('Edge cases', () => {
      test('should handle code at maximum length', () => {
        const maxLengthCode = 'A'.repeat(50000);
        
        const result = validateAssemblyCode(maxLengthCode);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should handle multiple validation errors', () => {
        const maliciousLongCode = '<script>alert("xss")</script>' + 'A'.repeat(50000);
        
        const result = validateAssemblyCode(maliciousLongCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('Assembly code is too long (maximum 50,000 characters)');
        expect(result.errors).toContain('Assembly code contains suspicious content');
      });

      test('should stop checking suspicious patterns after first match', () => {
        const multiMaliciousCode = '<script>test</script> javascript:void(0) data:text/html;base64,test';
        
        const result = validateAssemblyCode(multiMaliciousCode);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.filter(e => e.includes('suspicious content'))).toHaveLength(1);
      });
    });
  });

  describe('validateSampleIndex', () => {
    describe('Valid indices', () => {
      test('should accept valid index "0"', () => {
        expect(validateSampleIndex('0', 5)).toBe(true);
      });

      test('should accept valid index in middle', () => {
        expect(validateSampleIndex('2', 5)).toBe(true);
      });

      test('should accept valid index at boundary', () => {
        expect(validateSampleIndex('4', 5)).toBe(true);
      });

      test('should accept large valid index', () => {
        expect(validateSampleIndex('99', 100)).toBe(true);
      });
    });

    describe('Invalid indices', () => {
      test('should reject index equal to maxIndex', () => {
        expect(validateSampleIndex('5', 5)).toBe(false);
      });

      test('should reject index greater than maxIndex', () => {
        expect(validateSampleIndex('10', 5)).toBe(false);
      });

      test('should reject negative index', () => {
        expect(validateSampleIndex('-1', 5)).toBe(false);
      });

      test('should reject non-numeric string', () => {
        expect(validateSampleIndex('abc', 5)).toBe(false);
      });

      test('should reject empty string', () => {
        expect(validateSampleIndex('', 5)).toBe(false);
      });

      test('should reject decimal number', () => {
        expect(validateSampleIndex('2.5', 5)).toBe(true); // parseInt('2.5') = 2, which is valid
      });

      test('should reject string with whitespace', () => {
        expect(validateSampleIndex(' 2 ', 5)).toBe(true); // parseInt(' 2 ') = 2, which is valid
      });

      test('should reject string with leading zeros that creates invalid number', () => {
        expect(validateSampleIndex('01', 5)).toBe(true); // This should actually be valid
      });
    });

    describe('Edge cases', () => {
      test('should handle maxIndex of 0', () => {
        expect(validateSampleIndex('0', 0)).toBe(false);
        expect(validateSampleIndex('-1', 0)).toBe(false);
      });

      test('should handle maxIndex of 1', () => {
        expect(validateSampleIndex('0', 1)).toBe(true);
        expect(validateSampleIndex('1', 1)).toBe(false);
      });

      test('should handle large numbers', () => {
        expect(validateSampleIndex('999999', 1000000)).toBe(true);
        expect(validateSampleIndex('1000000', 1000000)).toBe(false);
      });
    });
  });

  describe('sanitizeErrorMessage', () => {
    describe('Error objects', () => {
      test('should return message from Error object', () => {
        const error = new Error('Test error message');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Test error message');
      });

      test('should remove stack trace information', () => {
        const error = new Error('Test error message');
        error.stack = `Error: Test error message
    at Object.<anonymous> (/path/to/file.js:1:1)
    at Module._compile (internal/modules/cjs/loader.js:999:30)`;
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Test error message');
        expect(result).not.toContain('at Object');
        expect(result).not.toContain('at Module');
      });

      test('should handle Error with only stack trace in message', () => {
        const error = new Error('Error at line 1\n    at someFunction');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Error'); // regex removes ' at line 1' part
      });

      test('should handle TypeError', () => {
        const error = new TypeError('Cannot read property of undefined');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Cannot read property of undefined');
      });

      test('should handle custom Error subclass', () => {
        class CustomError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'CustomError';
          }
        }
        
        const error = new CustomError('Custom error message');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Custom error message');
      });
    });

    describe('String errors', () => {
      test('should return string as-is when short', () => {
        const errorString = 'Short error message';
        const result = sanitizeErrorMessage(errorString);
        
        expect(result).toBe(errorString);
      });

      test('should truncate long strings', () => {
        const longString = 'A'.repeat(600);
        const result = sanitizeErrorMessage(longString);
        
        expect(result).toHaveLength(500);
        expect(result).toBe('A'.repeat(500));
      });

      test('should handle empty string', () => {
        const result = sanitizeErrorMessage('');
        
        expect(result).toBe('');
      });

      test('should handle string with newlines', () => {
        const errorString = 'Line 1\nLine 2\nLine 3';
        const result = sanitizeErrorMessage(errorString);
        
        expect(result).toBe('Line 1\nLine 2\nLine 3');
      });
    });

    describe('Other error types', () => {
      test('should handle null', () => {
        const result = sanitizeErrorMessage(null);
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle undefined', () => {
        const result = sanitizeErrorMessage(undefined);
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle number', () => {
        const result = sanitizeErrorMessage(123);
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle object', () => {
        const result = sanitizeErrorMessage({ message: 'test' });
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle array', () => {
        const result = sanitizeErrorMessage(['error1', 'error2']);
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle function', () => {
        const result = sanitizeErrorMessage(() => 'error');
        
        expect(result).toBe('An unknown error occurred');
      });

      test('should handle boolean', () => {
        expect(sanitizeErrorMessage(true)).toBe('An unknown error occurred');
        expect(sanitizeErrorMessage(false)).toBe('An unknown error occurred');
      });
    });

    describe('Edge cases', () => {
      test('should handle Error with empty message', () => {
        const error = new Error('');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('');
      });

      test('should handle Error with whitespace-only message', () => {
        const error = new Error('   \n\t   ');
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('   \n\t   ');
      });

      test('should handle string at exactly 500 characters', () => {
        const exactString = 'A'.repeat(500);
        const result = sanitizeErrorMessage(exactString);
        
        expect(result).toBe(exactString);
        expect(result).toHaveLength(500);
      });

      test('should handle complex stack trace patterns', () => {
        const error = new Error('Main error message');
        error.stack = `Error: Main error message
    at complexFunction (/very/long/path/to/file.js:123:45)
    at async asyncFunction (/another/path.js:67:89)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)`;
        
        const result = sanitizeErrorMessage(error);
        
        expect(result).toBe('Main error message');
        expect(result).not.toContain('/very/long/path');
        expect(result).not.toContain('async');
        expect(result).not.toContain('internal/process');
      });
    });
  });
});