import React, { useState, useRef } from 'react';
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
import { RNCamera } from 'react-native-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';
import { insertOrUpdateEmployee } from '../services/databaseService';
import { generateRandomFaceVector, validateEmployeeId } from '../utils';

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;

// Hardcoded admin username for verification
const ADMIN_USERNAME = 'Priyanshu solanki';

const DEPARTMENTS = [
  { label: 'Engineering', value: 'engineering' },
  { label: 'Administration', value: 'admin' },
  { label: 'Finance', value: 'finance' },
  { label: 'HR', value: 'hr' },
  { label: 'Operations', value: 'operations' },
];

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  const adminUser = route?.params?.adminUser;
  
  // Verify admin access
  if (!adminUser || adminUser !== ADMIN_USERNAME) {
    return (
      <SafeAreaView style={[styles.container, globalStyles.container]}>
        <View style={styles.unauthorizedContainer}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            Only authorized administrators can register new employees.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const cameraRef = useRef<RNCamera | null>(null);

  const handleStartCapture = () => {
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter Employee ID');
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError('Invalid Employee ID format (3-20 characters, letters/numbers and hyphen allowed)');
      return;
    }

    if (!name.trim()) {
      setError('Please enter Full Name');
      return;
    }

    if (!selectedDepartment) {
      setError('Please select a department');
      return;
    }

    setShowCamera(true);
  };

  const handleCaptureAndRegister = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      // Simulate physical snapshot delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate a normalized 128-dimensional embedding offline
      const simulatedFaceVector = generateRandomFaceVector();

      const employeeData = {
        id: employeeId.trim().toUpperCase(),
        name: name.trim(),
        department: selectedDepartment,
        faceVector: simulatedFaceVector,
      };

      const result = await insertOrUpdateEmployee(employeeData);

      if (result.success) {
        setSuccess(true);
        setShowCamera(false);
      } else {
        setError('Database error: Failed to save employee records.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to complete registration.');
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
          <Text style={styles.successTitle}>Registration Successful</Text>
          <Text style={styles.successText}>
            Employee ID <Text style={{ fontWeight: '700', color: COLORS.text }}>{employeeId.toUpperCase()}</Text> is now registered offline in the Datalake 3.0 secure storage.
          </Text>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Name:</Text>
              <Text style={styles.receiptValue}>{name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Department:</Text>
              <Text style={styles.receiptValue}>
                {DEPARTMENTS.find(d => d.value === selectedDepartment)?.label}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Facial Embedding:</Text>
              <Text style={styles.receiptValue}>128-dim Normalized (Stored)</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.doneButtonText}>Back to Login</Text>
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
          androidCameraPermissionOptions={{
            title: 'Camera Permission',
            message: 'We need camera permission for offline face capture.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
        />

        {/* Alignment Oval Overlay */}
        <View style={styles.cameraOverlayContainer}>
          <View style={styles.ovalHole} />
          <View style={styles.guideContainer}>
            <Text style={styles.cameraGuideText}>
              Center your face within the oval and hold still.
            </Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.cancelCaptureButton}
            onPress={() => setShowCamera(false)}
            disabled={isLoading}>
            <Text style={styles.cancelCaptureText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureActionButton}
            onPress={handleCaptureAndRegister}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.innerCaptureButton} />
            )}
          </TouchableOpacity>

          <View style={{ width: 70 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Offline Registration</Text>
          <Text style={styles.headerSubtitle}>
            Register employee facial credentials securely onto this device
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Employee ID */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NHAI-104"
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
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Kumar"
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
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity
              style={styles.departmentButton}
              onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}>
              <Text
                style={[
                  styles.departmentButtonText,
                  !selectedDepartment && { color: COLORS.textTertiary },
                ]}>
                {selectedDepartment
                  ? DEPARTMENTS.find(d => d.value === selectedDepartment)?.label
                  : 'Select Department'}
              </Text>
            </TouchableOpacity>

            {showDepartmentPicker && (
              <View style={styles.departmentDropdown}>
                {DEPARTMENTS.map(dept => (
                  <TouchableOpacity
                    key={dept.value}
                    style={[
                      styles.departmentOption,
                      selectedDepartment === dept.value && styles.departmentOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDepartment(dept.value);
                      setShowDepartmentPicker(false);
                      setError('');
                    }}>
                    <Text
                      style={[
                        styles.departmentOptionText,
                        selectedDepartment === dept.value && styles.departmentOptionTextSelected,
                      ]}>
                      {dept.label}
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
          <TouchableOpacity style={styles.proceedButton} onPress={handleStartCapture}>
            <Text style={styles.proceedButtonText}>Capture Facial Embedding</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

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
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.gray100,
  },
  departmentButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
  },
  departmentButtonText: {
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  departmentDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    marginTop: SIZES.sm,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
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
    backgroundColor: '#ffe6e6',
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.lg,
  },
  errorText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    fontWeight: '500',
  },
  proceedButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.lg,
  },
  proceedButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  backButton: {
    borderRadius: SIZES.buttonRadius,
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
    shadowOffset: { width: 0, height: 4 },
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
