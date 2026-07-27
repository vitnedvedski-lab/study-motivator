/**
 * Поле ввода
 */
import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAppTheme } from '../../hooks/useAppTheme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: ViewStyle;
  inputStyle?: TextStyle;
  accessibilityLabel?: string;
  editable?: boolean;
}

export const Input = React.memo<InputProps>(({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
  inputStyle,
  accessibilityLabel,
  editable = true,
}) => {
  const palette = useAppTheme();
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[
          styles.input,
          {
            color: palette.textPrimary,
            backgroundColor: palette.surface,
            borderColor: palette.border,
            opacity: editable ? 1 : 0.85,
          },
          error && styles.inputError,
          inputStyle,
        ]}
        placeholderTextColor={palette.textTertiary}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="text"
      />
      {error && <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
});
