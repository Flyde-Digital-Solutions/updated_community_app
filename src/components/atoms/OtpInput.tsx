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
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    onChange?.(newOtp.join(''));
    if (text && index < length - 1) inputs.current[index + 1]?.focus();
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
          ref={ref => (inputs.current[index] = ref)}
          style={[styles.box, otp[index] ? styles.boxFilled : styles.boxEmpty]}
          keyboardType="number-pad"
          maxLength={1}
          value={otp[index]}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
          selectionColor={Colors.accent300}
          caretHidden
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  box: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
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
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  boxFilled: {
    backgroundColor: Colors.secondarySurface,
    borderWidth: 1.5,
    borderColor: Colors.accent300,
  },
});