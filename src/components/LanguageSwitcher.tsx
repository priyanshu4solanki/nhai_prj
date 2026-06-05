import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import {useLanguage} from '../contexts/LanguageContext';
import {useTranslation} from 'react-i18next';

interface LanguageSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Language Switcher Modal Component
 * Usage:
 * const [langModalVisible, setLangModalVisible] = useState(false);
 *
 * <Button title="Change Language" onPress={() => setLangModalVisible(true)} />
 * <LanguageSwitcher visible={langModalVisible} onClose={() => setLangModalVisible(false)} />
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  visible,
  onClose,
}) => {
  const {changeLanguage, currentLanguage, supportedLanguages} = useLanguage();
  const {t} = useTranslation();

  const handleLanguageSelect = async (langCode: string) => {
    await changeLanguage(langCode);
    onClose();
  };

  const renderLanguageOption = ({
    item,
  }: {
    item: {code: string; name: string};
  }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        currentLanguage === item.code && styles.selectedLanguage,
      ]}
      onPress={() => handleLanguageSelect(item.code)}>
      <Text
        style={[
          styles.languageText,
          currentLanguage === item.code && styles.selectedLanguageText,
        ]}>
        {item.name}
      </Text>
      {currentLanguage === item.code && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('common.language')}</Text>

          <FlatList
            data={supportedLanguages}
            keyExtractor={item => item.code}
            renderItem={renderLanguageOption}
            scrollEnabled={false}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedLanguage: {
    backgroundColor: '#007AFF',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
