/**
 * Face vector utility functions for face recognition
 */

export const compareFaceVectors = (
  vector1: number[],
  vector2: number[]
): { similarity: number; matched: boolean } => {
  if (vector1.length !== vector2.length) {
    return { similarity: 0, matched: false };
  }

  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);

  const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return { similarity: 0, matched: false };
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);

  // Threshold for face match (typically 0.6-0.7)
  const threshold = 0.65;
  const matched = similarity > threshold;

  return { similarity, matched };
};

export const calculateEuclideanDistance = (
  vector1: number[],
  vector2: number[]
): number => {
  if (vector1.length !== vector2.length) {
    return Infinity;
  }

  const sumOfSquares = vector1.reduce((sum, a, i) => {
    const diff = a - vector2[i];
    return sum + diff * diff;
  }, 0);

  return Math.sqrt(sumOfSquares);
};

export const normalizeFaceVector = (vector: number[]): number[] => {
  const magnitude = Math.sqrt(vector.reduce((sum, a) => sum + a * a, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map(v => v / magnitude);
};

export const generateFaceVectorHash = (vector: number[]): string => {
  // Create a simple hash of the vector for storage/comparison
  const hash = vector.slice(0, 10).join(',');
  return Buffer.from(hash).toString('base64');
};
