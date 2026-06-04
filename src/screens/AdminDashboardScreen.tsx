import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';

import {RootStackParamList} from '../types';
import {COLORS, SIZES} from '../constants';
import {globalStyles} from '../theme';
import {getAllAttendanceRecords} from '../services/databaseService';
import {runBackgroundSync} from '../services/syncService';

type AdminDashboardProps = NativeStackScreenProps<
  RootStackParamList,
  'AdminDashboard'
>;

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) {
    return '0s';
  }
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(' ');
};

const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({
  navigation,
  route,
}) => {
  const adminUser = route?.params?.adminUser || 'Administrator';
  const [isModalSyncing, setIsModalSyncing] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('day_0');

  const daysList = React.useMemo(() => {
    const list = [];
    const today = new Date();

    // Day 0: Today
    list.push({
      id: 'day_0',
      label: 'Today',
      dateStr: today.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    });

    // Day 1: Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    list.push({
      id: 'day_1',
      label: 'Yesterday',
      dateStr: yesterday.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    });

    // Days 2 to 6: older dates
    for (let i = 2; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      list.push({
        id: `day_${i}`,
        label,
        dateStr: date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      });
    }

    return list;
  }, []);

  const selectedDay = React.useMemo(() => {
    return daysList.find(d => d.id === selectedDayId);
  }, [daysList, selectedDayId]);

  const handleModalSync = async () => {
    setIsModalSyncing(true);
    try {
      const result = await runBackgroundSync();
      if (!result.success) {
        console.log('Modal sync failure:', result.error);
      }
      await loadStats();
    } catch (err) {
      console.log('Modal sync error:', err);
    } finally {
      setIsModalSyncing(false);
    }
  };

  const groupedLogs = React.useMemo(() => {
    const groups: {[key: string]: any} = {};

    attendanceLogs.forEach((log: any) => {
      const date = new Date(log.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const key = `${log.employee_id}_${dateStr}`;

      if (!groups[key]) {
        groups[key] = {
          employee_id: log.employee_id,
          employee_name: log.employee_name || 'Unknown Employee',
          dateStr: dateStr,
          checkInTime: null,
          checkOutTime: null,
          duration: 0,
          location: log.location || '',
          site_name: log.site_name || '',
          synced: log.synced,
          uuid: log.uuid,
        };
      }

      if (log.check_type === 'check-in') {
        groups[key].checkInTime = new Date(log.timestamp).toLocaleTimeString(
          'en-IN',
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          },
        );
        groups[key].location = log.location || groups[key].location;
        groups[key].site_name = log.site_name || groups[key].site_name;
        groups[key].checkInTimestamp = log.timestamp;
      } else if (log.check_type === 'check-out') {
        groups[key].checkOutTime = new Date(log.timestamp).toLocaleTimeString(
          'en-IN',
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          },
        );
        groups[key].duration = log.duration || 0;
        groups[key].checkOutTimestamp = log.timestamp;
        if (!groups[key].location) {
          groups[key].location = log.location || '';
        }
        if (!groups[key].site_name) {
          groups[key].site_name = log.site_name || '';
        }
      }
    });

    Object.keys(groups).forEach(key => {
      const g = groups[key];
      if (g.checkInTimestamp && g.checkOutTimestamp) {
        g.duration = g.checkOutTimestamp - g.checkInTimestamp;
      }
    });

    return Object.values(groups).sort((a: any, b: any) => {
      return (
        b.dateStr.localeCompare(a.dateStr) ||
        a.employee_name.localeCompare(b.employee_name)
      );
    });
  }, [attendanceLogs]);

  const filteredGroupedLogs = React.useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    return groupedLogs.filter(
      (log: any) => log.dateStr === selectedDay.dateStr,
    );
  }, [groupedLogs, selectedDay]);

  const dayStats = React.useMemo(() => {
    if (!selectedDay) {
      return {checkIns: 0, checkOuts: 0, activeIds: 0};
    }

    const dayRecords = attendanceLogs.filter((log: any) => {
      const date = new Date(log.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return dateStr === selectedDay.dateStr;
    });

    const ins = dayRecords.filter(
      (r: any) => r.check_type === 'check-in',
    ).length;
    const outs = dayRecords.filter(
      (r: any) => r.check_type === 'check-out',
    ).length;
    const uniques = new Set(dayRecords.map((r: any) => r.employee_id)).size;

    return {
      checkIns: ins,
      checkOuts: outs,
      activeIds: uniques,
    };
  }, [attendanceLogs, selectedDay]);

  const loadStats = async () => {
    try {
      const all = await getAllAttendanceRecords(100);
      console.log('ALL LOCAL ATTENDANCE RECORDS:', all.map(r => ({ id: r.id, uuid: r.uuid, check_type: r.check_type, synced: r.synced })));
      setAttendanceLogs(all);
    } catch (e) {
      console.log('Error loading admin stats:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadStats();

      // Silent automatic sync when dashboard opens
      runBackgroundSync()
        .then(() => {
          loadStats();
        })
        .catch(err => console.log('Silent sync error:', err));
    }, []),
  );

  const renderGroupedLogItem = ({item}: {item: any}) => {
    const isCheckIn = item.checkOutTime === null;
    const inTimeStr = item.checkInTime || '--';
    const outTimeStr = item.checkOutTime || '--';
    const workedTimeStr = isCheckIn ? '--' : formatDuration(item.duration);

    return (
      <View style={styles.groupedLogCard}>
        <View style={styles.groupedCardHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.groupedEmpName}>{item.employee_name}</Text>
            <Text style={styles.groupedEmpId}>ID: {item.employee_id}</Text>
          </View>
        </View>

        <View style={styles.logListDivider} />

        <View style={styles.logListBody}>
          <Text style={styles.groupedLocRow}>
            📍 {item.site_name || 'Outside Geofence'}{' '}
            {item.location ? `(${item.location})` : ''}
          </Text>

          <View style={styles.groupedTimesRow}>
            <View style={styles.groupedTimeCol}>
              <Text style={styles.groupedTimeLabel}>In</Text>
              <Text style={styles.groupedTimeVal}>{inTimeStr}</Text>
            </View>
            <View style={styles.groupedTimeCol}>
              <Text style={styles.groupedTimeLabel}>Out</Text>
              <Text style={styles.groupedTimeVal}>{outTimeStr}</Text>
            </View>
            <View style={styles.groupedTimeCol}>
              <Text style={styles.groupedTimeLabel}>Worked</Text>
              <Text
                style={[
                  styles.groupedTimeVal,
                  {fontWeight: '700', color: COLORS.primary},
                ]}>
                {workedTimeStr}
              </Text>
            </View>
          </View>

          <View style={styles.groupedStatusRow}>
            <Text style={styles.groupedUuidText} numberOfLines={1}>
              UUID: {item.uuid}
            </Text>
            <View
              style={[
                styles.groupedStatusBadge,
                {backgroundColor: item.synced === 1 ? '#e6f4ea' : '#fff3e0'},
              ]}>
              <View
                style={[
                  styles.groupedStatusDot,
                  {
                    backgroundColor:
                      item.synced === 1 ? COLORS.success : COLORS.warning,
                  },
                ]}
              />
              <Text
                style={[
                  styles.groupedStatusText,
                  {color: item.synced === 1 ? COLORS.success : COLORS.warning},
                ]}>
                {item.synced === 1 ? 'SYNCED' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
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

        {/* Admin Actions */}
        <Text style={styles.sectionTitle}>Administration</Text>

        {/* Register New Employee */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Register', {adminUser})}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>👤</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Register New Employee</Text>
            <Text style={styles.actionDesc}>
              Capture facial embeddings and enroll a new employee for offline
              attendance
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Manage Employees */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ManageEmployees', {adminUser})}>
          <View
            style={[
              styles.actionIconContainer,
              {backgroundColor: 'rgba(220, 38, 38, 0.12)'},
            ]}>
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

        {/* Configure Geofence Sites */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ManageSites', {adminUser})}>
          <View
            style={[
              styles.actionIconContainer,
              {backgroundColor: 'rgba(76, 175, 80, 0.12)'},
            ]}>
            <Text style={styles.actionIcon}>📍</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Configure Geofence Sites</Text>
            <Text style={styles.actionDesc}>
              View, register, and modify project site coordinates and geofence
              boundaries
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Employee Attendance Logs */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowLogsModal(true)}>
          <View
            style={[
              styles.actionIconContainer,
              {backgroundColor: 'rgba(30, 58, 138, 0.12)'},
            ]}>
            <Text style={styles.actionIcon}>📅</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Employee Attendance</Text>
            <Text style={styles.actionDesc}>
              View and audit all employee check-in and check-out logs grouped by
              day
            </Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* Security Info */}
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Security Notice</Text>
          <Text style={styles.securityText}>
            Only authenticated administrators can register new employees and
            manage facial embeddings. All registration activity is logged
            locally for audit compliance.
          </Text>
        </View>
      </ScrollView>

      {/* Grouped Logs Modal */}
      <Modal
        visible={showLogsModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowLogsModal(false)}>
        <SafeAreaView style={styles.logsModalContainer}>
          {/* Header */}
          <View style={styles.logsModalHeader}>
            <Text style={styles.logsModalTitle}>Employee Attendance Audit</Text>
            <TouchableOpacity onPress={() => setShowLogsModal(false)}>
              <Text style={styles.logsCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats bar */}
          <View style={styles.logsStatsContainer}>
            <View style={styles.logsStatCard}>
              <Text style={styles.logsStatTitle}>Total Check-ins</Text>
              <Text style={[styles.logsStatValue, {color: COLORS.primary}]}>
                {dayStats.checkIns}
              </Text>
            </View>
            <View style={styles.logsStatCard}>
              <Text style={styles.logsStatTitle}>Total Check-outs</Text>
              <Text style={[styles.logsStatValue, {color: '#9c27b0'}]}>
                {dayStats.checkOuts}
              </Text>
            </View>
            <View style={styles.logsStatCard}>
              <Text style={styles.logsStatTitle}>Active Today</Text>
              <Text style={[styles.logsStatValue, {color: '#009688'}]}>
                {dayStats.activeIds}
              </Text>
            </View>
          </View>

          {/* Day Selector */}
          <View style={{marginVertical: SIZES.sm}}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.daySelectorContainer}
              contentContainerStyle={styles.daySelectorContent}>
              {daysList.map(day => {
                const isActive = day.id === selectedDayId;
                return (
                  <TouchableOpacity
                    key={day.id}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                    onPress={() => setSelectedDayId(day.id)}>
                    <Text
                      style={[
                        styles.dayChipText,
                        isActive && styles.dayChipTextActive,
                      ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Sync Button inside Modal */}
          <View style={{paddingHorizontal: SIZES.lg, marginBottom: SIZES.sm}}>
            <TouchableOpacity
              style={[
                styles.modalSyncBtn,
                isModalSyncing && styles.modalSyncBtnDisabled,
              ]}
              onPress={handleModalSync}
              disabled={isModalSyncing}>
              {isModalSyncing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.modalSyncBtnText}>🔄 Sync Hosted Data</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* List of Grouped Records */}
          {filteredGroupedLogs.length > 0 ? (
            <FlatList
              data={filteredGroupedLogs}
              keyExtractor={(item: any) =>
                `${item.employee_id}_${item.dateStr}`
              }
              renderItem={renderGroupedLogItem}
              contentContainerStyle={styles.logsListContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyLogsCard}>
              <Text style={styles.emptyLogsText}>
                No attendance records found for this day.
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={styles.logsModalCloseButton}
            onPress={() => setShowLogsModal(false)}>
            <Text style={styles.logsModalCloseButtonText}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardAccent: {
    backgroundColor: '#1e3a8a',
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
    shadowOffset: {width: 0, height: 2},
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
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    marginTop: SIZES.lg,
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
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
  syncBanner: {
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginBottom: SIZES.xl,
    alignItems: 'center',
  },
  syncBannerText: {
    fontSize: SIZES.sm - 1,
    fontWeight: '700',
  },
  logListItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: SIZES.md,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  logListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logEmpName: {
    fontSize: SIZES.base + 1,
    fontWeight: '700',
    color: COLORS.text,
  },
  logEmpId: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badgeContainer: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logListDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: SIZES.sm,
  },
  logListBody: {
    flexDirection: 'column',
  },
  logLocText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  logTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTimeCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logTimeLabel: {
    fontSize: 9,
    color: COLORS.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  logTimeVal: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyLogsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  emptyLogsText: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  logsModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  logsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  logsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  logsCloseBtnText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  logsStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: SIZES.md,
  },
  logsStatCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  logsStatTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  logsStatValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  logsListContent: {
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  groupedLogCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: SIZES.md,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  groupedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupedEmpName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  groupedEmpId: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  groupedLocRow: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 6,
  },
  groupedTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.sm,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: SIZES.sm,
  },
  groupedTimeCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  groupedTimeLabel: {
    fontSize: 8,
    color: COLORS.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  groupedTimeVal: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
  },
  groupedStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  groupedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  groupedStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  groupedStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.success,
  },
  groupedUuidText: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: COLORS.textTertiary,
  },
  logsModalCloseButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: SIZES.md,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SIZES.lg,
    minHeight: SIZES.buttonHeight,
  },
  logsModalCloseButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  daySelectorContainer: {
    marginHorizontal: SIZES.lg,
    maxHeight: 50,
  },
  daySelectorContent: {
    gap: 8,
    paddingRight: SIZES.lg,
  },
  dayChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: SIZES.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  modalSyncBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  modalSyncBtnDisabled: {
    opacity: 0.65,
  },
  modalSyncBtnText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});

export default AdminDashboardScreen;
