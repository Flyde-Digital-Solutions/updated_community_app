import React, { useRef, useState } from 'react';
import {
  View, TextInput, StyleSheet, Platform,
  NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface Props {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
}

export const OtpInput: React.FC<Props> = ({ length = 4, onComplete, onChange }) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    const newOtp = [...otp];

    if (digits.length > 1) {
      digits.slice(0, length - index).split('').forEach((digit, offset) => {
        newOtp[index + offset] = digit;
      });
    } else {
      newOtp[index] = digits;
    }

    setOtp(newOtp);
    onChange?.(newOtp.join(''));
    const nextIndex = Math.min(index + Math.max(digits.length, 1), length - 1);
    if (digits && nextIndex > index) inputs.current[nextIndex]?.focus();
    if (newOtp.every(d => d !== '')) onComplete?.(newOtp.join(''));
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array(length).fill(0).map((_, index) => (
        <TextInput
          key={index}
          ref={ref => {
            inputs.current[index] = ref;
          }}
          style={[
            styles.box,
            otp[index] ? styles.boxFilled : styles.boxEmpty,
            focusedIndex === index && styles.boxFocused,
          ]}
          keyboardType="number-pad"
          maxLength={length}
          value={otp[index]}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(current => current === index ? null : current)}
          selectTextOnFocus
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          autoComplete={index === 0 ? 'sms-otp' : 'off'}
          selectionColor={Colors.accent300}
          caretHidden
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    minWidth: 0,
    maxWidth: 52,
    height: 58,
    borderRadius: BorderRadius.lg,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'SequelSans-MediumBody',
    fontSize: 22,
    lineHeight: Platform.OS === 'ios' ? undefined : 30,
    letterSpacing: -0.11,
    color: Colors.textPrimary,
    padding: 0,
  },
  boxEmpty: {
    backgroundColor: 'rgba(44,44,46,0.92)',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  boxFilled: {
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1.5,
    borderColor: Colors.accent300,
  },
  boxFocused: {
    backgroundColor: 'rgba(255,126,21,0.10)',
    borderWidth: 1.5,
    borderColor: Colors.accent300,
  },
});
