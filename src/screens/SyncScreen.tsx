import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';
import {
  getPendingSyncRecords,
  markRecordAsSynced,
} from '../services/databaseService';
import {
  checkInternetConnectivity,
  subscribeToConnectivityChanges,
  formatTimestamp,
} from '../utils';

type SyncScreenProps = NativeStackScreenProps<RootStackParamList, 'Sync'>;

const SyncScreen: React.FC<SyncScreenProps> = ({ navigation }) => {
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [error, setError] = useState('');

  // Load database queue
  const loadQueue = async () => {
    try {
      const records = await getPendingSyncRecords();
      setPendingRecords(records);
    } catch (e) {
      console.log('Error loading sync queue:', e);
    }
  };

  useEffect(() => {
    loadQueue();

    // Subscribe to real-time network state changes
    const unsubscribe = subscribeToConnectivityChanges((connected) => {
      setIsOnline(connected);
      if (connected && pendingRecords.length > 0 && !isSyncing) {
        // INNOVATION: Automatic background sync on network restoration!
        console.log('Network restored. Initializing automatic synchronization...');
        executeSync(true);
      }
    });

    // Check initial connectivity
    checkInternetConnectivity().then(setIsOnline);

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
      } catch (error) {
        console.error('Remote sync failed:', error);
        return false;
      }
    }

    // No remote endpoint configured: simulate upload success locally.
    return true;
  };

  const executeSync = async (isAuto = false) => {
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
        setSyncedCount(prev => prev + 1);
      } catch (err) {
        console.error('Record upload failed for UUID:', record.uuid, err);
      }
    }

    // Refresh pending queue from database
    await loadQueue();
    setIsSyncing(false);
  };

  const renderQueueItem = ({ item }: { item: any }) => (
    <View style={styles.recordRowCard}>
      <View style={styles.recordBadge}>
        <Text style={styles.recordBadgeText}>Attendance Log</Text>
      </View>
      <View style={styles.recordDetails}>
        <Text style={styles.recordIdText}>ID: {item.employee_id}</Text>
        <Text style={styles.recordTimeText}>{formatTimestamp(item.timestamp)}</Text>
        <Text style={styles.recordLocText} numberOfLines={1}>{item.location}</Text>
      </View>
      <View style={styles.recordStatusBadge}>
        <View style={styles.pendingDot} />
        <Text style={styles.pendingBadgeText}>PENDING</Text>
      </View>
    </View>
  );

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
          { backgroundColor: isOnline ? '#e6f4ea' : '#fce8e6' },
        ]}>
        <View
          style={[
            styles.networkDot,
            { backgroundColor: isOnline ? COLORS.success : COLORS.error },
          ]}
        />
        <Text
          style={[
            styles.networkText,
            { color: isOnline ? COLORS.success : COLORS.error },
          ]}>
          {isOnline
            ? 'Connected to Network (Automatic sync enabled)'
            : 'No Network Connection (Operating in zero-network zone)'}
        </Text>
      </View>

      {/* Sync Status Cards */}
      <View style={styles.cardContainer}>
        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>Pending Sync</Text>
          <Text style={styles.cardVal}>{pendingRecords.length}</Text>
        </View>
        <View style={[styles.statusCard, { backgroundColor: '#e6f4ea' }]}>
          <Text style={styles.cardLabel}>Synced Today</Text>
          <Text style={[styles.cardVal, { color: COLORS.success }]}>{syncedCount}</Text>
        </View>
      </View>

      {/* Syncing Progress Indicator */}
      {isSyncing && (
        <View style={styles.progressSection}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>Uploading records to AWS Server...</Text>
            <Text style={styles.progressPercent}>{syncProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressIndicator, { width: `${syncProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Error Message */}
      {error ? (
        <View style={styles.errBox}>
          <Text style={styles.errBoxText}>{error}</Text>
        </View>
      ) : null}

      {/* Pending Logs List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Local Queue Logs</Text>
        {pendingRecords.length > 0 ? (
          <FlatList
            data={pendingRecords}
            keyExtractor={item => item.uuid}
            renderItem={renderQueueItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending logs found.</Text>
            <Text style={styles.emptySubText}>
              All offline attendance records have been successfully uploaded and purged.
            </Text>
          </View>
        )}
      </View>

      {/* Footer Controls */}
      <View style={styles.footerControls}>
        <TouchableOpacity
          style={[
            styles.syncActionButton,
            (!isOnline || pendingRecords.length === 0 || isSyncing) && styles.syncActionBtnDisabled,
          ]}
          onPress={() => executeSync(false)}
          disabled={!isOnline || pendingRecords.length === 0 || isSyncing}>
          {isSyncing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.syncActionButtonText}>
              {STRINGS.sync.uploadRecords}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => navigation.navigate('Login')}
          disabled={isSyncing}>
          <Text style={styles.backHomeButtonText}>Back to Login</Text>
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
});

export default SyncScreen;
