export const STRINGS = {
  // App name and branding
  appName: 'NHAI Attendance',
  appTitle: 'National Highways Authority of India',
  appSubtitle: 'Face Recognition Attendance System',

  // Splash Screen
  splash: {
    loadingModel: 'Loading AI Model...',
    initializingCamera: 'Initializing Camera...',
    checkingConnectivity: 'Checking Connectivity...',
    initializingDatabase: 'Setting up Database...',
    online: 'Online',
    offline: 'Offline',
    ready: 'Ready',
  },

  // Login Screen
  login: {
    title: 'Employee Login',
    employeeIdLabel: 'Employee ID',
    employeeIdPlaceholder: 'Enter your ID',
    departmentLabel: 'Department',
    selectDepartment: 'Select Department',
    startButton: 'Start Attendance',
    invalidEmployeeId: 'Invalid Employee ID',
    selectDepartment: 'Please select a department',
  },

  // Face Authentication
  faceAuth: {
    title: 'Face Verification',
    subtitle: 'Position your face in the frame',
    detectingFace: 'Detecting Face...',
    faceDetected: 'Face Detected',
    faceNotDetected: 'Face Not Detected',
    moveCloser: 'Move closer to the camera',
    moveAway: 'Move away from the camera',
    improperLighting: 'Improper lighting',
    multiplesFaces: 'Multiple faces detected',
    retryButton: 'Retry',
    continueButton: 'Continue',
  },

  // Liveness Detection
  liveness: {
    title: 'Liveness Detection',
    subtitle: 'Blink slowly to prove you are alive',
    detecting: 'Detecting...',
    blinkDetected: 'Blink detected',
    keepBlinking: 'Keep blinking',
    spoofDetected: 'Spoof detected!',
    spoofWarning: 'This appears to be a photo or video',
    livenessConfirmed: 'You are alive!',
  },

  // Face Recognition
  recognition: {
    title: 'Face Recognition',
    processing: 'Processing face...',
    comparingFace: 'Comparing face...',
    matchFound: 'Match Found',
    noMatch: 'No Match',
    lowConfidence: 'Low confidence match',
  },

  // Result Screen
  result: {
    success: 'Attendance Recorded',
    failure: 'Attendance Failed',
    successMessage: 'Your attendance has been recorded successfully',
    failureMessage: 'Unable to record attendance. Please try again.',
    confirmAttendance: 'Confirm Attendance',
    retryButton: 'Retry',
    homeButton: 'Go Home',
    checkIn: 'Check In',
    checkOut: 'Check Out',
  },

  // Offline/Sync
  sync: {
    title: 'Sync Attendance',
    syncing: 'Syncing records...',
    syncComplete: 'Sync Complete',
    pendingRecords: 'Pending Records',
    uploadRecords: 'Upload Records',
    purgeRecords: 'Purge Records',
    noRecords: 'No records to sync',
    syncError: 'Sync error, please try again',
  },

  // Common
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    retry: 'Retry',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    noInternet: 'No Internet Connection',
    tryAgain: 'Try Again',
    checkingPermissions: 'Checking permissions...',
    cameraPermissionRequired: 'Camera permission required',
    grantPermissions: 'Grant Permissions',
  },
};
