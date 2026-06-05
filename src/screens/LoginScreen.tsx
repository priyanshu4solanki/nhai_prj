import React, {useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../types';
import {COLORS, SIZES} from '../constants';
import {globalStyles} from '../theme';
import {validateEmployeeId} from '../utils';
import {
  getEmployee,
  hasCompletedAttendanceToday,
} from '../services/databaseService';
import {useLanguage} from '../contexts/LanguageContext';
import {useTranslation} from 'react-i18next';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginMode = 'employee' | 'admin';

// Hardcoded admin credentials (in production, use secure storage)
const ADMIN_CREDENTIALS = {
  username: 'Priyanshu solanki',
  password: 'Passnhai',
};

const DEPARTMENTS = [
  {label: 'Engineering', value: 'engineering'},
  {label: 'Administration', value: 'admin'},
  {label: 'Finance', value: 'finance'},
  {label: 'HR', value: 'hr'},
  {label: 'Operations', value: 'operations'},
];

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [loginMode, setLoginMode] = useState<LoginMode>('employee');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const {changeLanguage, currentLanguage, supportedLanguages} = useLanguage();
  const {t} = useTranslation();

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

  useFocusEffect(
    React.useCallback(() => {
      setEmployeeId('');
      setSelectedDepartment('');
      setShowDepartmentPicker(false);
      setAdminUsername('');
      setAdminPassword('');
      setError('');
    }, []),
  );

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setError('');
    setIsLoading(false);
  };

  // ─── Admin Login ───
  const handleAdminLogin = async () => {
    setError('');

    if (!adminUsername.trim()) {
      setError(t('errors.enterAdminUsername'));
      return;
    }
    if (!adminPassword.trim()) {
      setError(t('errors.enterAdminPassword'));
      return;
    }

    setIsLoading(true);

    // Small delay to simulate auth check
    await new Promise(resolve => setTimeout(resolve, 400));

    if (
      adminUsername.trim() === ADMIN_CREDENTIALS.username &&
      adminPassword === ADMIN_CREDENTIALS.password
    ) {
      navigation.navigate('AdminDashboard', {adminUser: adminUsername.trim()});
    } else {
      setError(t('errors.invalidCredentials'));
    }

    setIsLoading(false);
  };

  // ─── Employee Login ───
  const handleEmployeeLogin = async () => {
    setError('');

    if (!employeeId.trim()) {
      setError(t('login.invalidEmployeeId'));
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError(t('errors.invalidEmployeeIdFormat'));
      return;
    }

    if (!selectedDepartment) {
      setError(t('login.selectDepartment'));
      return;
    }

    try {
      setIsLoading(true);

      const employee = await getEmployee(employeeId);
      if (!employee) {
        setError(t('errors.employeeNotRegistered', {id: employeeId}));
        setIsLoading(false);
        return;
      }

      // Check if employee has completed both check-in and check-out today
      const alreadyCompleted = await hasCompletedAttendanceToday(employeeId);
      if (alreadyCompleted) {
        setError(
          'Attendance already completed for today. You cannot log check-in/out multiple times.',
        );
        setIsLoading(false);
        return;
      }

      navigation.navigate('FaceAuth', {
        employeeId,
        department: selectedDepartment,
      });
    } catch (err) {
      setError(t('errors.failedToStartSession'));
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeViewAttendance = async () => {
    setError('');

    if (!employeeId.trim()) {
      setError(t('login.invalidEmployeeId'));
      return;
    }

    if (!validateEmployeeId(employeeId)) {
      setError(
        'Invalid Employee ID format (3-20 characters, letters/numbers and hyphen allowed)',
      );
      return;
    }

    if (!selectedDepartment) {
      setError(t('login.selectDepartment'));
      return;
    }

    try {
      setIsLoading(true);

      const employee = await getEmployee(employeeId);
      if (!employee) {
        setError(
          `Employee ID "${employeeId}" is not registered. Contact your administrator to register.`,
        );
        setIsLoading(false);
        return;
      }

      // Open their personal SyncScreen (My Attendance) directly
      navigation.navigate('Sync', {
        employeeId: employeeId.trim().toUpperCase(),
      });
    } catch (err) {
      setError('Failed to load attendance');
      console.error('View attendance error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      {/* Language Switcher Button */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setShowLanguageModal(true)}>
        <Text style={styles.languageButtonText}>
          🌐 {currentLanguage.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>{t('appSubtitle')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('login.datalakeSubtitle')}
          </Text>
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
              {t('login.employeeTab')}
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
              {t('login.adminTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {loginMode === 'employee' ? (
            <>
              {/* ─── Employee Form ─── */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('login.employeeIdLabel')}</Text>
                <TextInput
                  style={[
                    styles.input,
                    error && employeeId === '' ? styles.inputError : null,
                  ]}
                  placeholder={t('login.employeeIdPlaceholder')}
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
                <Text style={styles.label}>{t('login.departmentLabel')}</Text>
                <TouchableOpacity
                  style={[
                    styles.departmentButton,
                    error && !selectedDepartment ? styles.inputError : null,
                  ]}
                  onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
                  disabled={isLoading}>
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
            </>
          ) : (
            <>
              {/* ─── Admin Form ─── */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  {t('login.adminUsernameLabel')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.adminUsernamePlaceholder')}
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
                <Text style={styles.label}>
                  {t('login.adminPasswordLabel')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.adminPasswordPlaceholder')}
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
                  {t('login.adminAccessNotice')}
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
          {loginMode === 'employee' ? (
            <>
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleEmployeeLogin}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {t('login.startButton')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewAttendanceButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleEmployeeViewAttendance}
                disabled={isLoading}>
                <Text style={styles.viewAttendanceButtonText}>
                  {t('result.viewSyncQueue')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.loginButton,
                styles.adminLoginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleAdminLogin}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>
                  {t('login.adminLogin')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {loginMode === 'employee'
              ? t('login.employeeInfo')
              : t('login.adminInfo')}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('common.language')}</Text>

            <FlatList
              data={supportedLanguages}
              keyExtractor={item => item.code}
              scrollEnabled={false}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    currentLanguage === item.code &&
                      styles.languageOptionSelected,
                  ]}
                  onPress={async () => {
                    await changeLanguage(item.code);
                    setShowLanguageModal(false);
                  }}>
                  <Text
                    style={[
                      styles.languageOptionText,
                      currentLanguage === item.code &&
                        styles.languageOptionTextSelected,
                    ]}>
                    {item.name}
                  </Text>
                  {currentLanguage === item.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  settingsIconBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    zIndex: 100,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  settingsIconText: {
    fontSize: 22,
    color: '#475569',
    fontWeight: 'bold',
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
  logoImage: {
    width: 72,
    height: 72,
    marginBottom: SIZES.md,
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
    backgroundColor: '#e2e8f0', // Slate-200 backdrop
    borderRadius: 12,
    padding: 4,
    marginBottom: SIZES.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    backgroundColor: COLORS.white, // Pure white input surfaces
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff5f5',
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
  adminHintBox: {
    backgroundColor: '#f0f9ff', // Soft sky blue tint
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9', // Blue accent left bar
  },
  adminHintText: {
    fontSize: SIZES.sm,
    color: '#0369a1',
    lineHeight: 18,
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
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.md,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  adminLoginButton: {
    backgroundColor: '#1e3a8a',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  viewAttendanceButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.md,
  },
  viewAttendanceButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
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
  manageSitesLink: {
    alignSelf: 'center',
    marginTop: -SIZES.xs,
    marginBottom: SIZES.lg,
  },
  manageSitesLinkText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  languageButton: {
    alignSelf: 'flex-end',
    marginRight: SIZES.lg,
    marginTop: SIZES.md,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.md,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  languageButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    padding: SIZES.lg,
    width: '80%',
    maxWidth: 320,
    elevation: 5,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  languageOption: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    marginVertical: SIZES.sm,
    borderRadius: SIZES.md,
    backgroundColor: COLORS.gray100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  languageOptionText: {
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  languageOptionTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  checkmark: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});

export default LoginScreen;
