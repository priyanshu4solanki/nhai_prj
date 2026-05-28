import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';

type SyncScreenProps = NativeStackScreenProps<RootStackParamList, 'Sync'>;

const SyncScreen: React.FC<SyncScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{STRINGS.sync.title}</Text>
          <Text style={styles.subtitle}>Sync your attendance records to the server</Text>
        </View>

        {/* Sync Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusIndicator} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Ready to Sync</Text>
            <Text style={styles.statusDescription}>
              All pending records will be uploaded to the server
            </Text>
          </View>
        </View>

        {/* Records Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending Records</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Synced Records</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>

        {/* Information */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Sync Information</Text>
          <Text style={styles.infoText}>
            • Your attendance records are stored locally on your device
          </Text>
          <Text style={styles.infoText}>
            • Records will be automatically synced when internet is available
          </Text>
          <Text style={styles.infoText}>
            • You can manually sync records from this screen
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={() => {
            // Handle sync
          }}>
          <Text style={styles.syncButtonText}>{STRINGS.sync.uploadRecords}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
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
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.lg,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    marginRight: SIZES.md,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
    gap: SIZES.md,
  },
  summaryItem: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  summaryValue: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoContainer: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  infoTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
    gap: SIZES.md,
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  syncButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  backButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default SyncScreen;
