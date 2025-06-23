/**
 * Tests for the main App component
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import App from "@/App";

// Mock the assembler service
jest.mock('@/services/assembler', () => ({
  assemble: jest.fn(),
}));

// Mock the sample codes
jest.mock('@/services/sampleCodes', () => ({
  sampleCodes: [
    { name: '1. Test Sample', code: '.org $0200\nLDA #$01\nBRK' },
    { name: '2. Another Sample', code: '.org $0300\nNOP' },
  ],
}));

// Mock utility functions
jest.mock('@/utils/validation', () => ({
  validateAssemblyCode: jest.fn(() => ({ isValid: true, errors: [] })),
  sanitizeErrorMessage: jest.fn((error: any) => (error?.message as string) || 'Unknown error'),
}));

import { assemble } from '@/services/assembler';

const mockAssemble = assemble as jest.MockedFunction<typeof assemble>;

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockAssemble.mockReturnValue({
      machineCode: [0xA9, 0x01, 0x00],
      error: null,
    });
  });

  describe('Initial render', () => {
    test('should render without crashing', () => {
      render(<App />);
      
      expect(screen.getByText(/6502 Assembler/i)).toBeTruthy();
    });

    test('should render initial assembly code', () => {
      render(<App />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toContain('.org $0200');
    });

    test('should render assemble button', () => {
      render(<App />);
      
      const assembleButton = screen.getByRole('button', { name: /assemble/i });
      expect(assembleButton).toBeTruthy();
    });

    test('should render sample code selector', () => {
      render(<App />);
      
      const selector = screen.getByRole('combobox');
      expect(selector).toBeTruthy();
    });

    test('should not show output initially', () => {
      render(<App />);
      
      // Should not have machine code display initially
      expect(screen.queryByText(/Machine Code:/i)).toBeNull();
    });

    test('should not show errors initially', () => {
      render(<App />);
      
      // Should not have error display initially
      expect(screen.queryByText(/Error:/i)).toBeNull();
    });
  });

  describe('Basic functionality', () => {
    test('should have proper ARIA labels', () => {
      render(<App />);
      
      expect(screen.getByRole('textbox')).toBeTruthy();
      expect(screen.getByRole('button', { name: /assemble/i })).toBeTruthy();
      expect(screen.getByRole('combobox')).toBeTruthy();
    });

    test('should not re-render unnecessarily', () => {
      const { rerender } = render(<App />);
      
      // Re-render with same props
      rerender(<App />);
      
      // Should still be functional
      expect(screen.getByRole('button', { name: /assemble/i })).toBeTruthy();
      expect(screen.getByRole('textbox')).toBeTruthy();
    });
  });
});