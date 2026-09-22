import React, { useState } from 'react';
import {
  Alert, Image, View, Text, StyleSheet,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { useApp } from '../../context/AppContext';
import { BackendRecordUnavailable } from '../../components/BackendRecordUnavailable';
import { selectImageAttachment } from '../../components/molecules/ImagePickerField';
import { FileAttachment } from '../../types/domain';
import { KeyboardSafeScrollView } from '../../components/molecules/KeyboardSafeScrollView';

type RouteProps = RouteProp<RootStackParamList, 'KycVerificationScreen'>;

interface KycMember {
  id: string;
  name: string;
  company: string;
  phone: string;
  memberSince?: string;
}

// ── Image Upload Box ──────────────────────────────────────────────────────────
function UploadBox({
  label,
  sublabel,
  icon,
  file,
  onPress,
  onRemove,
}: {
  label: string;
  sublabel: string;
  icon: string;
  file: FileAttachment | null;
  onPress: () => void;
  onRemove: () => void;
}) {
  const uploaded = Boolean(file);
  return (
    <TouchableOpacity
      onPress={uploaded ? undefined : onPress}
      activeOpacity={uploaded ? 1 : 0.7}
      style={[styles.uploadBox, uploaded && styles.uploadBoxDone]}
    >
      {uploaded ? (
        <>
          <View style={styles.uploadedContent}>
            {file ? <Image source={{ uri: file.uri }} style={styles.uploadedPreview} resizeMode="cover" /> : null}
            <View style={styles.uploadedText}>
              <Text style={styles.uploadedLabel}>{label}</Text>
              <Text style={styles.uploadedSub} numberOfLines={1}>{file?.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn} activeOpacity={0.7}>
            <Icon name="close-circle-outline" size={20} color={Colors.alert} />
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.uploadEmptyContent}>
          <View style={styles.uploadIconCircle}>
            <Icon name={icon} size={28} color={Colors.textMuted} />
          </View>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadSublabel}>{sublabel}</Text>
          <View style={styles.uploadBtn}>
            <Icon name="camera-plus-outline" size={16} color={Colors.accent300} />
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function KycVerificationScreen() {
  const navigation = useNavigation();
  const route      = useRoute<RouteProps>();
  const insets     = useSafeAreaInsets();
  const memberId   = route.params.memberId;
  const { dayPasses, members, leads, verifyLeadKyc } = useApp();
  const pass = dayPasses.find(item => item.id === memberId);
  const storedMember = members.find(item => item.id === memberId);
  const member: KycMember | null = pass ? { id: pass.id, name: pass.name, company: pass.company || '', phone: pass.phone, memberSince: pass.memberSince }
    : storedMember ? { id: storedMember.id, name: storedMember.name, company: storedMember.company, phone: storedMember.phone, memberSince: storedMember.memberSince }
      : null;
  const normalizedMemberPhone = member?.phone.replace(/\D/g, '').slice(-10);
  const matchingLead = leads.find(lead => lead.phone.replace(/\D/g, '').slice(-10) === normalizedMemberPhone);

  const [aadhaarFront,    setAadhaarFront]    = useState<FileAttachment | null>(null);
  const [aadhaarBack,     setAadhaarBack]     = useState<FileAttachment | null>(null);
  const [aadhaarNumber,   setAadhaarNumber]   = useState('');
  const [nameVerified,    setNameVerified]    = useState(false);
  const [personVerified,  setPersonVerified]  = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [done,            setDone]            = useState(false);

  if (!member) {
    return <BackendRecordUnavailable title="KYC member" onBack={() => navigation.goBack()} />;
  }

  const formattedAadhaar = aadhaarNumber
    .replace(/\D/g, '')
    .slice(0, 12)
    .replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

  const isComplete =
    Boolean(aadhaarFront) &&
    Boolean(aadhaarBack) &&
    aadhaarNumber.replace(/\D/g, '').length === 12 &&
    nameVerified &&
    personVerified;

  const chooseImage = async (onChoose: (file: FileAttachment) => void) => {
    try {
      const file = await selectImageAttachment();
      if (file) onChoose(file);
    } catch (error) {
      Alert.alert('Could not select image', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);
    try {
      if (!matchingLead) throw new Error('No OD lead is linked to this phone number, so KYC cannot be submitted safely.');
      await verifyLeadKyc(matchingLead.id, [aadhaarFront!, aadhaarBack!]);
      setDone(true);
    } catch (error) {
      Alert.alert('KYC verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeTop} />
        <View style={styles.successContainer}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Icon name="shield-check" size={40} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.successTitle}>KYC Verified!</Text>
          <Text style={styles.successSub}>{member.name} has been successfully verified.</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.doneBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>KYC Verification</Text>
          <View style={styles.kycBadge}>
            <Icon name="shield-alert-outline" size={14} color={Colors.accent300} />
            <Text style={styles.kycBadgeText}>Pending</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardSafeScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Member Info */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberCompany}>{member.company}</Text>
            <Text style={styles.memberPhone}>{member.phone}</Text>
          </View>
          {!!member.memberSince && <View style={styles.memberSinceBadge}>
            <Text style={styles.memberSinceText}>Since {member.memberSince}</Text>
          </View>}
        </View>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          {[
            { label: 'Aadhaar Front', done: Boolean(aadhaarFront) },
            { label: 'Aadhaar Back',  done: Boolean(aadhaarBack)  },
            { label: 'Number',        done: aadhaarNumber.replace(/\D/g, '').length === 12 },
            { label: 'Verified',      done: nameVerified && personVerified },
          ].map((step, i) => (
            <View key={i} style={styles.progressStep}>
              <View style={[styles.progressDot, step.done && styles.progressDotDone]}>
                {step.done && <Icon name="check" size={10} color={Colors.white} />}
              </View>
              <Text style={[styles.progressLabel, step.done && { color: Colors.success }]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Aadhaar Upload */}
        <Text style={styles.sectionLabel}>Aadhaar Card</Text>
        <View style={styles.uploadRow}>
          <UploadBox
            label="Front Side"
            sublabel="Photo of front"
            icon="card-account-details-outline"
            file={aadhaarFront}
            onPress={() => chooseImage(setAadhaarFront)}
            onRemove={() => setAadhaarFront(null)}
          />
          <UploadBox
            label="Back Side"
            sublabel="Photo of back"
            icon="card-bulleted-outline"
            file={aadhaarBack}
            onPress={() => chooseImage(setAadhaarBack)}
            onRemove={() => setAadhaarBack(null)}
          />
        </View>

        {/* Aadhaar Number */}
        <Text style={styles.sectionLabel}>Aadhaar Number</Text>
        <View style={styles.card}>
          <View style={[
            styles.inputWrapper,
            aadhaarNumber.replace(/\D/g, '').length === 12 && styles.inputWrapperDone,
          ]}>
            <Icon
              name="card-text-outline"
              size={20}
              color={aadhaarNumber.replace(/\D/g, '').length === 12 ? Colors.success : Colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={formattedAadhaar}
              onChangeText={text => setAadhaarNumber(text.replace(/\D/g, ''))}
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={14}
            />
            {aadhaarNumber.replace(/\D/g, '').length === 12 && (
              <Icon name="check-circle" size={18} color={Colors.success} />
            )}
          </View>
          <Text style={styles.inputHint}>Enter the 12-digit Aadhaar number from the card</Text>
        </View>

        {/* Verification Checkboxes */}
        <Text style={styles.sectionLabel}>Verification Confirmation</Text>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setNameVerified(p => !p)}
            style={styles.checkRow}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, nameVerified && styles.checkboxOn]}>
              {nameVerified && <Icon name="check" size={12} color={Colors.white} />}
            </View>
            <View style={styles.checkTextCol}>
              <Text style={styles.checkLabel}>Name matches Aadhaar</Text>
              <Text style={styles.checkDesc}>
                The name on the Aadhaar card matches the member's registered name.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.checkDivider} />

          <TouchableOpacity
            onPress={() => setPersonVerified(p => !p)}
            style={styles.checkRow}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, personVerified && styles.checkboxOn]}>
              {personVerified && <Icon name="check" size={12} color={Colors.white} />}
            </View>
            <View style={styles.checkTextCol}>
              <Text style={styles.checkLabel}>Person is physically present</Text>
              <Text style={styles.checkDesc}>
                The person standing in front of you matches the photo on the Aadhaar card.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </KeyboardSafeScrollView>

      {/* Fixed bottom */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {/* Completion indicator */}
        <View style={styles.completionRow}>
          {[Boolean(aadhaarFront), Boolean(aadhaarBack), aadhaarNumber.replace(/\D/g, '').length === 12, nameVerified, personVerified].map((done, i) => (
            <View key={i} style={[styles.completionDot, done && styles.completionDotDone]} />
          ))}
          <Text style={styles.completionText}>
            {[Boolean(aadhaarFront), Boolean(aadhaarBack), aadhaarNumber.replace(/\D/g, '').length === 12, nameVerified, personVerified].filter(Boolean).length} / 5 steps complete
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isComplete || submitting}
          style={[styles.submitBtn, (!isComplete || submitting) && { opacity: 0.4 }]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <Text style={styles.submitBtnText}>Verifying...</Text>
          ) : (
            <>
              <Icon name="shield-check-outline" size={20} color={Colors.white} />
              <Text style={styles.submitBtnText}>Complete KYC Verification</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  screenTitle:  { ...Typography.pageTitle, color: Colors.textPrimary, flex: 1 },
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,126,21,0.15)',
    borderWidth: 1, borderColor: Colors.accent300,
  },
  kycBadgeText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.accent300 },

  // Member card
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.xl,
  },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.accent300,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 16, color: Colors.white },
  memberInfo:       { flex: 1 },
  memberName:       { ...Typography.sectionHeader, color: Colors.textPrimary },
  memberCompany:    { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: 2 },
  memberPhone:      { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  memberSinceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.secondarySurface },
  memberSinceText:  { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textSecondary },

  // Progress
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  progressStep:    { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.secondarySurface,
    borderWidth: 2, borderColor: Colors.borderDefault,
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  progressLabel:   { fontFamily: 'SequelSans-BookBody', fontSize: 10, color: Colors.textMuted, textAlign: 'center' },

  // Section label
  sectionLabel: {
    fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11,
    color: Colors.textSecondary, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: Spacing.sm,
  },

  // Upload
  uploadRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  uploadBox: {
    flex: 1, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderStyle: 'dashed', backgroundColor: Colors.cardSurface,
    padding: Spacing.md, minHeight: 140,
    justifyContent: 'center',
  },
  uploadBoxDone:    { borderStyle: 'solid', borderColor: Colors.success, backgroundColor: 'rgba(0,129,54,0.05)' },
  uploadEmptyContent: { alignItems: 'center', gap: Spacing.sm },
  uploadIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center', alignItems: 'center',
  },
  uploadLabel:    { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary, textAlign: 'center' },
  uploadSublabel: { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.accent300,
    marginTop: 4,
  },
  uploadBtnText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11, color: Colors.accent300 },
  uploadedContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  uploadedPreview: { width: 54, height: 72, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface },
  uploadedText:    { flex: 1 },
  uploadedLabel:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.success },
  uploadedSub:     { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  removeBtn:       { padding: 4 },

  // Card
  card: {
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault,
    marginBottom: Spacing.xl,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    height: 52, paddingHorizontal: Spacing.lg,
  },
  inputWrapperDone: { borderColor: Colors.success, backgroundColor: 'rgba(0,129,54,0.05)' },
  input:     { flex: 1, fontFamily: 'SequelSans-BookBody', fontSize: 18, color: Colors.textPrimary, letterSpacing: 2 },
  inputHint: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm },

  // Checkboxes
  checkRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    backgroundColor: Colors.secondarySurface,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2, flexShrink: 0,
  },
  checkboxOn:   { backgroundColor: Colors.accent300, borderColor: Colors.accent300 },
  checkTextCol: { flex: 1 },
  checkLabel:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 14, color: Colors.textPrimary },
  checkDesc:    { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  checkDivider: { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.lg },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderDefault,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  completionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderDefault },
  completionDotDone: { backgroundColor: Colors.success },
  completionText: { ...Typography.caption, color: Colors.textSecondary, marginLeft: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300,
  },
  submitBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  successIconOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0,129,54,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successIconInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.success,
    justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { ...Typography.pageTitle, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  successSub:   { ...Typography.primaryBody, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxxl },
  doneBtn: {
    height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300,
    paddingHorizontal: Spacing.huge,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});
