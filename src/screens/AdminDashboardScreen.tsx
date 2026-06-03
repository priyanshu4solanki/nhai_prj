import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES } from '../constants';
import { globalStyles } from '../theme';
import { getPendingSyncRecords } from '../services/databaseService';

type AdminDashboardProps = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({ navigation, route }) => {
  const adminUser = route?.params?.adminUser || 'Administrator';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const pending = await getPendingSyncRecords();
      setPendingCount(pending.length);
    } catch (e) {
      console.log('Error loading admin stats:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Admin Header */}
        <View style={styles.headerSection}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            National Highways Authority of India
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, { color: COLORS.white }]}>●</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>System Active</Text>
          </View>
        </View>

        {/* Admin Actions */}
        <Text style={styles.sectionTitle}>Administration</Text>

        {/* Register New Employee */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Register', { adminUser })}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>👤</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Register New Employee</Text>
            <Text style={styles.actionDesc}>
              Capture facial embeddings and enroll a new employee for offline attendance
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Manage Employees */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ManageEmployees', { adminUser })}>
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(220, 38, 38, 0.12)' }]}>
            <Text style={styles.actionIcon}>👥</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Employees</Text>
            <Text style={styles.actionDesc}>
              View registered employees and remove those who have left
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* View Sync Queue */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Sync')}>
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.12)' }]}>
            <Text style={styles.actionIcon}>☁</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Sync & Purge Records</Text>
            <Text style={styles.actionDesc}>
              Upload pending attendance logs to AWS and purge local storage
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Manage Geofence Sites */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ManageSites', { adminUser })}>
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.12)' }]}>
            <Text style={styles.actionIcon}>📍</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Configure Geofence Sites</Text>
            <Text style={styles.actionDesc}>
              View, register, and modify project site coordinates and geofence boundaries
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Security Info */}
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Security Notice</Text>
          <Text style={styles.securityText}>
            Only authenticated administrators can register new employees and manage facial embeddings.
            All registration activity is logged locally for audit compliance.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerControls}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.logoutButtonText}>Logout</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  headerSection: {
    marginTop: SIZES.xl,
    marginBottom: SIZES['2xl'],
    alignItems: 'center',
  },
  adminBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.full,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xs,
    marginBottom: SIZES.md,
  },
  adminBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SIZES.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardAccent: {
    backgroundColor: '#1e3a8a', // Corporate Blue status block
    borderColor: '#1e3a8a',
  },
  statValue: {
    fontSize: SIZES['3xl'],
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    marginBottom: SIZES.md,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  actionDesc: {
    fontSize: SIZES.sm - 1,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionArrow: {
    fontSize: 28,
    color: COLORS.textTertiary,
    fontWeight: '300',
    marginLeft: SIZES.sm,
  },
  securityBox: {
    backgroundColor: '#fffbeb', // Soft warning amber backdrop
    borderRadius: 12,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    marginTop: SIZES.lg,
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b', // Amber vertical line
  },
  securityTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: SIZES.xs,
  },
  securityText: {
    fontSize: SIZES.sm - 1,
    color: '#b45309',
    lineHeight: 18,
  },
  footerControls: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;
