import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../types';
import {COLORS, SIZES} from '../constants';
import {globalStyles} from '../theme';
import {insertOrUpdateEmployee} from '../services/databaseService';
import {validateEmployeeId, computeFaceVector} from '../utils';
import {useTranslation} from 'react-i18next';

type RegisterScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Register'
>;

// Hardcoded admin username for verification
const ADMIN_USERNAME = 'Priyanshu solanki';

const DEPARTMENTS = [
  {label: 'Engineering', value: 'engineering'},
  {label: 'Administration', value: 'admin'},
  {label: 'Finance', value: 'finance'},
  {label: 'HR', value: 'hr'},
  {label: 'Operations', value: 'operations'},
];

const RegisterScreen: React.FC<RegisterScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const adminUser = route?.params?.adminUser;

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Real-time face tracking state
  const [detectedFace, setDetectedFace] = useState<any>(null);
  const [isAligned, setIsAligned] = useState(false);
  const [cameraInstruction, setCameraInstruction] = useState(
    'Align face inside the oval frame',
  );

  const cameraRef = useRef<RNCamera | null>(null);

  // Verify admin access
  if (!adminUser || adminUser !== ADMIN_USERNAME) {
    return (
      <SafeAreaView style={[styles.container, globalStyles.container]}>
        <View style={styles.unauthorizedContainer}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>
            {t('register.accessDenied')}
          </Text>
          <Text style={styles.unauthorizedText}>
            {t('register.onlyAdminsCanRegister')}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleFacesDetected = ({faces}: {faces: any[]}) => {
    if (faces.length === 0) {
      setIsAligned(false);
      setCameraInstruction('No face detected. Look directly into camera.');
      setDetectedFace(null);
      return;
    }

    if (faces.length > 1) {
      setIsAligned(false);
      setCameraInstruction('Multiple faces detected. Keep one face in frame.');
      setDetectedFace(null);
      return;
    }

    const face = faces[0];
    setDetectedFace(face);

    const {origin, size} = face.bounds;
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Check bounds center relative to the viewport
    const faceCenterX = origin.x + size.width / 2;
    const faceCenterY = origin.y + size.height / 2;

    const viewportCenterX = screenWidth / 2;
    const viewportCenterY = screenHeight / 2 - 40;

    const isXCentered = Math.abs(faceCenterX - viewportCenterX) < 110;
    const isYCentered = Math.abs(faceCenterY - viewportCenterY) < 130;

    if (!isXCentered || !isYCentered) {
      setCameraInstruction('Align face inside the oval frame');
      setIsAligned(false);
    } else if (size.width < 120) {
      setCameraInstruction('Move closer to the camera');
      setIsAligned(false);
    } else if (size.width > 270) {
      setCameraInstruction('Move away from the camera');
      setIsAligned(false);
    } else {
      const vector = computeFaceVector(face);
      if (vector) {
        setCameraInstruction('Perfect! Hold still and tap Capture.');
        setIsAligned(true);
      } else {
        setCameraInstruction(
          'Look straight, ensure eyes and mouth are visible',
        );
        setIsAligned(false);
      }
    }
  };

  const handleStartCapture = () => {
    setError('');

    if (!employeeId.trim()) {
      setError(t('errors.enterEmployeeId'));
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError(t('errors.invalidEmployeeIdFormat'));
      return;
    }

    if (!name.trim()) {
      setError(t('errors.enterFullName'));
      return;
    }

    if (!selectedDepartment) {
      setError(t('login.selectDepartment'));
      return;
    }

    setShowCamera(true);
  };

  const handleCaptureAndRegister = async () => {
    if (isLoading) {
      return;
    }
    setError('');

    if (!detectedFace) {
      setError(
        'No face detected in camera frame. Please align face before capturing.',
      );
      return;
    }

    if (!isAligned) {
      setError(
        'Face is not properly aligned. Please center face inside the oval.',
      );
      return;
    }

    setIsLoading(true);

    try {
      // Simulate physical snapshot delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract facial embedding vector from the real detected face landmarks
      const faceVector = computeFaceVector(detectedFace);

      if (!faceVector) {
        setError(
          'Failed to extract facial features. Ensure good lighting and look straight.',
        );
        setIsLoading(false);
        return;
      }

      const employeeData = {
        id: employeeId.trim().toUpperCase(),
        name: name.trim(),
        department: selectedDepartment,
        faceVector: faceVector,
      };

      const result = await insertOrUpdateEmployee(employeeData);

      if (result.success) {
        setSuccess(true);
        setShowCamera(false);
      } else {
        const errorMsg =
          typeof result.error === 'string'
            ? result.error
            : (result.error as any)?.message ||
              JSON.stringify(result.error) ||
              'Unknown Database Error';
        setError(t('errors.databaseSaveFailed', {error: errorMsg}));
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(t('errors.registrationFailed', {error: err?.message || err}));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
        <View style={styles.successCard}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{t('register.successTitle')}</Text>
          <Text style={styles.successText}>
            {t('register.successMessage', {id: employeeId.toUpperCase()})}
          </Text>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('register.nameLabel')}</Text>
              <Text style={styles.receiptValue}>{name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>
                {t('login.departmentLabel')}
              </Text>
              <Text style={styles.receiptValue}>
                {t(`departments.${selectedDepartment}`)}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>
                {t('register.facialEmbeddingLabel')}
              </Text>
              <Text style={styles.receiptValue}>
                {t('register.embeddingStored')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.doneButtonText}>
              {t('register.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <RNCamera
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          type={RNCamera.Constants.Type.front}
          flashMode={RNCamera.Constants.FlashMode.off}
          captureAudio={false}
          faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.accurate}
          faceDetectionLandmarks={
            RNCamera.Constants.FaceDetection.Landmarks.all
          }
          faceDetectionClassifications={
            RNCamera.Constants.FaceDetection.Classifications.all
          }
          onFacesDetected={handleFacesDetected}
          androidCameraPermissionOptions={{
            title: t('common.cameraPermissionTitle'),
            message: t('common.cameraPermissionMessage'),
            buttonPositive: t('common.ok'),
            buttonNegative: t('common.cancel'),
          }}
        />

        {/* Alignment Oval Overlay */}
        <View style={styles.cameraOverlayContainer}>
          <View
            style={[
              styles.ovalHole,
              isAligned && {borderColor: COLORS.success},
            ]}
          />
          <View style={styles.guideContainer}>
            <Text style={styles.cameraGuideText}>{cameraInstruction}</Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.cancelCaptureButton}
            onPress={() => setShowCamera(false)}
            disabled={isLoading}>
            <Text style={styles.cancelCaptureText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureActionButton, !isAligned && {opacity: 0.5}]}
            onPress={handleCaptureAndRegister}
            disabled={isLoading || !isAligned}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.innerCaptureButton} />
            )}
          </TouchableOpacity>

          <View style={{width: 70}} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('register.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('register.subtitle')}</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Employee ID */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('login.employeeIdLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('register.employeeIdPlaceholder')}
              value={employeeId}
              onChangeText={text => {
                setEmployeeId(text.toUpperCase());
                setError('');
              }}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('register.fullNameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('register.fullNamePlaceholder')}
              value={name}
              onChangeText={text => {
                setName(text);
                setError('');
              }}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Department */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('login.departmentLabel')}</Text>
            <TouchableOpacity
              style={styles.departmentButton}
              onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}>
              <Text
                style={[
                  styles.departmentButtonText,
                  !selectedDepartment && {color: COLORS.textTertiary},
                ]}>
                {selectedDepartment
                  ? t(`departments.${selectedDepartment}`)
                  : t('login.selectDepartmentPlaceholder')}
              </Text>
            </TouchableOpacity>

            {showDepartmentPicker && (
              <View style={styles.departmentDropdown}>
                {DEPARTMENTS.map(dept => (
                  <TouchableOpacity
                    key={dept.value}
                    style={[
                      styles.departmentOption,
                      selectedDepartment === dept.value &&
                        styles.departmentOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDepartment(dept.value);
                      setShowDepartmentPicker(false);
                      setError('');
                    }}>
                    <Text
                      style={[
                        styles.departmentOptionText,
                        selectedDepartment === dept.value &&
                          styles.departmentOptionTextSelected,
                      ]}>
                      {t(`departments.${dept.value}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Proceed to Capture Button */}
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleStartCapture}>
            <Text style={styles.proceedButtonText}>
              {t('register.captureButton')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    justifyContent: 'space-between',
  },
  headerContainer: {
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
  },
  headerTitle: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  headerSubtitle: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
  },
  formContainer: {
    marginVertical: SIZES.md,
  },
  fieldContainer: {
    marginBottom: SIZES.xl,
  },
  label: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1', // Slate-300 border
    borderRadius: 10, // Smoother rounded corners
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.white, // Pure white background
  },
  departmentButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  departmentButtonText: {
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  departmentDropdown: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    marginTop: SIZES.sm,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  departmentOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  departmentOptionSelected: {
    backgroundColor: COLORS.gray100,
  },
  departmentOptionText: {
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  departmentOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.lg,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  proceedButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  backButton: {
    borderRadius: 10,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.md,
  },
  backButtonText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Camera Layout
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  cameraOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalHole: {
    width: width * 0.7,
    height: height * 0.45,
    borderRadius: (width * 0.7) / 2,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  guideContainer: {
    marginTop: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: SIZES.base,
  },
  cameraGuideText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    textAlign: 'center',
    fontWeight: '500',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cancelCaptureButton: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
  },
  cancelCaptureText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  captureActionButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCaptureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  // Success Card
  successCard: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.xl,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  successBadgeText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  successText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.xl,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.xl,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.sm,
  },
  receiptLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.buttonRadius,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  // Unauthorized Access
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  unauthorizedIcon: {
    fontSize: 64,
    marginBottom: SIZES.lg,
  },
  unauthorizedTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  unauthorizedText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
});

export default RegisterScreen;
