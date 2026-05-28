import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';
import {
  initializeDatabase,
  getPendingSyncRecords,
} from '../services/databaseService';
import {
  requestCameraPermission,
  checkInternetConnectivity,
  initializeAllModels,
} from '../utils';

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [status, setStatus] = useState(STRINGS.splash.loadingModel);
  const [isOnline, setIsOnline] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    initializationSequence();
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
      setStatus(STRINGS.splash.loadingModel);
      setProgress(0);
      const modelResult = await initializeAllModels();
      if (!modelResult.success) {
        console.warn('Model initialization had warnings:', modelResult.errors);
      }
      setProgress(25);

      // Step 2: Check Connectivity
      setStatus(STRINGS.splash.checkingConnectivity);
      const online = await checkInternetConnectivity();
      setIsOnline(online);
      setProgress(50);

      // Step 3: Initialize Database
      setStatus(STRINGS.splash.initializingDatabase);
      const dbResult = await initializeDatabase();
      if (!dbResult.success) {
        console.error('Database initialization failed:', dbResult.error);
      }
      setProgress(75);

      // Step 4: Request Camera Permission
      setStatus(STRINGS.splash.initializingCamera);
      const permissionResult = await requestCameraPermission();
      if (!permissionResult.granted) {
        console.warn('Camera permission not granted:', permissionResult.reason);
      }
      setProgress(90);

      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(100);

      // Animate entrance before navigation
      animateEntrance();

      // Navigate to Login after a brief delay
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
      // Still navigate to login even if there are errors
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 2000);
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        {/* Logo Placeholder - Replace with actual NHAI logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>NHAI</Text>
        </View>

        <Text style={styles.appTitle}>{STRINGS.appName}</Text>
        <Text style={styles.appSubtitle}>{STRINGS.splash.loadingModel}</Text>
      </Animated.View>

      {/* Status and Progress */}
      <View style={styles.statusContainer}>
        {/* Loading Indicator */}
        <View style={styles.indicatorContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>{status}</Text>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <Text style={styles.progressText}>{progress}%</Text>
      </View>

      {/* Connectivity Status */}
      <View style={styles.connectivityContainer}>
        <View
          style={[
            styles.connectivityDot,
            { backgroundColor: isOnline ? COLORS.success : COLORS.warning },
          ]}
        />
        <Text
          style={[
            styles.connectivityText,
            { color: isOnline ? COLORS.success : COLORS.warning },
          ]}>
          {isOnline ? STRINGS.splash.online : STRINGS.splash.offline}
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>
        {STRINGS.appTitle}
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
    paddingVertical: SIZES['3xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SIZES['5xl'],
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: SIZES['3xl'],
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  logoText: {
    fontSize: SIZES['4xl'],
    fontWeight: '700',
    color: COLORS.white,
  },
  appTitle: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    color: COLORS.text,
    marginBottom: SIZES.md,
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: SIZES.full,
    overflow: 'hidden',
    marginBottom: SIZES.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.full,
  },
  progressText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
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
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingBottom: SIZES.lg,
  },
});

export default SplashScreen;
