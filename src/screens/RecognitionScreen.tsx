import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SIZES, STRINGS } from '../constants';
import { globalStyles } from '../theme';

type RecognitionScreenProps = NativeStackScreenProps<RootStackParamList, 'Recognition'>;

const RecognitionScreen: React.FC<RecognitionScreenProps> = ({ navigation, route }) => {
  const { employeeId, department } = route.params;

  return (
    <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
      <Text style={styles.title}>{STRINGS.recognition.title}</Text>

      {/* Processing indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{STRINGS.recognition.processing}</Text>
      </View>

      {/* Navigation */}
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('Result', {
            employeeId,
            status: 'success',
            message: 'Face recognized successfully',
          })
        }>
        <Text style={styles.buttonText}>Continue to Result</Text>
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

export default RecognitionScreen;
