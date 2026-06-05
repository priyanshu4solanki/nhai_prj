/**
 * EXAMPLE: How to update LoginScreen to use multi-language support
 *
 * This is a template showing how to migrate your existing screens.
 * Copy this pattern to update your actual LoginScreen.tsx
 */

import React, {useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageSwitcher} from '../components/LanguageSwitcher';

export const LoginScreenExample = () => {
  const {t} = useTranslation();
  const [employeeId, setEmployeeId] = useState('');
  const [department] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleStartAttendance = () => {
    if (!employeeId) {
      Alert.alert(t('login.invalidEmployeeId'));
      return;
    }
    if (!department) {
      Alert.alert(t('login.selectDepartment'));
      return;
    }
    // Navigate to next screen
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>{t('appTitle')}</Text>
        <Text style={styles.appSubtitle}>{t('appSubtitle')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('login.title')}</Text>

        {/* Employee ID Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('login.employeeIdLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login.employeeIdPlaceholder')}
            value={employeeId}
            onChangeText={setEmployeeId}
            keyboardType="numeric"
          />
        </View>

        {/* Department Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('login.departmentLabel')}</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              // Open department picker
            }}>
            <Text style={styles.pickerText}>
              {department || t('login.selectDepartmentPlaceholder')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.button} onPress={handleStartAttendance}>
          <Text style={styles.buttonText}>{t('login.startButton')}</Text>
        </TouchableOpacity>

        {/* Language Switcher Button */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLangModalVisible(true)}>
          <Text style={styles.languageButtonText}>
            {t('common.language')} 🌐
          </Text>
        </TouchableOpacity>
      </View>

      <LanguageSwitcher
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  languageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * KEY CHANGES TO MAKE IN YOUR SCREENS:
 *
 * 1. Import the hook:
 *    import { useTranslation } from 'react-i18next';
 *
 * 2. Get the translation function:
 *    const { t } = useTranslation();
 *
 * 3. Replace all hardcoded strings with t() calls:
 *    OLD: <Text>Employee Login</Text>
 *    NEW: <Text>{t('login.title')}</Text>
 *
 * 4. To add language switcher to your screen:
 *    - Import LanguageSwitcher component
 *    - Add state for modal visibility
 *    - Add LanguageSwitcher component with visibility and close handler
 */
