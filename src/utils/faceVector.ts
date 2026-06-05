/**
 * Face vector utility functions for face recognition
 */

export const compareFaceVectors = (
  vector1: number[],
  vector2: number[],
  customThreshold?: number,
): {similarity: number; matched: boolean} => {
  if (vector1.length !== vector2.length) {
    return {similarity: 0, matched: false};
  }

  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);

  const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return {similarity: 0, matched: false};
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);

  // Threshold for face match (typically 0.6-0.7 for DL embeddings, higher for centered ratios)
  const threshold = customThreshold !== undefined ? customThreshold : 0.65;
  const matched = similarity > threshold;

  return {similarity, matched};
};

export const calculateEuclideanDistance = (
  vector1: number[],
  vector2: number[],
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

/**
 * Computes a scale-invariant ratio vector from 5 facial landmarks
 * (left eye, right eye, nose base, left mouth corner, right mouth corner).
 * The vector is centered around an average human face template and scaled,
 * then padded to 128 elements to match database schema format.
 */
export const computeFaceVector = (face: any): number[] | null => {
  if (!face) {
    return null;
  }

  const leftEye = face.leftEyePosition;
  const rightEye = face.rightEyePosition;
  const nose = face.noseBasePosition;
  const leftMouth = face.leftMouthPosition;
  const rightMouth = face.rightMouthPosition;

  if (!leftEye || !rightEye || !nose || !leftMouth || !rightMouth) {
    console.log('Skipping face vector: missing crucial landmarks', {
      leftEye: !!leftEye,
      rightEye: !!rightEye,
      nose: !!nose,
      leftMouth: !!leftMouth,
      rightMouth: !!rightMouth,
    });
    return null;
  }

  const dist = (p1: {x: number; y: number}, p2: {x: number; y: number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const d_eyes = dist(leftEye, rightEye);
  if (d_eyes === 0) {
    return null;
  }

  const d_nose_leftEye = dist(nose, leftEye);
  const d_nose_rightEye = dist(nose, rightEye);
  const d_mouth = dist(leftMouth, rightMouth);

  const mouthCenter = {
    x: (leftMouth.x + rightMouth.x) / 2,
    y: (leftMouth.y + rightMouth.y) / 2,
  };
  const d_nose_mouth = dist(nose, mouthCenter);
  const d_leftEye_leftMouth = dist(leftEye, leftMouth);
  const d_rightEye_rightMouth = dist(rightEye, rightMouth);

  // Build a 128-element vector with unique values derived from face geometry
  // We use multiple geometric relationships to create a person-specific fingerprint
  const vector: number[] = [];

  // Compute 6 scale-invariant proportions normalized by eye-to-eye distance
  const ratios = [
    d_nose_leftEye / d_eyes,
    d_nose_rightEye / d_eyes,
    d_mouth / d_eyes,
    d_nose_mouth / d_eyes,
    d_leftEye_leftMouth / d_eyes,
    d_rightEye_rightMouth / d_eyes,
  ];
  // Center around average human face proportions, then scale
  const meanRatios = [1.0, 1.0, 0.9, 0.8, 1.3, 1.3];
  const centered = ratios.map((r, i) => r - meanRatios[i]);
  const scaled = centered.map(val => val * 10);

  // Block 1: 6 base scaled ratios
  for (const r of scaled) {
    vector.push(r);
  }

  // Block 2: Cross-landmark distances normalized by eye distance
  const d_leftEye_rightMouth = dist(leftEye, rightMouth);
  const d_rightEye_leftMouth = dist(rightEye, leftMouth);
  const d_leftEye_nose = dist(leftEye, nose);
  const d_rightEye_nose = dist(rightEye, nose);
  const d_leftMouth_nose = dist(leftMouth, nose);
  const d_rightMouth_nose = dist(rightMouth, nose);
  vector.push(
    (d_leftEye_rightMouth / d_eyes) * 5,
    (d_rightEye_leftMouth / d_eyes) * 5,
    (d_leftEye_nose / d_eyes) * 5,
    (d_rightEye_nose / d_eyes) * 5,
    (d_leftMouth_nose / d_eyes) * 5,
    (d_rightMouth_nose / d_eyes) * 5,
  );

  // Block 3: Angle-based features (face tilt, mouth angle, etc.)
  const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  const mouthAngle = Math.atan2(
    rightMouth.y - leftMouth.y,
    rightMouth.x - leftMouth.x,
  );
  const noseToMouthAngle = Math.atan2(
    mouthCenter.y - nose.y,
    mouthCenter.x - nose.x,
  );
  const leftEyeToMouthAngle = Math.atan2(
    leftMouth.y - leftEye.y,
    leftMouth.x - leftEye.x,
  );
  const rightEyeToMouthAngle = Math.atan2(
    rightMouth.y - rightEye.y,
    rightMouth.x - rightEye.x,
  );
  vector.push(
    eyeAngle * 3,
    mouthAngle * 3,
    noseToMouthAngle * 3,
    leftEyeToMouthAngle * 3,
    rightEyeToMouthAngle * 3,
    (eyeAngle - mouthAngle) * 4,
  );

  // Block 4: Absolute position ratios (relative to bounding box)
  const {origin, size} = face.bounds || {
    origin: {x: 0, y: 0},
    size: {width: 1, height: 1},
  };
  const fw = size.width || 1;
  const fh = size.height || 1;
  const fx = origin.x;
  const fy = origin.y;
  const toRel = (p: {x: number; y: number}) => ({
    rx: ((p.x - fx) / fw - 0.5) * 4,
    ry: ((p.y - fy) / fh - 0.5) * 4,
  });
  const leRel = toRel(leftEye);
  const reRel = toRel(rightEye);
  const nRel = toRel(nose);
  const lmRel = toRel(leftMouth);
  const rmRel = toRel(rightMouth);
  vector.push(
    leRel.rx,
    leRel.ry,
    reRel.rx,
    reRel.ry,
    nRel.rx,
    nRel.ry,
    lmRel.rx,
    lmRel.ry,
    rmRel.rx,
    rmRel.ry,
  );

  // Block 5: Second-order cross products (encode face asymmetry)
  const asymmetryEye = Math.abs(d_nose_leftEye - d_nose_rightEye) / d_eyes;
  const asymmetryMouth =
    Math.abs(d_leftEye_leftMouth - d_rightEye_rightMouth) / d_eyes;
  const eyeToMouthRatio = d_mouth / (d_nose_mouth || 1);
  const faceAspect = fh / (fw || 1);
  vector.push(
    asymmetryEye * 10,
    asymmetryMouth * 10,
    eyeToMouthRatio * 4,
    faceAspect * 2,
    (leRel.rx - reRel.rx) * 3,
    (lmRel.ry - rmRel.ry) * 3,
  );

  // Block 6: Nonlinear (squared) features to amplify discrimination
  for (const r of ratios) {
    vector.push(r * r * 2);
  }

  // Pad remaining elements with interpolated cross-features
  while (vector.length < 128) {
    const i = vector.length;
    const a = vector[i % 18];
    const b = vector[(i + 7) % 18];
    vector.push((a * 1.3 + b * 0.7) / 2);
  }

  return vector.slice(0, 128);
};
