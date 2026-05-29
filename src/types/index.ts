// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  AdminDashboard: undefined;
  Register: undefined;
  FaceAuth: { employeeId: string; department: string };
  Liveness: { employeeId: string; department: string };
  Recognition: { employeeId: string; department: string; faceVector?: number[] };
  Result: {
    employeeId: string;
    status: 'success' | 'failure';
    message?: string;
    timestamp?: number;
  };
  Sync: undefined;
  Home: undefined;
};

// Face detection and recognition types
export interface FaceDetectionResult {
  detected: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
  confidence: number;
}

export interface LivenessResult {
  isAlive: boolean;
  blinkCount: number;
  eyeAspectRatio: number;
  spoofScore: number;
  confidence: number;
}

export interface FaceEmbedding {
  vector: number[];
  timestamp: number;
  employeeId: string;
  confidence: number;
}

export interface RecognitionResult {
  matched: boolean;
  matchedEmployeeId?: string;
  similarity: number;
  confidence: number;
}

// Attendance record types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  department: string;
  timestamp: number;
  type: 'check-in' | 'check-out';
  location?: string;
  verified: boolean;
  syncedToServer: boolean;
  faceConfidence: number;
  livenessConfidence: number;
  recognitionConfidence: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  photoPath?: string;
  faceVector?: number[];
  createdAt: number;
  updatedAt: number;
}

// Session types
export interface Session {
  employeeId: string;
  department: string;
  startTime: number;
  isActive: boolean;
}

// App state types
export interface AppState {
  isOnline: boolean;
  isInitialized: boolean;
  currentSession?: Session;
  lastAttendance?: AttendanceRecord;
}

// Camera and ML Kit types
export interface CameraPermissionStatus {
  granted: boolean;
  reason?: string;
}

export interface ModelStatus {
  loaded: boolean;
  error?: string;
  loadTime?: number;
}
