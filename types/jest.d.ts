/**
 * Jest DOM type extensions and custom matchers
 */

/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMachineCode(): R;
      toBeValidAssemblyResult(): R;
      // Jest DOM matchers
      toBeInTheDocument(): R;
      toHaveAccessibleName(name?: string | RegExp): R;
      toHaveFocus(): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}