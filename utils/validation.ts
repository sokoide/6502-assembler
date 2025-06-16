// Input validation utilities

export const validateAssemblyCode = (code: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (typeof code !== 'string') {
    errors.push('Assembly code must be a string');
    return { isValid: false, errors };
  }
  
  if (code.length > 50000) {
    errors.push('Assembly code is too long (maximum 50,000 characters)');
  }
  
  // Check for potentially dangerous patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:.*base64/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(code)) {
      errors.push('Assembly code contains suspicious content');
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateSampleIndex = (index: string, maxIndex: number): boolean => {
  const numIndex = parseInt(index, 10);
  return !isNaN(numIndex) && numIndex >= 0 && numIndex < maxIndex;
};

export const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Remove potentially sensitive information from stack traces
    return error.message.replace(/\s+at\s+.*/g, '');
  }
  
  if (typeof error === 'string') {
    return error.substring(0, 500); // Limit length
  }
  
  return 'An unknown error occurred';
};