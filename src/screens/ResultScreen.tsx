import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';

type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;

const ResultScreen: React.FC<ResultScreenProps> = ({ navigation, route }) => {
  const { employeeId, status, message } = route.params;
  const isSuccess = status === 'success';

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      {/* Status Indicator */}
      <View
        style={[
          styles.statusIndicator,
          {
            backgroundColor: isSuccess ? COLORS.success : COLORS.error,
          },
        ]}>
        <Text style={styles.statusEmoji}>{isSuccess ? '✓' : '✗'}</Text>
      </View>

      {/* Result Message */}
      <Text style={styles.resultTitle}>
        {isSuccess ? STRINGS.result.success : STRINGS.result.failure}
      </Text>

      <Text style={styles.resultMessage}>
        {message || (isSuccess ? STRINGS.result.successMessage : STRINGS.result.failureMessage)}
      </Text>

      {/* Employee Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Employee ID</Text>
        <Text style={styles.infoValue}>{employeeId}</Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {isSuccess ? (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Sync')}>
              <Text style={styles.primaryButtonText}>Sync Records</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'space-between',
    paddingVertical: SIZES.xl,
  },
  statusIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SIZES.xl,
  },
  statusEmoji: {
    fontSize: SIZES['5xl'],
    color: COLORS.white,
    fontWeight: '700',
  },
  resultTitle: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  resultMessage: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    marginVertical: SIZES.lg,
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  infoValue: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonContainer: {
    gap: SIZES.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  primaryButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  secondaryButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default ResultScreen;
