// Formatting utilities for machine code and assembly

export const formatMachineCode = (bytes: number[]): string => {
  return bytes
    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
};

export const formatElapsedTime = (ms: number): string => {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(1)} μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  } else {
    return `${(ms / 1000).toFixed(2)} s`;
  }
};

export const formatByteCount = (count: number): string => {
  return `${count} byte${count !== 1 ? 's' : ''}`;
};

export const formatAddress = (address: number, prefix = '$'): string => {
  return `${prefix}${address.toString(16).toUpperCase().padStart(4, '0')}`;
};