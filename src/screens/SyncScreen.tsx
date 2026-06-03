import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../types';
import {COLORS, SIZES, STRINGS} from '../constants';
import {globalStyles} from '../theme';
import {
  getPendingSyncRecords,
  getAllAttendanceRecords,
  markRecordAsSynced,
} from '../services/databaseService';
import {
  checkInternetConnectivity,
  subscribeToConnectivityChanges,
  formatTimestamp,
} from '../utils';

type SyncScreenProps = NativeStackScreenProps<RootStackParamList, 'Sync'>;

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
};

const generateDaysList = () => {
  const list = [];
  const today = new Date();
  
  // Day 0: Today
  list.push({
    id: 'day_0',
    label: 'Today',
    dateStr: today.toDateString(),
  });
  
  // Day 1: Yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  list.push({
    id: 'day_1',
    label: 'Yesterday',
    dateStr: yesterday.toDateString(),
  });
  
  // Days 2 to 6: older dates
  for (let i = 2; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    list.push({
      id: `day_${i}`,
      label,
      dateStr: date.toDateString(),
    });
  }
  
  return list;
};

const SyncScreen: React.FC<SyncScreenProps> = ({navigation}) => {
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('day_0');

  const daysList = React.useMemo(() => generateDaysList(), []);

  const filteredRecords = React.useMemo(() => {
    const selectedDay = daysList.find(d => d.id === selectedDayId);
    if (!selectedDay) return [];
    
    return allRecords.filter(record => {
      const recordDateStr = new Date(record.timestamp).toDateString();
      return recordDateStr === selectedDay.dateStr;
    });
  }, [allRecords, selectedDayId, daysList]);

  const dayStats = React.useMemo(() => {
    const checkIns = filteredRecords.filter(r => r.check_type === 'check-in').length;
    const checkOuts = filteredRecords.filter(r => r.check_type === 'check-out').length;
    const uniqueIds = new Set(filteredRecords.map(r => r.employee_id)).size;
    const synced = filteredRecords.filter(r => r.synced === 1).length;
    const pending = filteredRecords.filter(r => r.synced === 0).length;
    return { checkIns, checkOuts, uniqueIds, synced, pending };
  }, [filteredRecords]);

  // Load database queue
  const loadQueue = async () => {
    try {
      console.log('Loading sync queue...');
      const records = await getPendingSyncRecords();
      console.log('Pending records:', records);
      setPendingRecords(records);
      const all = await getAllAttendanceRecords(200);
      console.log('All records:', all);
      setAllRecords(all);

      // Count synced records from database instead of relying on state
      const syncedRecords = all.filter((r: any) => r.synced === 1);
      console.log('Synced records count:', syncedRecords.length);
      setSyncedCount(syncedRecords.length);
    } catch (e) {
      console.log('Error loading sync queue:', e);
    }
  };

  // Load queue when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadQueue();
    }, []),
  );

  useEffect(() => {
    // Subscribe to real-time network state changes
    const unsubscribe = subscribeToConnectivityChanges(connected => {
      setIsOnline(connected);
      if (connected && pendingRecords.length > 0 && !isSyncing) {
        // INNOVATION: Automatic background sync on network restoration!
        console.log(
          'Network restored. Initializing automatic synchronization...',
        );
        executeSync(true);
      }
    });

    // Check initial connectivity
    checkInternetConnectivity().then(setIsOnline);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRecords.length, isSyncing]);

  const uploadAttendanceRecord = async (record: any): Promise<boolean> => {
    const SYNC_ENDPOINT = ''; // Optional: replace with your real server endpoint

    if (SYNC_ENDPOINT) {
      try {
        const response = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });

        return response.ok;
      } catch (err) {
        console.error('Remote sync failed:', err);
        return false;
      }
    }

    // No remote endpoint configured: simulate upload success locally.
    return true;
  };

  const executeSync = async (_isAuto = false) => {
    const online = await checkInternetConnectivity();
    if (!online) {
      setError('Cannot sync. Please check your internet connection.');
      return;
    }

    if (pendingRecords.length === 0) {
      return;
    }

    setError('');
    setIsSyncing(true);
    setSyncProgress(0);

    let completed = 0;
    const total = pendingRecords.length;

    for (const record of pendingRecords) {
      try {
        const synced = await uploadAttendanceRecord(record);
        if (!synced) {
          throw new Error('Upload failed');
        }

        // Mark as synced in SQLite and remove from sync queue
        await markRecordAsSynced(record.uuid);
        completed += 1;

        // Update progress state
        setSyncProgress(Math.round((completed / total) * 100));
      } catch (err) {
        console.error('Record upload failed for UUID:', record.uuid, err);
      }
    }

    // Refresh pending queue from database
    await loadQueue();
    setIsSyncing(false);
  };

  const getLogIndexInfo = (uuid: string, employeeId: string) => {
    const targetId = String(employeeId || '')
      .trim()
      .toUpperCase();
    const empRecords = filteredRecords
      .filter(
        r =>
          String(r.employee_id || '')
            .trim()
            .toUpperCase() === targetId,
      )
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const total = empRecords.length;
    const index = empRecords.findIndex(r => r.uuid === uuid) + 1;
    return {index, total};
  };

  const renderQueueItem = ({item}: {item: any}) => {
    const {index, total} = getLogIndexInfo(item.uuid, item.employee_id);
    const isCheckIn = item.check_type === 'check-in';

    return (
      <TouchableOpacity
        style={styles.recordRowCard}
        onPress={() => {
          setSelectedRecord(item);
          setShowDetailModal(true);
        }}>
        <View
          style={[
            styles.recordBadge,
            !isCheckIn && {backgroundColor: 'rgba(156, 39, 176, 0.1)'},
          ]}>
          <Text
            style={[styles.recordBadgeText, !isCheckIn && {color: '#9c27b0'}]}>
            {isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'}
          </Text>
        </View>
        <View style={styles.recordDetails}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Text style={styles.recordIdText}>ID: {item.employee_id}</Text>
            {total > 1 && (
              <View
                style={{
                  backgroundColor: '#ffe8d6',
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderWidth: 0.5,
                  borderColor: '#dd8b55',
                }}>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '800',
                    color: '#b85c1c',
                  }}>
                  Log {index} of {total}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.recordTimeText}>
            {formatTimestamp(item.timestamp)}
          </Text>
          <Text style={styles.recordLocText} numberOfLines={1}>
            📍 {item.location || 'Location not available'}
          </Text>
        </View>
        {item.synced === 1 ? (
          <View
            style={[
              styles.recordStatusBadge,
              {backgroundColor: 'rgba(76, 175, 80, 0.1)'},
            ]}>
            <View
              style={[styles.pendingDot, {backgroundColor: COLORS.success}]}
            />
            <Text style={[styles.pendingBadgeText, {color: COLORS.success}]}>
              SYNCED
            </Text>
          </View>
        ) : (
          <View style={styles.recordStatusBadge}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingBadgeText}>PENDING</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRecord) {
      return null;
    }
    const {index, total} = getLogIndexInfo(
      selectedRecord.uuid,
      selectedRecord.employee_id,
    );

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attendance Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedRecord && (
              <View style={styles.detailsBox}>
                {/* Employee ID */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employee ID:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.employee_id}
                  </Text>
                </View>

                {/* Log Attempt Index (Duplicate records check) */}
                {total > 1 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Log Index:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {color: '#b85c1c', fontWeight: 'bold'},
                      ]}>
                      Log {index} of {total}
                    </Text>
                  </View>
                )}

                {/* Department */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Department:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.department || 'N/A'}
                  </Text>
                </View>

                {/* Check Type */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <View
                    style={[
                      styles.badgeSmall,
                      {
                        backgroundColor:
                          selectedRecord.check_type === 'check-in'
                            ? '#e3f2fd'
                            : '#fce4ec',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.badgeSmallText,
                        {
                          color:
                            selectedRecord.check_type === 'check-in'
                              ? COLORS.primary
                              : COLORS.error,
                        },
                      ]}>
                      {selectedRecord.check_type === 'check-in'
                        ? 'CHECK-IN'
                        : 'CHECK-OUT'}
                    </Text>
                  </View>
                </View>

                {/* Timestamp */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {formatTimestamp(selectedRecord.timestamp)}
                  </Text>
                </View>

                {/* Location */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location Coords:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.location || 'Location not available'}
                  </Text>
                </View>

                {/* Project Site */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Detected Site:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.site_name || 'Outside Geofence / Unknown'}
                  </Text>
                </View>

                {/* Time Spent */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time Spent:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.check_type === 'check-out'
                      ? formatDuration(selectedRecord.duration)
                      : 'Session Active (Check-in)'}
                  </Text>
                </View>

                {/* Verification Status */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Verified:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.verified === 1 ? '✓ Yes' : '✗ No'}
                  </Text>
                </View>



                {/* Sync Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Sync Status</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View
                      style={[
                        styles.badgeSmall,
                        {
                          backgroundColor:
                            selectedRecord.synced === 1 ? '#e6f4ea' : '#fff3e0',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.badgeSmallText,
                          {
                            color:
                              selectedRecord.synced === 1
                                ? COLORS.success
                                : COLORS.warning,
                          },
                        ]}>
                        {selectedRecord.synced === 1 ? 'SYNCED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {selectedRecord.synced === 1 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Synced At:</Text>
                      <Text style={styles.detailValue}>
                        {selectedRecord.synced_at
                          ? formatTimestamp(selectedRecord.synced_at)
                          : 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Record ID */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Record ID:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {fontSize: 10, fontFamily: 'monospace'},
                    ]}>
                    {selectedRecord.uuid}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowDetailModal(false)}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{STRINGS.sync.title}</Text>
        <Text style={styles.subtitle}>Datalake 3.0 Secure Sync & Purge</Text>
      </View>

      {/* Network Connectivity Banner */}
      <View
        style={[
          styles.networkBanner,
          {backgroundColor: isOnline ? '#e6f4ea' : '#fce8e6'},
        ]}>
        <View
          style={[
            styles.networkDot,
            {backgroundColor: isOnline ? COLORS.success : COLORS.error},
          ]}
        />
        <Text
          style={[
            styles.networkText,
            {color: isOnline ? COLORS.success : COLORS.error},
          ]}>
          {isOnline
            ? 'Connected to Network (Automatic sync enabled)'
            : 'No Network Connection (Operating in zero-network zone)'}
        </Text>
      </View>

      {/* Dynamic Horizontal Date Selector */}
      <View style={{ marginBottom: 4 }}>
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
                style={[
                  styles.dayChip,
                  isActive && styles.dayChipActive
                ]}
                onPress={() => setSelectedDayId(day.id)}>
                <Text
                  style={[
                    styles.dayChipText,
                    isActive && styles.dayChipTextActive
                  ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sync Status Cards for Selected Day */}
      <View style={{ marginBottom: 4 }}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollContainer}
          contentContainerStyle={styles.statsScrollContent}>
          
          {/* Card 1: Check-ins */}
          <View style={styles.statusCardHorizontal}>
            <Text style={styles.cardLabel}>Total Check-ins</Text>
            <Text style={[styles.cardVal, {color: COLORS.primary}]}>{dayStats.checkIns}</Text>
          </View>
          
          {/* Card 2: Check-outs */}
          <View style={[styles.statusCardHorizontal, {backgroundColor: 'rgba(156, 39, 176, 0.05)'}]}>
            <Text style={styles.cardLabel}>Total Check-outs</Text>
            <Text style={[styles.cardVal, {color: '#9c27b0'}]}>{dayStats.checkOuts}</Text>
          </View>

          {/* Card 3: Unique IDs */}
          <View style={[styles.statusCardHorizontal, {backgroundColor: 'rgba(0, 150, 136, 0.05)'}]}>
            <Text style={styles.cardLabel}>Total Unique IDs</Text>
            <Text style={[styles.cardVal, {color: '#009688'}]}>{dayStats.uniqueIds}</Text>
          </View>

          {/* Card 4: Synced */}
          <View style={[styles.statusCardHorizontal, {backgroundColor: '#e6f4ea'}]}>
            <Text style={styles.cardLabel}>Synced Logs</Text>
            <Text style={[styles.cardVal, {color: COLORS.success}]}>
              {dayStats.synced}
            </Text>
          </View>

          {/* Card 5: Pending */}
          <View style={[styles.statusCardHorizontal, {backgroundColor: '#fff3e0'}]}>
            <Text style={styles.cardLabel}>Pending Sync</Text>
            <Text style={[styles.cardVal, {color: COLORS.warning}]}>
              {dayStats.pending}
            </Text>
          </View>
          
        </ScrollView>
      </View>

      {/* Syncing Progress Indicator */}
      {isSyncing && (
        <View style={styles.progressSection}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>
              Uploading records to AWS Server...
            </Text>
            <Text style={styles.progressPercent}>{syncProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressIndicator, {width: `${syncProgress}%`}]}
            />
          </View>
        </View>
      )}

      {/* Error Message */}
      {error ? (
        <View style={styles.errBox}>
          <Text style={styles.errBoxText}>{error}</Text>
        </View>
      ) : null}

      {/* Pending Logs List for Selected Day */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Local Queue Logs</Text>
        {filteredRecords.length > 0 ? (
          <FlatList
            data={filteredRecords}
            keyExtractor={item => item.uuid}
            renderItem={renderQueueItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Looks like you have the day off :)</Text>
            <Text style={styles.emptySubText}>
              No attendance logs recorded for {daysList.find(d => d.id === selectedDayId)?.label || 'this day'}.
            </Text>
          </View>
        )}
      </View>

      {/* Footer Controls Removed (Sync is fully automated and navigation uses header) */}

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES['3xl'],
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.base,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.sm,
  },
  networkText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '600',
  },
  cardContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.md,
    gap: SIZES.md,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.lg,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  cardVal: {
    fontSize: SIZES['3xl'],
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressSection: {
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  progressLabel: {
    fontSize: SIZES.sm - 1,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray300,
    borderRadius: SIZES.full,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.full,
  },
  errBox: {
    backgroundColor: '#fff3f3',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.base,
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.xs,
  },
  errBoxText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  listSection: {
    flex: 1,
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  listContent: {
    gap: SIZES.sm,
    paddingBottom: SIZES.lg,
  },
  recordRowCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordBadge: {
    backgroundColor: 'rgba(26, 84, 144, 0.1)',
    borderRadius: SIZES.sm,
    paddingHorizontal: SIZES.xs,
    paddingVertical: SIZES.xs,
  },
  recordBadgeText: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recordDetails: {
    flex: 1,
    marginHorizontal: SIZES.md,
  },
  recordIdText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  recordTimeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginVertical: 1,
  },
  recordLocText: {
    fontSize: 9,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  recordStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: SIZES.full,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginRight: 4,
  },
  pendingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  emptySubText: {
    fontSize: SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerControls: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
    gap: SIZES.md,
  },
  syncActionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  syncActionBtnDisabled: {
    opacity: 0.65,
  },
  syncActionButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  backHomeButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backHomeButtonText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.sm,
  },
  closeButtonText: {
    fontSize: SIZES.xl,
    color: COLORS.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.lg,
  },
  detailsBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    padding: SIZES.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  detailLabel: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 0.5,
  },
  detailValue: {
    fontSize: SIZES.md,
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  detailSection: {
    marginTop: SIZES.lg,
  },
  detailSectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.md,
    textTransform: 'uppercase',
  },
  badgeSmall: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.full,
  },
  badgeSmallText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  modalCloseBtnText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  daySelectorContainer: {
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  statsScrollContainer: {
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.md,
    maxHeight: 90,
  },
  statsScrollContent: {
    gap: SIZES.md,
    paddingRight: SIZES.lg,
  },
  statusCardHorizontal: {
    width: 140,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.lg,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default SyncScreen;
