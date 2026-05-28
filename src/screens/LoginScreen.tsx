import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';
import { validateEmployeeId } from '../utils';
import { startSession } from '../services/databaseService';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const DEPARTMENTS = [
  { label: 'Engineering', value: 'engineering' },
  { label: 'Administration', value: 'admin' },
  { label: 'Finance', value: 'finance' },
  { label: 'HR', value: 'hr' },
  { label: 'Operations', value: 'operations' },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    // Validation
    if (!employeeId.trim()) {
      setError(STRINGS.login.invalidEmployeeId);
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError('Invalid Employee ID format');
      return;
    }

    if (!selectedDepartment) {
      setError(STRINGS.login.selectDepartment);
      return;
    }

    try {
      setIsLoading(true);

      // Start session
      await startSession(employeeId, selectedDepartment);

      // Navigate to Face Authentication
      navigation.navigate('FaceAuth', {
        employeeId,
        department: selectedDepartment,
      });
    } catch (err) {
      setError('Failed to start session');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{STRINGS.login.title}</Text>
          <Text style={styles.headerSubtitle}>
            {STRINGS.appSubtitle}
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Employee ID Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{STRINGS.login.employeeIdLabel}</Text>
            <TextInput
              style={[
                styles.input,
                error && employeeId === '' && styles.inputError,
              ]}
              placeholder={STRINGS.login.employeeIdPlaceholder}
              value={employeeId}
              onChangeText={text => {
                setEmployeeId(text.toUpperCase());
                setError('');
              }}
              editable={!isLoading}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Department Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{STRINGS.login.departmentLabel}</Text>
            <TouchableOpacity
              style={[
                styles.departmentButton,
                error && !selectedDepartment && styles.inputError,
              ]}
              onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
              disabled={isLoading}>
              <Text
                style={[
                  styles.departmentButtonText,
                  !selectedDepartment && { color: COLORS.textTertiary },
                ]}>
                {selectedDepartment
                  ? DEPARTMENTS.find(d => d.value === selectedDepartment)?.label
                  : STRINGS.login.selectDepartment}
              </Text>
            </TouchableOpacity>

            {/* Department Picker Dropdown */}
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

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>
                {STRINGS.login.startButton}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Please ensure you have proper lighting and a clear view of your face.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
  },
  headerContainer: {
    marginTop: SIZES['3xl'],
    marginBottom: SIZES['3xl'],
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
    marginVertical: SIZES.xl,
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
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff3f3',
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
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.xl,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  infoContainer: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginTop: SIZES.xl,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;
