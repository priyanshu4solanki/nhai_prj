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
import { startSession, getEmployee } from '../services/databaseService';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginMode = 'employee' | 'admin';

// Hardcoded admin credentials (in production, use secure storage)
const ADMIN_CREDENTIALS = {
  username: 'Priyanshu solanki',
  password: 'Passnhai',
};

const DEPARTMENTS = [
  { label: 'Engineering', value: 'engineering' },
  { label: 'Administration', value: 'admin' },
  { label: 'Finance', value: 'finance' },
  { label: 'HR', value: 'hr' },
  { label: 'Operations', value: 'operations' },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [loginMode, setLoginMode] = useState<LoginMode>('employee');

  // Employee state
  const [employeeId, setEmployeeId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  // Admin state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Shared state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setError('');
    setIsLoading(false);
  };

  // ─── Admin Login ───
  const handleAdminLogin = async () => {
    setError('');

    if (!adminUsername.trim()) {
      setError('Please enter admin username');
      return;
    }
    if (!adminPassword.trim()) {
      setError('Please enter admin password');
      return;
    }

    setIsLoading(true);

    // Small delay to simulate auth check
    await new Promise(resolve => setTimeout(resolve, 400));

    if (
      adminUsername.trim() === ADMIN_CREDENTIALS.username &&
      adminPassword === ADMIN_CREDENTIALS.password
    ) {
      navigation.navigate('AdminDashboard', { adminUser: adminUsername.trim() });
    } else {
      setError('Invalid admin credentials. Please try again.');
    }

    setIsLoading(false);
  };

  // ─── Employee Login ───
  const handleEmployeeLogin = async () => {
    setError('');

    if (!employeeId.trim()) {
      setError(STRINGS.login.invalidEmployeeId);
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError('Invalid Employee ID format (3-20 characters, letters/numbers and hyphen allowed)');
      return;
    }

    if (!selectedDepartment) {
      setError(STRINGS.login.selectDepartment);
      return;
    }

    try {
      setIsLoading(true);

      const employee = await getEmployee(employeeId);
      if (!employee) {
        setError(
          `Employee ID "${employeeId}" is not registered. Contact your administrator to register.`
        );
        setIsLoading(false);
        return;
      }

      await startSession(employeeId, selectedDepartment);

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
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>NHAI</Text>
          </View>
          <Text style={styles.headerTitle}>{STRINGS.appSubtitle}</Text>
          <Text style={styles.headerSubtitle}>Datalake 3.0 • Offline Authentication</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, loginMode === 'employee' && styles.tabActive]}
            onPress={() => switchMode('employee')}>
            <Text
              style={[
                styles.tabText,
                loginMode === 'employee' && styles.tabTextActive,
              ]}>
              Employee
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, loginMode === 'admin' && styles.tabActive]}
            onPress={() => switchMode('admin')}>
            <Text
              style={[
                styles.tabText,
                loginMode === 'admin' && styles.tabTextActive,
              ]}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {loginMode === 'employee' ? (
            <>
              {/* ─── Employee Form ─── */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{STRINGS.login.employeeIdLabel}</Text>
                <TextInput
                  style={[
                    styles.input,
                    (error && employeeId === '') ? styles.inputError : null,
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

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{STRINGS.login.departmentLabel}</Text>
                <TouchableOpacity
                  style={[
                    styles.departmentButton,
                    (error && !selectedDepartment) ? styles.inputError : null,
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
                      : STRINGS.login.selectDepartmentPlaceholder}
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
                          {dept.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* ─── Admin Form ─── */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Admin Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter admin username"
                  value={adminUsername}
                  onChangeText={text => {
                    setAdminUsername(text);
                    setError('');
                  }}
                  autoCapitalize="none"
                  editable={!isLoading}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Admin Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChangeText={text => {
                    setAdminPassword(text);
                    setError('');
                  }}
                  secureTextEntry
                  editable={!isLoading}
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              <View style={styles.adminHintBox}>
                <Text style={styles.adminHintText}>
                  Admin access is required to register new employees and manage facial embeddings.
                </Text>
              </View>
            </>
          )}

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
              loginMode === 'admin' && styles.adminLoginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={loginMode === 'employee' ? handleEmployeeLogin : handleAdminLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>
                {loginMode === 'employee' ? STRINGS.login.startButton : 'Admin Login'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {loginMode === 'employee'
              ? 'Please ensure you have proper lighting and a clear view of your face for authentication.'
              : 'Only authorized NHAI administrators can register new employees and manage the system.'}
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
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
    alignItems: 'center',
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: SIZES.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  logoText: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // ─── Tab Switcher ───
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    padding: 4,
    marginBottom: SIZES.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.base - 2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // ─── Form ───
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
  adminHintBox: {
    backgroundColor: '#eef2ff',
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  adminHintText: {
    fontSize: SIZES.sm,
    color: '#4338ca',
    lineHeight: 18,
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
    marginTop: SIZES.md,
  },
  adminLoginButton: {
    backgroundColor: '#1e3a5f',
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
