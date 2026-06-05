import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';

const HARDCODED_SERVER_URL = 'http://localhost:3000';

import {RootStackParamList} from '../types';
import {COLORS, SIZES} from '../constants';
import {globalStyles} from '../theme';
import {
  getPendingSyncRecords,
  getAllAttendanceRecords,
  markRecordAsSynced,
  getPendingSyncEmployees,
  markEmployeeAsSynced,
  insertOrUpdateEmployee,
  insertSyncedAttendance,
} from '../services/databaseService';
import {
  checkInternetConnectivity,
  subscribeToConnectivityChanges,
  formatTimestamp,
} from '../utils';

type SyncScreenProps = NativeStackScreenProps<RootStackParamList, 'Sync'>;

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

const formatTimeOnly = (ts: number): string => {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const formatDateOnly = (ts: number): string => {
  const date = new Date(ts);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
      day: 'numeric',
    });
    list.push({
      id: `day_${i}`,
      label,
      dateStr: date.toDateString(),
    });
  }

  return list;
};

const SyncScreen: React.FC<SyncScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const employeeId = route.params?.employeeId;
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('day_0');

  // Server config & pending count state
  const [pendingEmployeesCount, setPendingEmployeesCount] = useState(0);

  const pendingRecordsRef = useRef(pendingRecords);
  const pendingEmployeesCountRef = useRef(pendingEmployeesCount);
  const isSyncingRef = useRef(isSyncing);

  useEffect(() => {
    pendingRecordsRef.current = pendingRecords;
    pendingEmployeesCountRef.current = pendingEmployeesCount;
    isSyncingRef.current = isSyncing;
  }, [pendingRecords, pendingEmployeesCount, isSyncing]);

  // Calendar States for Employee dashboard
  const todayDateObj = new Date();
  const [calendarMonth, setCalendarMonth] = useState(todayDateObj.getMonth());
  const [calendarYear, setCalendarYear] = useState(todayDateObj.getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(
    null,
  );
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  const MONTH_NAMES = React.useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [],
  );

  const monthRecords = React.useMemo(() => {
    return allRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
    });
  }, [allRecords, calendarMonth, calendarYear]);

  const daysWithLogs = React.useMemo(() => {
    const map: {[day: number]: any[]} = {};
    monthRecords.forEach(r => {
      const day = new Date(r.timestamp).getDate();
      if (!map[day]) {
        map[day] = [];
      }
      map[day].push(r);
    });
    return map;
  }, [monthRecords]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
    setSelectedCalendarDay(null);
  };

  const renderEmployeeAttendanceView = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <View key={`empty-${i}`} style={styles.calendarDayCellEmpty} />,
      );
    }

    const todayDate = new Date();
    const isCurrentMonth =
      todayDate.getMonth() === calendarMonth &&
      todayDate.getFullYear() === calendarYear;
    const todayDay = todayDate.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const logs = daysWithLogs[d] || [];
      const hasCheckIn = logs.some(r => r.check_type === 'check-in');
      const hasCheckOut = logs.some(r => r.check_type === 'check-out');

      let dotColor = null;

      const cellDate = new Date(calendarYear, calendarMonth, d);
      cellDate.setHours(0, 0, 0, 0);
      const todayCompare = new Date(todayDate);
      todayCompare.setHours(0, 0, 0, 0);

      if (logs.length > 0) {
        if (hasCheckIn && hasCheckOut) {
          dotColor = COLORS.success;
        } else {
          dotColor = '#ffb300';
        }
      } else if (cellDate < todayCompare) {
        dotColor = COLORS.error;
      }

      const isToday = isCurrentMonth && d === todayDay;
      const isSelected = selectedCalendarDay === d;

      cells.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            isToday && styles.calendarDayCellToday,
            isSelected && styles.calendarDayCellSelected,
          ]}
          onPress={() => {
            setSelectedCalendarDay(d);
            setShowDayDetailModal(true);
          }}>
          <Text
            style={[
              styles.calendarDayText,
              isToday && styles.calendarDayTextToday,
              isSelected && styles.calendarDayTextSelected,
            ]}>
            {d}
          </Text>
          {dotColor && (
            <View
              style={[styles.calendarDayDot, {backgroundColor: dotColor}]}
            />
          )}
        </TouchableOpacity>,
      );
    }

    const selectedDayLogs = selectedCalendarDay
      ? daysWithLogs[selectedCalendarDay] || []
      : [];
    const checkInRecord = selectedDayLogs.find(
      r => r.check_type === 'check-in',
    );
    const checkOutRecord = selectedDayLogs.find(
      r => r.check_type === 'check-out',
    );

    const checkInTime = checkInRecord
      ? formatTimeOnly(checkInRecord.timestamp)
      : 'Not Logged';
    const checkOutTime = checkOutRecord
      ? formatTimeOnly(checkOutRecord.timestamp)
      : checkInRecord
      ? 'Active Session'
      : 'Not Logged';
    const workedDuration =
      checkInRecord && checkOutRecord
        ? formatDuration(checkOutRecord.timestamp - checkInRecord.timestamp)
        : '--';
    const checkInLocation = checkInRecord
      ? checkInRecord.site_name || checkInRecord.location || 'N/A'
      : 'N/A';
    const checkOutLocation = checkOutRecord
      ? checkOutRecord.site_name || checkOutRecord.location || 'N/A'
      : 'N/A';
    const isSynced =
      selectedDayLogs.length > 0 && selectedDayLogs.every(r => r.synced === 1);

    const selectedDateStr = selectedCalendarDay
      ? new Date(
          calendarYear,
          calendarMonth,
          selectedCalendarDay,
        ).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

    return (
      <SafeAreaView style={[styles.container, globalStyles.container]}>
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <TouchableOpacity
              style={styles.backArrowBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}>
              <Text style={styles.backArrowText}>←</Text>
            </TouchableOpacity>
            <View style={{flex: 1}}>
              <Text style={styles.title}>My Attendance</Text>
              <Text style={styles.subtitle}>
                ID: {employeeId} • Monthly Calendar
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{paddingBottom: 40}}
          showsVerticalScrollIndicator={false}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.monthNavBtn}>
                <Text style={styles.monthNavBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.monthNavBtn}>
                <Text style={styles.monthNavBtnText}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.weekdayLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>{cells}</View>
          </View>
        </ScrollView>

        <Modal
          visible={showDayDetailModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDayDetailModal(false)}>
          <View style={styles.dayModalOverlay}>
            <View style={styles.dayModalContent}>
              <View style={styles.dayModalHeader}>
                <Text style={styles.dayModalTitle}>Attendance Details</Text>
                <TouchableOpacity onPress={() => setShowDayDetailModal(false)}>
                  <Text style={styles.dayModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.dayModalBody}
                showsVerticalScrollIndicator={false}>
                <Text style={styles.dayModalDateText}>{selectedDateStr}</Text>

                <View style={styles.dayModalDivider} />

                {selectedDayLogs.length > 0 ? (
                  <View style={styles.dayDetailsGrid}>
                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>Check-In Time</Text>
                      <Text style={styles.dayDetailValue}>{checkInTime}</Text>
                    </View>
                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>
                        Check-In Location
                      </Text>
                      <Text style={styles.dayDetailValueText} numberOfLines={2}>
                        📍 {checkInLocation}
                      </Text>
                    </View>

                    <View style={styles.dayModalDivider} />

                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>Check-Out Time</Text>
                      <Text style={styles.dayDetailValue}>{checkOutTime}</Text>
                    </View>
                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>
                        Check-Out Location
                      </Text>
                      <Text style={styles.dayDetailValueText} numberOfLines={2}>
                        📍 {checkOutLocation}
                      </Text>
                    </View>

                    <View style={styles.dayModalDivider} />

                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>Worked Duration</Text>
                      <Text
                        style={[
                          styles.dayDetailValue,
                          {color: COLORS.primary, fontWeight: '700'},
                        ]}>
                        {workedDuration}
                      </Text>
                    </View>

                    <View style={styles.dayDetailField}>
                      <Text style={styles.dayDetailLabel}>Sync Status</Text>
                      <View
                        style={[
                          styles.badgeSmall,
                          {
                            alignSelf: 'flex-start',
                            marginTop: 4,
                            backgroundColor: isSynced ? '#e6f4ea' : '#fff3e0',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.badgeSmallText,
                            {color: isSynced ? COLORS.success : COLORS.warning},
                          ]}>
                          {isSynced ? 'SYNCED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.dayModalEmpty}>
                    <Text style={styles.dayModalEmptyText}>
                      Absent / No Records
                    </Text>
                    <Text style={styles.dayModalEmptySubText}>
                      No check-in or check-out logs were registered on this
                      date.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.dayModalCloseBtn}
                onPress={() => setShowDayDetailModal(false)}>
                <Text style={styles.dayModalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

  const daysList = React.useMemo(() => generateDaysList(), []);

  const filteredRecords = React.useMemo(() => {
    const selectedDay = daysList.find(d => d.id === selectedDayId);
    if (!selectedDay) {
      return [];
    }

    return allRecords.filter(record => {
      const recordDateStr = new Date(record.timestamp).toDateString();
      return recordDateStr === selectedDay.dateStr;
    });
  }, [allRecords, selectedDayId, daysList]);

  const totalWorkedTimeMs = React.useMemo(() => {
    return filteredRecords
      .filter(r => r.check_type === 'check-out')
      .reduce((sum, r) => sum + (r.duration || 0), 0);
  }, [filteredRecords]);

  const formattedTotalWorked = React.useMemo(() => {
    return formatDuration(totalWorkedTimeMs);
  }, [totalWorkedTimeMs]);

  const dayStats = React.useMemo(() => {
    const checkIns = filteredRecords.filter(
      r => r.check_type === 'check-in',
    ).length;
    const checkOuts = filteredRecords.filter(
      r => r.check_type === 'check-out',
    ).length;
    const uniqueIds = new Set(filteredRecords.map(r => r.employee_id)).size;
    const synced = filteredRecords.filter(r => r.synced === 1).length;
    const pending = filteredRecords.filter(r => r.synced === 0).length;
    return {checkIns, checkOuts, uniqueIds, synced, pending};
  }, [filteredRecords]);

  // Load database queue
  const loadQueue = React.useCallback(async () => {
    try {
      console.log('Loading sync queue...');
      let records = await getPendingSyncRecords();
      let all = await getAllAttendanceRecords(200);

      if (employeeId) {
        const filterId = String(employeeId).trim().toUpperCase();
        records = records.filter(
          (r: any) => String(r.employee_id).trim().toUpperCase() === filterId,
        );
        all = all.filter(
          (r: any) => String(r.employee_id).trim().toUpperCase() === filterId,
        );
      }

      console.log('Pending records:', records);
      setPendingRecords(records);
      console.log('All records:', all);
      setAllRecords(all);

      // Load unsynced employees count
      const pendingEmps = await getPendingSyncEmployees();
      setPendingEmployeesCount(pendingEmps.length);
    } catch (e) {
      console.log('Error loading sync queue:', e);
    }
  }, [employeeId]);

  // Load queue when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadQueue();
    }, [loadQueue]),
  );

  useEffect(() => {
    let wasOffline = false;

    // Check initial connectivity once
    checkInternetConnectivity().then(connected => {
      setIsOnline(connected);
      wasOffline = !connected;
    });

    // Subscribe to real-time network state changes
    const unsubscribe = subscribeToConnectivityChanges(connected => {
      setIsOnline(connected);

      const hasPending =
        pendingRecordsRef.current.length > 0 ||
        pendingEmployeesCountRef.current > 0;

      if (connected && wasOffline && hasPending && !isSyncingRef.current) {
        // INNOVATION: Automatic background sync on network restoration!
        console.log(
          'Network restored. Initializing automatic synchronization...',
        );
        executeSync(true);
      }
      wasOffline = !connected;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeSync = async (_isAuto = false) => {
    const online = await checkInternetConnectivity();
    if (!online) {
      setError('Cannot sync. Please check your internet connection.');
      return;
    }

    if (
      !HARDCODED_SERVER_URL ||
      !HARDCODED_SERVER_URL.trim().startsWith('http')
    ) {
      setError(
        'Server URL is not configured. Please update HARDCODED_SERVER_URL in the app.',
      );
      return;
    }

    setError('');
    setIsSyncing(true);
    setSyncProgress(10);

    try {
      const targetUrl = HARDCODED_SERVER_URL.trim().replace(/\/$/, ''); // Remove trailing slash

      // 1. Upload Unsynced Employees
      const pendingEmps = await getPendingSyncEmployees();
      if (pendingEmps.length > 0) {
        console.log(`Syncing ${pendingEmps.length} employees to server...`);
        const response = await fetch(`${targetUrl}/api/sync/employees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pendingEmps),
        });

        if (response.ok) {
          for (const emp of pendingEmps) {
            await markEmployeeAsSynced(emp.id);
          }
        } else {
          throw new Error(
            `Server rejected employee profiles upload: ${response.status}`,
          );
        }
      }
      setSyncProgress(40);

      // 2. Upload Unsynced Attendance Records
      const recordsToSync = await getPendingSyncRecords();
      if (recordsToSync.length > 0) {
        console.log(
          `Syncing ${recordsToSync.length} attendance logs to server...`,
        );
        const response = await fetch(`${targetUrl}/api/sync/attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recordsToSync),
        });

        if (response.ok) {
          for (const record of recordsToSync) {
            await markRecordAsSynced(record.uuid);
          }
        } else {
          throw new Error(
            `Server rejected attendance logs upload: ${response.status}`,
          );
        }
      }
      setSyncProgress(65);

      // 3. Pull Master Employees List from Server
      console.log('Downloading master employee records from server...');
      const empGetRes = await fetch(`${targetUrl}/api/sync/employees`);
      if (empGetRes.ok) {
        const serverEmployees = await empGetRes.json();
        console.log(
          `Downloaded ${serverEmployees.length} employee profiles from server.`,
        );
        for (const emp of serverEmployees) {
          await insertOrUpdateEmployee(
            {
              id: emp.id,
              name: emp.name,
              department: emp.department,
              photoPath: emp.photo_path || emp.photoPath,
              faceVector:
                emp.faceVector ||
                (emp.face_vector
                  ? typeof emp.face_vector === 'string'
                    ? JSON.parse(emp.face_vector)
                    : emp.face_vector
                  : null),
              createdAt: emp.created_at || emp.createdAt,
              updatedAt: emp.updated_at || emp.updatedAt,
            },
            1,
          ); // Set synced=1 since they originated from server
        }
      }
      setSyncProgress(85);

      // 4. Pull Master Attendance Logs from Server
      console.log('Downloading master attendance logs from server...');
      const attGetRes = await fetch(`${targetUrl}/api/sync/attendance`);
      if (attGetRes.ok) {
        const serverAttendance = await attGetRes.json();
        console.log(
          `Downloaded ${serverAttendance.length} attendance records from server.`,
        );
        for (const record of serverAttendance) {
          await insertSyncedAttendance(record);
        }
      }
      setSyncProgress(100);
    } catch (err: any) {
      console.error('Two-way synchronization failed:', err);
      setError(
        `Sync Failed: ${
          err?.message || err?.toString() || 'Connection Timeout'
        }`,
      );
    } finally {
      // Refresh pending queue from database
      await loadQueue();
      setIsSyncing(false);
    }
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
    const dateStr = formatDateOnly(item.timestamp);
    const inTimeStr = isCheckIn
      ? formatTimeOnly(item.timestamp)
      : formatTimeOnly(item.timestamp - (item.duration || 0));
    const outTimeStr = isCheckIn ? null : formatTimeOnly(item.timestamp);
    const workedStr = isCheckIn ? null : formatDuration(item.duration);
    const siteName = item.site_name || 'Outside Geofence / Unknown';
    const coords = item.location || '';

    return (
      <TouchableOpacity
        style={styles.recordRowCard}
        onPress={() => {
          setSelectedRecord(item);
          setShowDetailModal(true);
        }}>
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.recordBadge,
              !isCheckIn && {backgroundColor: 'rgba(156, 39, 176, 0.1)'},
            ]}>
            <Text
              style={[
                styles.recordBadgeText,
                !isCheckIn && {color: '#9c27b0'},
              ]}>
              {isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'}
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Text style={styles.recordIdText}>ID: {item.employee_id}</Text>
            {total > 1 && (
              <View style={styles.logIndexBadge}>
                <Text style={styles.logIndexBadgeText}>
                  Log {index} of {total}
                </Text>
              </View>
            )}
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
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <Text style={styles.cardLocText} numberOfLines={1}>
            📍 {siteName}{' '}
            {coords ? (
              <Text style={styles.cardCoordsText}>({coords})</Text>
            ) : null}
          </Text>

          <View style={styles.timesContainer}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>Date</Text>
              <Text style={styles.timeBlockVal}>{dateStr}</Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>In Time</Text>
              <Text style={styles.timeBlockVal}>{inTimeStr}</Text>
            </View>
            {!isCheckIn ? (
              <>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockLabel}>Out Time</Text>
                  <Text style={styles.timeBlockVal}>{outTimeStr}</Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockLabel}>Worked</Text>
                  <Text
                    style={[
                      styles.timeBlockVal,
                      {fontWeight: '700', color: COLORS.primary},
                    ]}>
                    {workedStr}
                  </Text>
                </View>
              </>
            ) : (
              <View style={[styles.timeBlock, {flex: 1.5}]}>
                <Text style={styles.timeBlockLabel}>Status</Text>
                <Text
                  style={[
                    styles.timeBlockVal,
                    {color: COLORS.secondary, fontWeight: '700'},
                  ]}>
                  Active Session
                </Text>
              </View>
            )}
          </View>
        </View>
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
            <Text style={styles.modalTitle}>
              {t('sync.attendanceDetailsTitle')}
            </Text>
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
                  <Text style={styles.detailLabel}>
                    {t('login.employeeIdLabel')}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.employee_id}
                  </Text>
                </View>

                {/* Log Attempt Index (Duplicate records check) */}
                {total > 1 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('sync.logIndexLabel')}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {color: '#b85c1c', fontWeight: 'bold'},
                      ]}>
                      {t('sync.logIndexValue', {index, total})}
                    </Text>
                  </View>
                )}

                {/* Department */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('login.departmentLabel')}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.department
                      ? t(`departments.${selectedRecord.department}`)
                      : 'N/A'}
                  </Text>
                </View>

                {/* Check Type */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('sync.typeLabel')}</Text>
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
                  <Text style={styles.detailLabel}>
                    {t('sync.dateTimeLabel')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatTimestamp(selectedRecord.timestamp)}
                  </Text>
                </View>

                {/* Location */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('sync.locationCoordsLabel')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.location || 'Location not available'}
                  </Text>
                </View>

                {/* Project Site */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('sync.detectedSiteLabel')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.site_name || 'Outside Geofence / Unknown'}
                  </Text>
                </View>

                {/* Time Spent */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('sync.timeSpentLabel')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.check_type === 'check-out'
                      ? formatDuration(selectedRecord.duration)
                      : t('sync.sessionActiveText')}
                  </Text>
                </View>

                {/* Verification Status */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t('sync.verifiedLabel')}
                  </Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.verified === 1
                      ? `✓ ${t('common.yes')}`
                      : `✗ ${t('common.no')}`}
                  </Text>
                </View>

                {/* Sync Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    {t('sync.statusLabel')}
                  </Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t('sync.statusLabel')}
                    </Text>
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
                      <Text style={styles.detailLabel}>
                        {t('sync.syncedAtLabel')}
                      </Text>
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
                  <Text style={styles.detailLabel}>
                    {t('sync.recordIdLabel')}
                  </Text>
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
            <Text style={styles.modalCloseBtnText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  };

  if (employeeId) {
    return renderEmployeeAttendanceView();
  }

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <TouchableOpacity
            style={styles.backArrowBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={styles.title}>{t('sync.title')}</Text>
            <Text style={styles.subtitle}>
              {t('sync.datalakeSyncSubtitle')}
            </Text>
          </View>
        </View>
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
          {isOnline ? t('sync.connectedText') : t('sync.disconnectedText')}
        </Text>
      </View>

      {/* Dynamic Horizontal Date Selector */}
      <View style={{marginBottom: 4}}>
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
                  {day.label === 'Today'
                    ? t('sync.today')
                    : day.label === 'Yesterday'
                    ? t('sync.yesterday')
                    : day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sync Status Cards for Selected Day */}
      <View style={{marginBottom: 4}}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollContainer}
          contentContainerStyle={styles.statsScrollContent}>
          {!employeeId && (
            <>
              {/* Card 1: Check-ins */}
              <View style={styles.statusCardHorizontal}>
                <Text style={styles.cardLabel}>{t('sync.totalCheckIns')}</Text>
                <Text style={[styles.cardVal, {color: COLORS.primary}]}>
                  {dayStats.checkIns}
                </Text>
              </View>

              {/* Card 2: Check-outs */}
              <View
                style={[
                  styles.statusCardHorizontal,
                  {backgroundColor: 'rgba(156, 39, 176, 0.05)'},
                ]}>
                <Text style={styles.cardLabel}>{t('sync.totalCheckOuts')}</Text>
                <Text style={[styles.cardVal, {color: '#9c27b0'}]}>
                  {dayStats.checkOuts}
                </Text>
              </View>

              {/* Card 3: Unique IDs */}
              <View
                style={[
                  styles.statusCardHorizontal,
                  {backgroundColor: 'rgba(0, 150, 136, 0.05)'},
                ]}>
                <Text style={styles.cardLabel}>{t('sync.totalUniqueIds')}</Text>
                <Text style={[styles.cardVal, {color: '#009688'}]}>
                  {dayStats.uniqueIds}
                </Text>
              </View>
            </>
          )}

          {/* Card 4: Synced */}
          <View
            style={[styles.statusCardHorizontal, {backgroundColor: '#e6f4ea'}]}>
            <Text style={styles.cardLabel}>{t('sync.syncedLogs')}</Text>
            <Text style={[styles.cardVal, {color: COLORS.success}]}>
              {dayStats.synced}
            </Text>
          </View>

          {/* Card 5: Pending */}
          <View
            style={[styles.statusCardHorizontal, {backgroundColor: '#fff3e0'}]}>
            <Text style={styles.cardLabel}>{t('sync.pendingSync')}</Text>
            <Text style={[styles.cardVal, {color: COLORS.warning}]}>
              {dayStats.pending}
            </Text>
          </View>
          {employeeId && (
            /* Card 6: Total Worked Time */
            <View
              style={[
                styles.statusCardHorizontal,
                {backgroundColor: 'rgba(30, 58, 138, 0.05)', width: 140},
              ]}>
              <Text style={styles.cardLabel}>Total Worked</Text>
              <Text style={[styles.cardVal, {color: COLORS.primary}]}>
                {formattedTotalWorked}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Syncing Progress Indicator */}
      {isSyncing && (
        <View style={styles.progressSection}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>{t('sync.uploadingToAws')}</Text>
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
        <Text style={styles.sectionTitle}>{t('sync.localQueueLogs')}</Text>
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
            <Text style={styles.emptyText}>{t('sync.dayOffTitle')}</Text>
            <Text style={styles.emptySubText}>
              {t('sync.noLogsRecorded', {
                date: (() => {
                  const dayObj = daysList.find(d => d.id === selectedDayId);
                  if (!dayObj) {
                    return '';
                  }
                  return dayObj.label === 'Today'
                    ? t('sync.today')
                    : dayObj.label === 'Yesterday'
                    ? t('sync.yesterday')
                    : dayObj.label;
                })(),
              })}
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
    borderRadius: 10,
    borderWidth: 1,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.sm,
  },
  networkText: {
    fontSize: SIZES.xs + 1,
    fontWeight: '700',
  },
  cardContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.md,
    gap: SIZES.md,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: SIZES.sm - 1,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SIZES.xs,
  },
  cardVal: {
    fontSize: SIZES['2xl'],
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressSection: {
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  progressLabel: {
    fontSize: SIZES.sm - 1,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: SIZES.full,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#1e3a8a',
    borderRadius: SIZES.full,
  },
  errBox: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 10,
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.xs,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errBoxText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    fontWeight: '600',
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
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    flexDirection: 'column',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordBadge: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderRadius: 8,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  recordBadgeText: {
    fontSize: 9,
    color: '#1e3a8a',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recordIdText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  logIndexBadge: {
    backgroundColor: '#ffe8d6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#dd8b55',
  },
  logIndexBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b85c1c',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  cardBody: {
    flexDirection: 'column',
  },
  cardLocText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardCoordsText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  timesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBlock: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  timeBlockLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeBlockVal: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
  },
  recordStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
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
    backgroundColor: '#1e3a8a', // NHAI Corporate blue
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
  syncActionBtnDisabled: {
    opacity: 0.65,
  },
  syncActionButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  backHomeButton: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backHomeButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
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
    borderRadius: 12,
    padding: SIZES.lg,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    color: '#1e3a8a',
    marginBottom: SIZES.md,
    textTransform: 'uppercase',
  },
  badgeSmall: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.full,
  },
  badgeSmallText: {
    fontSize: SIZES.sm - 1,
    fontWeight: '800',
  },
  modalCloseBtn: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
    backgroundColor: '#1e3a8a',
    paddingVertical: SIZES.md,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
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
    backgroundColor: '#1e3a8a', // Corporate Blue active chip
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
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  // Sync Server URL Settings Panel Styles
  // Back Button Styles
  backArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowText: {
    fontSize: 20,
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  configPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    padding: SIZES.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  configLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  configInputRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    alignItems: 'center',
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    fontSize: SIZES.sm,
    color: COLORS.text,
    backgroundColor: '#f8fafc',
    minHeight: 38,
  },
  syncNowBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
  },
  syncNowBtnText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  configHint: {
    fontSize: SIZES.xs + 1,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  metricsContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    gap: SIZES.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  metricTitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
    padding: SIZES.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavBtnText: {
    fontSize: 12,
    color: COLORS.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  calendarDayCellEmpty: {
    width: '14.28%',
    height: 48,
  },
  calendarDayCellToday: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  calendarDayCellSelected: {
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
  },
  calendarDayText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  calendarDayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#1e3a8a',
    fontWeight: '700',
  },
  calendarDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 6,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  dayModalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SIZES.lg,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  dayModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayModalCloseText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  dayModalBody: {
    marginVertical: SIZES.sm,
  },
  dayModalDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  dayModalDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  dayDetailsGrid: {
    gap: 8,
  },
  dayDetailField: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dayDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayDetailValueText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dayModalEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  dayModalEmptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dayModalEmptySubText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  dayModalCloseBtn: {
    backgroundColor: '#1e3a8a',
    paddingVertical: SIZES.md,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.md,
    minHeight: SIZES.buttonHeight,
  },
  dayModalCloseBtnText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '600',
  },
});

export default SyncScreen;
