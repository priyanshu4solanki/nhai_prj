/**
 * EXAMPLE: Language Selection Screen
 *
 * This shows how to create a dedicated screen for language selection.
 * You can add this to your app's settings or navigation.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useLanguage} from '../contexts/LanguageContext';

interface LanguageItem {
  code: string;
  name: string;
  nativeName?: string;
}

export const LanguageSelectionScreenExample = ({navigation}: any) => {
  const {t} = useTranslation();
  const {currentLanguage, changeLanguage} = useLanguage();

  const handleLanguageSelect = async (langCode: string) => {
    await changeLanguage(langCode);
    // Optionally navigate back or show confirmation
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const renderLanguageCard = ({item}: {item: LanguageItem}) => {
    const isSelected = currentLanguage === item.code;

    return (
      <TouchableOpacity
        style={[styles.languageCard, isSelected && styles.selectedCard]}
        onPress={() => handleLanguageSelect(item.code)}
        activeOpacity={0.7}>
        <View style={styles.languageInfo}>
          <Text
            style={[styles.languageName, isSelected && styles.selectedText]}>
            {item.name}
          </Text>
          {item.nativeName && (
            <Text
              style={[
                styles.nativeName,
                isSelected && styles.selectedNativeName,
              ]}>
              {item.nativeName}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.radioButton,
            isSelected && styles.radioButtonSelected,
          ]}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  const languageData: LanguageItem[] = [
    {code: 'en', name: 'English', nativeName: 'English'},
    {code: 'hi', name: 'हिन्दी', nativeName: 'Hindi'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('common.language')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('login.selectDepartmentPlaceholder')}
        </Text>
      </View>

      <FlatList
        data={languageData}
        renderItem={renderLanguageCard}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.listContainer}
        scrollEnabled={false}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Current: {currentLanguage.toUpperCase()}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    opacity: 0.8,
  },
  listContainer: {
    padding: 16,
  },
  languageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedText: {
    color: '#007AFF',
  },
  nativeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectedNativeName: {
    color: '#007AFF',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

/**
 * USAGE IN YOUR APP:
 *
 * 1. Add this screen to your navigation stack:
 *
 *    <Stack.Screen
 *      name="LanguageSelection"
 *      component={LanguageSelectionScreenExample}
 *      options={{ title: 'Select Language' }}
 *    />
 *
 * 2. Navigate to it from a menu or settings screen:
 *
 *    <Button
 *      title="Change Language"
 *      onPress={() => navigation.navigate('LanguageSelection')}
 *    />
 *
 * 3. Or add it as the first screen on app startup if user hasn't selected language yet
 */
