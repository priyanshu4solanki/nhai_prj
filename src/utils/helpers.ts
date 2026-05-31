export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const validateEmployeeId = (id: string): boolean => {
  // Employee ID format: Alphanumeric or hyphen, 3-20 characters (e.g., NHAI-101)
  const regex = /^[A-Za-z0-9-]{3,20}$/;
  return regex.test(id);
};

export const calculateEyeAspectRatio = (
  leftEyeOpen: boolean,
  rightEyeOpen: boolean,
  verticalDistance: number,
  horizontalDistance: number
): number => {
  if (!leftEyeOpen || !rightEyeOpen) return 0;
  if (horizontalDistance === 0) return 0;
  return verticalDistance / horizontalDistance;
};

export const detectBlink = (
  currentEAR: number,
  previousEAR: number,
  threshold: number = 0.2
): boolean => {
  // Blink detected if EAR drops significantly
  return previousEAR > threshold && currentEAR <= threshold;
};

export const generateRandomFaceVector = (): number[] => {
  const vec: number[] = [];
  for (let i = 0; i < 128; i++) {
    vec.push(Math.random() * 2 - 1);
  }
  // Normalize vector
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(val => (mag > 0 ? val / mag : val));
};
