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

type FaceAuthScreenProps = NativeStackScreenProps<RootStackParamList, 'FaceAuth'>;

const FaceAuthScreen: React.FC<FaceAuthScreenProps> = ({ navigation, route }) => {
  const { employeeId, department } = route.params;

  const [faceDetected, setFaceDetected] = useState(false);
  const [instruction, setInstruction] = useState(STRINGS.faceAuth.detectingFace);
  const [isAligned, setIsAligned] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for alignment box
  useEffect(() => {
    let anim: Animated.CompositeAnimation;
    if (isAligned) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isAligned]);

  // Automated progress transition to Liveness
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isAligned) {
      timeout = setTimeout(() => {
        navigation.navigate('Liveness', { employeeId, department });
      }, 1500);
    }
    return () => clearTimeout(timeout);
  }, [isAligned]);

  const handleFacesDetected = ({ faces }: { faces: any[] }) => {
    if (faces.length === 0) {
      setFaceDetected(false);
      setIsAligned(false);
      setInstruction(STRINGS.faceAuth.faceNotDetected);
      return;
    }

    if (faces.length > 1) {
      setFaceDetected(false);
      setIsAligned(false);
      setInstruction(STRINGS.faceAuth.multiplesFaces);
      return;
    }

    const face = faces[0];
    setFaceDetected(true);

    const { origin, size } = face.bounds;
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Check bounds center relative to the viewport
    const faceCenterX = origin.x + size.width / 2;
    const faceCenterY = origin.y + size.height / 2;

    const viewportCenterX = screenWidth / 2;
    const viewportCenterY = screenHeight / 2 - 40;

    const isXCentered = Math.abs(faceCenterX - viewportCenterX) < 110;
    const isYCentered = Math.abs(faceCenterY - viewportCenterY) < 130;

    if (!isXCentered || !isYCentered) {
      setInstruction('Align face inside the oval frame');
      setIsAligned(false);
    } else if (size.width < 120) {
      setInstruction(STRINGS.faceAuth.moveCloser);
      setIsAligned(false);
    } else if (size.width > 270) {
      setInstruction(STRINGS.faceAuth.moveAway);
      setIsAligned(false);
    } else {
      setInstruction(STRINGS.faceAuth.faceDetected);
      setIsAligned(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>{STRINGS.faceAuth.title}</Text>
        <Text style={styles.headerSubtitle}>
          Employee verification for ID: <Text style={{ fontWeight: '700' }}>{employeeId}</Text>
        </Text>
      </View>

      {/* Camera and Tracking Box */}
      <View style={styles.cameraWrapper}>
        <RNCamera
          style={StyleSheet.absoluteFillObject}
          type={RNCamera.Constants.Type.front}
          flashMode={RNCamera.Constants.FlashMode.off}
          captureAudio={false}
          faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.fast}
          faceDetectionLandmarks={RNCamera.Constants.FaceDetection.Landmarks.all}
          faceDetectionClassifications={RNCamera.Constants.FaceDetection.Classifications.all}
          onFacesDetected={handleFacesDetected}
          androidCameraPermissionOptions={{
            title: 'Camera Permission',
            message: 'Camera permission is required for face authentication.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
        />

        {/* Dynamic Glassmorphic Target Overlay */}
        <View style={styles.overlayContainer}>
          <Animated.View
            style={[
              styles.alignmentOval,
              {
                borderColor: isAligned ? COLORS.success : COLORS.secondary,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        </View>
      </View>

      {/* Floating Instruction Board */}
      <View style={styles.instructionBoard}>
        <View
          style={[
            styles.statusIndicatorBar,
            { backgroundColor: isAligned ? COLORS.success : COLORS.secondary },
          ]}
        />
        <Text style={styles.instructionText}>{instruction}</Text>
        {isAligned && (
          <Text style={styles.progressSubText}>
            Perfect! Hold still, proceeding to Liveness...
          </Text>
        )}
      </View>

      {/* Footer Exit Options */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.cancelButtonText}>Cancel & Exit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f', // Dark premium background
    justifyContent: 'space-between',
  },
  headerBanner: {
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    backgroundColor: 'rgba(26, 84, 144, 0.9)', // NHAI Blue transparent
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 152, 0, 0.4)', // Orange border
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignmentOval: {
    width: width * 0.68,
    height: width * 0.92,
    borderRadius: (width * 0.68) / 2,
    borderWidth: 3.5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionBoard: {
    marginHorizontal: SIZES.xl,
    marginTop: -30,
    marginBottom: SIZES.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: SIZES.base,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4.5,
  },
  statusIndicatorBar: {
    width: 60,
    height: 5,
    borderRadius: SIZES.full,
    marginBottom: SIZES.sm,
  },
  instructionText: {
    fontSize: SIZES.base + 2,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  progressSubText: {
    fontSize: SIZES.xs + 1,
    color: COLORS.success,
    fontWeight: '500',
    marginTop: SIZES.xs,
  },
  footerContainer: {
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

export default FaceAuthScreen;
