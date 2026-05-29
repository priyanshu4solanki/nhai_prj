import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../types';
import { COLORS, SIZES } from '../constants';
import { globalStyles } from '../theme';
import { getAllEmployees, deleteEmployee } from '../services/databaseService';

type ManageEmployeesScreenProps = NativeStackScreenProps<RootStackParamList, 'ManageEmployees'>;

// Hardcoded admin username for verification
const ADMIN_USERNAME = 'Priyanshu solanki';

const ManageEmployeesScreen: React.FC<ManageEmployeesScreenProps> = ({ navigation, route }) => {
  const adminUser = route?.params?.adminUser;
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Verify admin access
  if (!adminUser || adminUser !== ADMIN_USERNAME) {
    return (
      <SafeAreaView style={[styles.container, globalStyles.container]}>
        <View style={styles.unauthorizedContainer}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            Only authorized administrators can manage employees.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  useFocusEffect(
    React.useCallback(() => {
      loadEmployees();
    }, [])
  );

  const loadEmployees = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employeeName} (${employeeId})?\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteEmployee(employeeId);
              if (result.success) {
                Alert.alert('Success', `${employeeName} has been deleted.`);
                loadEmployees();
              } else {
                Alert.alert('Error', 'Failed to delete employee');
              }
            } catch (err) {
              console.error('Error deleting employee:', err);
              Alert.alert('Error', 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  const renderEmployeeCard = ({ item }: { item: any }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeId}>{item.id}</Text>
          <Text style={styles.employeeDepartment}>
            {item.department.charAt(0).toUpperCase() + item.department.slice(1)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteEmployee(item.id, item.name)}>
        <Text style={styles.deleteButtonIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Manage Employees</Text>
          <Text style={styles.headerSubtitle}>
            View and remove employees from the system
          </Text>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadEmployees}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Employees</Text>
            <Text style={styles.emptyText}>No employees registered yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>Total: {employees.length}</Text>
            </View>
            <FlatList
              data={employees}
              renderItem={renderEmployeeCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerControls}>
        <TouchableOpacity style={styles.backNavButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backNavButtonText}>Back to Dashboard</Text>
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
    paddingVertical: SIZES.lg,
  },
  headerSection: {
    marginBottom: SIZES.xl,
  },
  headerTitle: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  headerSubtitle: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES['2xl'],
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    borderRadius: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: SIZES.base,
    color: COLORS.error,
    fontWeight: '500',
    marginBottom: SIZES.md,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.base,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES['3xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SIZES.lg,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  emptyText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
  },
  countBadge: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginBottom: SIZES.lg,
    alignSelf: 'flex-start',
  },
  countText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  employeeDetails: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  employeeId: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  employeeDepartment: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffe6e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.md,
  },
  deleteButtonIcon: {
    fontSize: 18,
  },
  separator: {
    height: SIZES.md,
  },
  footerControls: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  backNavButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backNavButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  // Unauthorized Access
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  unauthorizedIcon: {
    fontSize: 64,
    marginBottom: SIZES.lg,
  },
  unauthorizedTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  unauthorizedText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  backButton: {
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backButtonText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default ManageEmployeesScreen;
