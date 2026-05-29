import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';

type LivenessScreenProps = NativeStackScreenProps<RootStackParamList, 'Liveness'>;

type BlinkState = 'waiting_open' | 'eyes_open' | 'eyes_closed' | 'blink_confirmed';

const LivenessScreen: React.FC<LivenessScreenProps> = ({ navigation, route }) => {
  const { employeeId, department } = route.params;

  const [blinkState, setBlinkState] = useState<BlinkState>('waiting_open');
  const [instruction, setInstruction] = useState('Please look at the camera...');
  const [progressWidth] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(0.5));
  const [successOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate progress bar according to state transitions
    let targetValue = 0;
    if (blinkState === 'eyes_open') targetValue = 0.35;
    if (blinkState === 'eyes_closed') targetValue = 0.7;
    if (blinkState === 'blink_confirmed') targetValue = 1;

    Animated.timing(progressWidth, {
      toValue: targetValue,
      duration: 350,
      useNativeDriver: false,
    }).start();

    // Trigger success animations and auto-navigation upon confirmation
    if (blinkState === 'blink_confirmed') {
      setInstruction(STRINGS.liveness.livenessConfirmed);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        navigation.navigate('Recognition', { employeeId, department });
      }, 1500);
    }
  }, [blinkState]);

  const handleFacesDetected = ({ faces }: { faces: any[] }) => {
    if (blinkState === 'blink_confirmed') return;

    if (faces.length === 0) {
      setInstruction('No face detected. Look directly into camera.');
      return;
    }

    if (faces.length > 1) {
      setInstruction(STRINGS.faceAuth.multiplesFaces);
      return;
    }

    const face = faces[0];

    // Read Left and Right eye open probability
    const leftEyeProb = face.leftEyeOpenProbability;
    const rightEyeProb = face.rightEyeOpenProbability;

    // Verify probabilities are returned by the native ML Kit
    if (typeof leftEyeProb === 'undefined' || typeof rightEyeProb === 'undefined') {
      setInstruction('Position face in brighter light for blink verification');
      return;
    }

    const avgEyeOpenProb = (leftEyeProb + rightEyeProb) / 2;

    // State Machine transitions:
    // 1. waiting_open ➔ eyes_open (Wait until user opens eyes wide)
    // 2. eyes_open ➔ eyes_closed (Detect when user closes eyes)
    // 3. eyes_closed ➔ blink_confirmed (Detect when user re-opens eyes)
    switch (blinkState) {
      case 'waiting_open':
        if (avgEyeOpenProb >= 0.7) {
          setBlinkState('eyes_open');
          setInstruction('Excellent. Now blink your eyes slowly...');
        } else {
          setInstruction('Open your eyes wide to start...');
        }
        break;

      case 'eyes_open':
        if (avgEyeOpenProb <= 0.25) {
          setBlinkState('eyes_closed');
          setInstruction('Eyes closed! Perfect, now open them...');
        } else {
          setInstruction('Blink slowly once...');
        }
        break;

      case 'eyes_closed':
        if (avgEyeOpenProb >= 0.7) {
          setBlinkState('blink_confirmed');
        } else {
          setInstruction('Opening your eyes...');
        }
        break;

      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{STRINGS.liveness.title}</Text>
        <Text style={styles.headerSubtitle}>{STRINGS.liveness.subtitle}</Text>
      </View>

      {/* Main Camera Area */}
      <View style={styles.cameraWrapper}>
        <RNCamera
          style={StyleSheet.absoluteFillObject}
          type={RNCamera.Constants.Type.front}
          flashMode={RNCamera.Constants.FlashMode.off}
          captureAudio={false}
          faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.fast}
          faceDetectionClassifications={RNCamera.Constants.FaceDetection.Classifications.all}
          onFacesDetected={handleFacesDetected}
        />

        {/* Dynamic State Machine Progress Bars */}
        <View style={styles.cameraOverlay}>
          <View style={styles.indicatorProgressWrapper}>
            <View style={styles.stepsLabelRow}>
              <Text
                style={[
                  styles.stepLabel,
                  blinkState !== 'waiting_open' && { color: COLORS.success, fontWeight: '700' },
                ]}>
                1. Detect Face
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  (blinkState === 'eyes_closed' || blinkState === 'blink_confirmed') && {
                    color: COLORS.success,
                    fontWeight: '700',
                  },
                ]}>
                2. Close Eyes
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  blinkState === 'blink_confirmed' && { color: COLORS.success, fontWeight: '700' },
                ]}>
                3. Open Eyes
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor:
                      blinkState === 'blink_confirmed' ? COLORS.success : COLORS.secondary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Success Animated Card */}
        {blinkState === 'blink_confirmed' && (
          <Animated.View
            style={[
              styles.successPanel,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}>
            <View style={styles.checkmarkIcon}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <Text style={styles.panelTitle}>Anti-Spoofing Verified</Text>
            <Text style={styles.panelSubtitle}>Liveness check completed successfully.</Text>
          </Animated.View>
        )}
      </View>

      {/* Real-time feedback bar */}
      <View style={styles.feedbackBar}>
        <View
          style={[
            styles.statusIndicatorCircle,
            {
              backgroundColor:
                blinkState === 'blink_confirmed'
                  ? COLORS.success
                  : blinkState === 'waiting_open'
                  ? COLORS.error
                  : COLORS.secondary,
            },
          ]}
        />
        <Text style={styles.feedbackText}>{instruction}</Text>
      </View>

      {/* Footer controls */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.cancelButtonText}>Cancel Verification</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
    justifyContent: 'space-between',
  },
  header: {
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    backgroundColor: 'rgba(26, 84, 144, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 152, 0, 0.4)',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    color: '#cbd5e1',
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  indicatorProgressWrapper: {
    backgroundColor: 'rgba(10, 25, 47, 0.85)',
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  stepsLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  stepLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: SIZES.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: SIZES.full,
  },
  successPanel: {
    position: 'absolute',
    top: height * 0.15,
    alignSelf: 'center',
    width: width * 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: SIZES.lg,
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkmarkIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
  },
  panelTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  panelSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  feedbackBar: {
    marginHorizontal: SIZES.xl,
    marginTop: -25,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.base,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusIndicatorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.md,
  },
  feedbackText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  footer: {
    paddingBottom: SIZES.xl,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});

export default LivenessScreen;
