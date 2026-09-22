import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BorderRadius, Colors, Spacing, Typography } from '../../theme';
import { FileAttachment } from '../../types/domain';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function selectImageAttachment(): Promise<FileAttachment | null> {
  try {
    const [image] = await pick({ type: types.images, allowMultiSelection: false });
    if (image.size && image.size > MAX_IMAGE_BYTES) {
      Alert.alert('Image too large', 'Choose an image smaller than 10 MB.');
      return null;
    }
    return {
      uri: image.uri,
      name: image.name || `image-${Date.now()}.jpg`,
      type: image.type || 'image/jpeg',
      size: image.size || undefined,
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}

export function ImagePickerField({ label, file, existingUri, onChange, onClear, required = false }: {
  label: string;
  file: FileAttachment | null;
  existingUri?: string;
  onChange(file: FileAttachment): void;
  onClear(): void;
  required?: boolean;
}) {
  const uri = file?.uri || existingUri;
  const choose = async () => {
    try {
      const selected = await selectImageAttachment();
      if (selected) onChange(selected);
    } catch (error) {
      Alert.alert('Could not select image', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity onPress={choose} style={styles.picker} activeOpacity={0.75}>
        {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="cover" /> : (
          <View style={styles.emptyPreview}><Icon name="file-image-plus-outline" size={31} color={Colors.accent300} /></View>
        )}
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>{file?.name || (existingUri ? 'Current image' : 'Choose an image')}</Text>
          <Text style={styles.hint}>{file?.size ? `${(file.size / 1024).toFixed(0)} KB` : 'JPG, PNG, HEIC or another image · max 10 MB'}</Text>
        </View>
        <Icon name="chevron-right" size={22} color={Colors.textMuted} />
      </TouchableOpacity>
      {uri ? <TouchableOpacity onPress={onClear} style={styles.remove}><Icon name="delete-outline" size={16} color={Colors.alert} /><Text style={styles.removeText}>Remove image</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  label: { ...Typography.sectionLabel, color: Colors.textSecondary, marginBottom: 7 },
  picker: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: BorderRadius.md },
  preview: { width: 70, height: 70, borderRadius: BorderRadius.sm, backgroundColor: Colors.cardSurface },
  emptyPreview: { width: 70, height: 70, borderRadius: BorderRadius.sm, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0 },
  title: { ...Typography.primaryBody, color: Colors.textPrimary },
  hint: { ...Typography.caption, color: Colors.textMuted, marginTop: 5, lineHeight: 16 },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', paddingTop: 7 },
  removeText: { ...Typography.caption, color: Colors.alert },
});
