import React, { useMemo, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';

export type DropdownOption = {
  label: string;
  value: string;
};

type Props = {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange(value: string): void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  disabled?: boolean;
};

export function DropdownField({
  label, value, options, onChange, placeholder = 'Select an option', required = false,
  searchable = false, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? options.filter(option => option.label.toLowerCase().includes(query)) : options;
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}{required ? ' *' : ''}</Text> : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selected?.label || placeholder}` : selected?.label || placeholder}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, disabled && styles.disabled]}
        activeOpacity={0.75}
      >
        <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label || placeholder}
        </Text>
        <Icon name="chevron-down" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
          <SafeAreaView style={styles.dialog} edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.title}>{label || placeholder}</Text>
              <TouchableOpacity onPress={close} style={styles.closeButton}>
                <Icon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {searchable ? (
              <View style={styles.search}>
                <Icon name="magnify" size={19} color={Colors.textMuted} />
                <TextInput
                  autoFocus
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                />
              </View>
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No options available</Text>}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => { onChange(item.value); close(); }}
                    style={[styles.option, active && styles.activeOption]}
                  >
                    <Text style={[styles.optionText, active && styles.activeText]}>{item.label}</Text>
                    {active ? <Icon name="check" size={20} color={Colors.accent300} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  label: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  control: {
    minHeight: 52, borderWidth: 1, borderColor: Colors.borderDefault,
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center',
  },
  disabled: { opacity: 0.45 },
  value: { ...Typography.secondaryBody, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  dialog: {
    maxHeight: '72%', minHeight: 220, backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.sectionHeader, color: Colors.textPrimary, flex: 1 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  search: {
    minHeight: 46, borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: Colors.borderDefault, paddingHorizontal: Spacing.md,
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm,
  },
  searchInput: { ...Typography.secondaryBody, color: Colors.textPrimary, flex: 1, marginLeft: Spacing.sm },
  option: {
    minHeight: 50, paddingHorizontal: Spacing.sm, flexDirection: 'row',
    alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault,
  },
  activeOption: { backgroundColor: 'rgba(255,126,21,0.09)' },
  optionText: { ...Typography.secondaryBody, color: Colors.textPrimary, flex: 1 },
  activeText: { color: Colors.accent300 },
  empty: { ...Typography.secondaryBody, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
});
