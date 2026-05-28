import React from 'react';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        Attendance camera is unavailable in this build.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
  },
});
