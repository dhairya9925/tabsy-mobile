import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import { Mic, Square } from 'lucide-react-native';

interface VoiceRecordButtonProps {
  isRecording: boolean;
  durationSeconds: number;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onCancelRecord?: () => void;
  disabled?: boolean;
}

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  isRecording,
  durationSeconds,
  onStartRecord,
  onStopRecord,
  onCancelRecord,
  disabled = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(1)).current;
  const ringOpacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let ringLoop: Animated.CompositeAnimation | null = null;

    if (isRecording) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      ringLoop = Animated.loop(
        Animated.parallel([
          Animated.timing(ringScaleAnim, {
            toValue: 1.8,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacityAnim, {
              toValue: 0.2,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacityAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseLoop.start();
      ringLoop.start();
    } else {
      pulseAnim.setValue(1);
      ringScaleAnim.setValue(1);
      ringOpacityAnim.setValue(0.7);
    }

    return () => {
      pulseLoop?.stop();
      ringLoop?.stop();
    };
  }, [isRecording, pulseAnim, ringScaleAnim, ringOpacityAnim]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.recordingOverlay}>
          {/* Animated pulse halo */}
          <Animated.View
            style={[
              styles.haloRing,
              {
                transform: [{ scale: ringScaleAnim }],
                opacity: ringOpacityAnim,
              },
            ]}
          />

          {/* Duration Indicator */}
          <View style={styles.timerBadge}>
            <View style={styles.blinkingDot} />
            <SproutText variant="caption" style={styles.timerText}>
              {formatTimer(durationSeconds)} / 0:30
            </SproutText>
          </View>
        </View>
      )}

      {/* Button */}
      <Animated.View
        style={{
          transform: [{ scale: isRecording ? pulseAnim : 1 }],
        }}
      >
        <TouchableOpacity
          accessibilityLabel={isRecording ? 'Stop recording voice' : 'Hold to record voice'}
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={disabled}
          onPressIn={() => {
            if (!disabled && !isRecording) {
              onStartRecord();
            }
          }}
          onPressOut={() => {
            if (isRecording) {
              onStopRecord();
            }
          }}
          style={[
            styles.micButton,
            isRecording ? styles.micButtonRecording : styles.micButtonIdle,
            disabled && styles.micButtonDisabled,
          ]}
        >
          {isRecording ? (
            <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={22} color={disabled ? colors.muted : colors.onAccent} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  recordingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.negative,
  },
  timerBadge: {
    position: 'absolute',
    bottom: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#183228E6',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  blinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.negative,
  },
  timerText: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
    fontSize: 12,
  },
  micButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonIdle: {
    backgroundColor: colors.accent,
  },
  micButtonRecording: {
    backgroundColor: colors.negative,
  },
  micButtonDisabled: {
    backgroundColor: colors.line,
    opacity: 0.6,
  },
});
