import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';

type FaceAuthScreenProps = NativeStackScreenProps<RootStackParamList, 'FaceAuth'>;

const FaceAuthScreen: React.FC<FaceAuthScreenProps> = ({ navigation, route }) => {
  const { employeeId, department } = route.params;

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      <Text style={styles.title}>{STRINGS.faceAuth.title}</Text>
      <Text style={styles.subtitle}>{STRINGS.faceAuth.subtitle}</Text>

      {/* Camera preview placeholder */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderText}>Camera Preview</Text>
      </View>

      {/* Face detection status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{STRINGS.faceAuth.detectingFace}</Text>
      </View>

      {/* Navigation */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Liveness', { employeeId, department })}>
        <Text style={styles.buttonText}>Continue to Liveness</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.lg,
  },
  title: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  subtitle: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
  },
  cameraPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.gray200,
    borderRadius: SIZES.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.xl,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
  },
  statusContainer: {
    paddingVertical: SIZES.lg,
    marginVertical: SIZES.lg,
  },
  statusText: {
    fontSize: SIZES.base,
    color: COLORS.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.xl,
  },
  buttonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default FaceAuthScreen;
