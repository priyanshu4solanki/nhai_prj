import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZES } from '../constants';

const { width, height } = Dimensions.get('window');

export const theme = {
  colors: COLORS,
  sizes: SIZES,
  width,
  height,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  paddedContainer: {
    paddingHorizontal: SIZES.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  // Text styles
  heading1: {
    fontSize: SIZES['5xl'],
    fontWeight: '700',
    color: COLORS.text,
  },
  heading2: {
    fontSize: SIZES['4xl'],
    fontWeight: '700',
    color: COLORS.text,
  },
  heading3: {
    fontSize: SIZES['3xl'],
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bodyText: {
    fontSize: SIZES.base,
    color: COLORS.text,
  },
  smallText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  // Button styles
  buttonBase: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  // Shadow styles
  shadowSmall: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  shadowMedium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  shadowLarge: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});

export const cameraStyles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
    overflow: 'hidden',
  },
  preview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  faceDetectionBox: {
    borderColor: COLORS.detected,
    borderWidth: SIZES.detectionBoxStrokeWidth,
    borderRadius: SIZES.lg,
  },
});
