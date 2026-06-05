import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../types';
import {COLORS, SIZES, STRINGS} from '../constants';
import {globalStyles} from '../theme';
import {initializeDatabase} from '../services/databaseService';
import {
  requestCameraPermission,
  checkInternetConnectivity,
  initializeAllModels,
} from '../utils';
import {useLanguage} from '../contexts/LanguageContext';
import {useTranslation} from 'react-i18next';

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<SplashScreenProps> = ({navigation}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [status, setStatus] = useState(STRINGS.splash.loadingModel);
  const [isOnline, setIsOnline] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const {changeLanguage, currentLanguage, supportedLanguages} = useLanguage();
  const {t} = useTranslation();

  useEffect(() => {
    animateEntrance();
    initializationSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
      }),
    ]).start();
  };

  const initializationSequence = async () => {
    try {
      // Step 1: Load AI Models
      setStatus(t('splash.loadingModel'));
      setProgress(0);
      const modelResult = await initializeAllModels();
      if (!modelResult.success) {
        console.warn('Model initialization had warnings:', modelResult.errors);
      }
      setProgress(25);

      // Step 2: Check Connectivity
      setStatus(t('splash.checkingConnectivity'));
      const online = await checkInternetConnectivity();
      setIsOnline(online);
      setProgress(50);

      // Step 3: Initialize Database
      setStatus(t('splash.initializingDatabase'));
      const dbResult = await initializeDatabase();
      if (!dbResult.success) {
        console.error('Database initialization failed:', dbResult.error);
      }
      setProgress(75);

      // Step 4: Request Camera Permission
      setStatus(t('splash.initializingCamera'));
      const permissionResult = await requestCameraPermission();
      if (!permissionResult.granted) {
        console.warn('Camera permission not granted:', permissionResult.reason);
      }
      setProgress(90);

      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(100);

      // Navigate to Login after a brief delay
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
      // Still navigate to login even if there are errors
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      }, 2000);
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      {/* Language Switcher Button */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setShowLanguageModal(true)}>
        <Text style={styles.languageButtonText}>
          🌐 {currentLanguage.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          },
        ]}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.appTitle}>{t('appName')}</Text>
        <Text style={styles.appSubtitle}>{t('splash.offlineFaceAuth')}</Text>
      </Animated.View>

      {/* Status and Progress */}
      <View style={styles.statusContainer}>
        {/* Loading Indicator */}
        <View style={styles.indicatorContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>{status}</Text>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, {width: `${progress}%`}]} />
        </View>

        <Text style={styles.progressText}>{progress}%</Text>
      </View>

      {/* Connectivity Status */}
      <View style={styles.connectivityContainer}>
        <View
          style={[
            styles.connectivityDot,
            {backgroundColor: isOnline ? COLORS.success : COLORS.warning},
          ]}
        />
        <Text
          style={[
            styles.connectivityText,
            {color: isOnline ? COLORS.success : COLORS.warning},
          ]}>
          {isOnline ? t('splash.online') : t('splash.offline')}
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>{t('appTitle')}</Text>

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
    backgroundColor: COLORS.primary,
    justifyContent: 'space-between',
    paddingVertical: SIZES['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SIZES['5xl'] * 1.5,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: SIZES.lg,
  },
  appTitle: {
    fontSize: SIZES['3xl'] + 2,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SIZES.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: SIZES.base + 1,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: SIZES['2xl'],
  },
  indicatorContainer: {
    marginBottom: SIZES.lg,
  },
  statusText: {
    fontSize: SIZES.base,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SIZES.md,
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SIZES.full,
    overflow: 'hidden',
    marginBottom: SIZES.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.full,
  },
  progressText: {
    fontSize: SIZES.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  connectivityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
  },
  connectivityDot: {
    width: 10,
    height: 10,
    borderRadius: SIZES.full,
    marginRight: SIZES.sm,
  },
  connectivityText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  footerText: {
    fontSize: SIZES.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingBottom: SIZES.lg,
  },
  languageButton: {
    alignSelf: 'flex-end',
    marginRight: SIZES.lg,
    marginTop: SIZES.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});

export default SplashScreen;
