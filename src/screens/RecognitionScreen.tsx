import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';

import {RootStackParamList} from '../types';
import {COLORS, SIZES} from '../constants';
import {globalStyles} from '../theme';
import {getEmployee} from '../services/databaseService';
import {compareFaceVectors} from '../utils';

type RecognitionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Recognition'
>;

const RecognitionScreen: React.FC<RecognitionScreenProps> = ({
  navigation,
  route,
}) => {
  const {employeeId} = route.params;
  const {t} = useTranslation();

  const [statusText, setStatusText] = useState(t('recognition.processing'));

  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Laser sweep animation loop
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    laserLoop.start();

    // Pulse animation loop for scan ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Execute offline math matching pipeline
    runFaceComparison();

    return () => {
      laserLoop.stop();
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runFaceComparison = async () => {
    try {
      setStatusText(t('recognition.comparingFace'));

      // Fetch pre-registered employee from local SQLite
      const employee = await getEmployee(employeeId);

      // Processing delay for realistic scanner visual effect (750ms - under <1s)
      await new Promise(resolve => setTimeout(resolve, 850));

      if (!employee || !employee.faceVector) {
        // Employee not found or missing vector
        navigation.navigate('Result', {
          employeeId,
          status: 'failure',
          message: t('recognition.credentialsNotFound'),
        });
        return;
      }

      const preRegisteredVector = employee.faceVector;
      const liveFaceVector = route.params?.faceVector;

      // ── Security Check 1: No live face vector captured ──────────────────────
      if (!liveFaceVector || liveFaceVector.length === 0) {
        navigation.navigate('Result', {
          employeeId,
          status: 'failure',
          message:
            'Face capture failed — landmarks not detected. Please ensure good lighting and look directly at the camera.',
        });
        return;
      }

      // ── Security Check 2: Employee registered with random mock vector ────────
      // A proper face vector now has 128 unique non-repeating values.
      // A mock/random vector from generateRandomFaceVector has high variance with no geometric structure.
      // Detect legacy random vectors by checking if the stored length mismatches or is structurally invalid.
      const isLegacyMockVector = (v: number[]) => {
        if (!v || v.length !== 128) {
          return true;
        }
        // Real geometric vectors have values in a bounded range from face ratios
        // Random mock vectors have values spread across a wide range (Math.random() * 2 - 1)
        const maxVal = Math.max(...v);
        const minVal = Math.min(...v);
        const range = maxVal - minVal;
        // Real face vectors have values roughly in range [-5, 15] (scaled ratios)
        // Random mock vectors have range close to 2 (between -1 and 1)
        // If range < 3 and values are all between -1.5 and 1.5, it's a legacy random mock
        const allSmall = v.every(val => Math.abs(val) <= 1.5);
        return allSmall && range < 3;
      };

      if (isLegacyMockVector(preRegisteredVector)) {
        navigation.navigate('Result', {
          employeeId,
          status: 'failure',
          message: `Face not properly registered for ID ${employeeId}. Please ask your administrator to re-register your face.`,
        });
        return;
      }

      // ── Security Check 3: Live vector must also be a real capture ────────────
      if (isLegacyMockVector(liveFaceVector)) {
        navigation.navigate('Result', {
          employeeId,
          status: 'failure',
          message:
            'Live face capture failed — insufficient landmark data. Please try in better lighting.',
        });
        return;
      }

      // ── Face Comparison: Real vs Real vectors ────────────────────────────────
      // Threshold 0.75: strict enough to reject different people, lenient enough
      // for same-person variation (lighting, angle, expression)
      const comparison = compareFaceVectors(
        liveFaceVector,
        preRegisteredVector,
        0.75,
      );
      const matchPercentage = (comparison.similarity * 100).toFixed(1);

      if (comparison.matched) {
        navigation.navigate('Result', {
          employeeId,
          status: 'success',
          message: t('recognition.matchSuccess', {confidence: matchPercentage}),
        });
      } else {
        navigation.navigate('Result', {
          employeeId,
          status: 'failure',
          message: t('recognition.matchFailed'),
        });
      }
    } catch (error) {
      console.error('Face Recognition Error:', error);
      navigation.navigate('Result', {
        employeeId,
        status: 'failure',
        message: t('recognition.mathError'),
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      {/* Decorative scanner frame */}
      <View style={styles.scannerWrapper}>
        <Animated.View
          style={[styles.scannerBorderRing, {transform: [{scale: pulseAnim}]}]}
        />
        <View style={styles.scanningFrame}>
          {/* Wireframe Silhouette */}
          <View style={styles.silhouetteHead} />
          <View style={styles.silhouetteShoulders} />

          {/* Laser Sweep Line */}
          <Animated.View
            style={[
              styles.laserLine,
              {
                transform: [
                  {
                    translateY: laserAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 230],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Floating Status Box */}
      <View style={styles.statusBox}>
        <ActivityIndicator
          size="small"
          color={COLORS.secondary}
          style={styles.spinner}
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <Text style={styles.processingBadge}>
        {t('recognition.offlineEngineActive')}
      </Text>
    </SafeAreaView>
  );
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f', // Premium dark blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerWrapper: {
    width: width * 0.72,
    height: width * 0.72,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: SIZES['3xl'],
  },
  scannerBorderRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.72) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 152, 0, 0.35)', // Faded orange accent ring
    borderStyle: 'dashed',
  },
  scanningFrame: {
    width: '90%',
    height: '90%',
    borderRadius: (width * 0.72 * 0.9) / 2,
    backgroundColor: 'rgba(26, 84, 144, 0.15)', // Dark NHAI Blue background tint
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  silhouetteHead: {
    width: 70,
    height: 90,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    marginBottom: 5,
  },
  silhouetteShoulders: {
    width: 140,
    height: 70,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.secondary, // Glowing orange laser line
    shadowColor: COLORS.secondary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 8,
  },
  statusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: SIZES.base,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  spinner: {
    marginRight: SIZES.md,
  },
  statusText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  processingBadge: {
    position: 'absolute',
    bottom: 40,
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 2,
  },
});

export default RecognitionScreen;
