/**
 * Jest setup file for global test configuration
 */

import '@testing-library/jest-dom';
import { jest, beforeAll, afterAll, expect } from '@jest/globals';

// Mock window.performance for timing tests
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('deprecated')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities (types defined in types/jest.d.ts)

// Custom matchers
expect.extend({
  toBeValidMachineCode(received: number[]) {
    const pass = Array.isArray(received) && 
                 received.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be valid machine code`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be valid machine code (array of bytes 0-255)`,
        pass: false,
      };
    }
  },
  
  toBeValidAssemblyResult(received: any) {
    const pass = received &&
                 typeof received === 'object' &&
                 Array.isArray(received.machineCode) &&
                 (received.error === null || typeof received.error === 'string');
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be valid AssembleResult`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be valid AssembleResult with machineCode array and error string|null`,
        pass: false,
      };
    }
  },
});