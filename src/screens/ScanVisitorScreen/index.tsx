import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Platform,
  TouchableOpacity, Animated, Easing, TextInput, Linking, Alert, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Camera, CameraType } from 'react-native-camera-kit';
import type { PermissionStatus } from 'react-native-permissions';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/apiClient';
import { formatTimeRange } from '../../utils/timeRange';

type ScanState = 'idle' | 'scanning' | 'success' | 'expired' | 'invalid' | 'already_checked_in';

interface GuestResult {
  id: string;
  guestName: string;
  guestCompany?: string;
  invitedBy: string;
  invitedByCompany: string;
  cabin: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  purpose?: string;
  checkInTime?: string;
}

export function ScanVisitorScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const { scanVisitorToken } = useApp();

  const [scanState,   setScanState]   = useState<ScanState>('idle');
  const [guestResult, setGuestResult] = useState<GuestResult | null>(null);
  const [scanAnim]                    = useState(new Animated.Value(0));
  const [torchOn,     setTorchOn]     = useState(false);
  const [scanToken,   setScanToken]   = useState('');
  const [badgeId,     setBadgeId]     = useState('');
  const [notes,       setNotes]       = useState('');
  const [scanError,   setScanError]   = useState('');
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus | null>(null);

  const startScanAnimation = () => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const requestCameraAccess = async () => {
    try {
      const { PERMISSIONS, RESULTS, request } = require('react-native-permissions') as typeof import('react-native-permissions');
      const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
      const result = await request(permission);
      setCameraPermission(result);
      return result === RESULTS.GRANTED;
    } catch {
      // Allow Camera Kit to request access itself when running an older binary.
      setCameraPermission('granted');
      return true;
    }
  };

  const handleStartScan = async () => {
    const granted = await requestCameraAccess();
    if (!granted) return;
    setScanState('scanning');
    startScanAnimation();
  };

  const cameraUnavailable = Boolean(cameraPermission && cameraPermission !== 'granted');
  const showManualEntry = scanState === 'scanning' || (scanState === 'idle' && cameraUnavailable);
  const openCameraSettings = async () => {
    try {
      const { openSettings } = require('react-native-permissions') as typeof import('react-native-permissions');
      await openSettings('application');
    } catch {
      try { await Linking.openSettings(); }
      catch { Alert.alert('Settings unavailable', 'Open iOS Settings and allow Camera access for OSPLCommunity.'); }
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setGuestResult(null);
    setScanToken('');
    setBadgeId('');
    setNotes('');
    setScanError('');
    scanAnim.stopAnimation();
    scanAnim.setValue(0);
  };

  const processToken = async (token = scanToken) => {
    try {
      const visitor = await scanVisitorToken(token, { badgeId, notes });
      setGuestResult({
        id: visitor.id, guestName: visitor.name || 'Visitor', guestCompany: visitor.company, invitedBy: visitor.host || 'Reception',
        invitedByCompany: '', cabin: visitor.purpose || 'Reception', date: visitor.visitDate,
        slotStart: visitor.arrivalTime, slotEnd: visitor.departureTime || '', purpose: visitor.purpose,
        checkInTime: visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      });
      setScanError('');
      setScanState('success');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'The visitor could not be checked in.';
      const message = rawMessage.toLowerCase();
      const status = error instanceof ApiError ? error.status : undefined;
      setScanError(status === 400 ? 'The QR token is blank or invalid.'
        : status === 404 ? 'This QR code is unknown, deleted, or belongs to another building.'
        : status === 409 ? rawMessage
        : status === 410 ? 'This QR code has expired.'
        : status === 401 || status === 403 ? 'Your account is not authorized to scan visitors for this building.'
        : rawMessage);
      setScanState(status === 410 || message.includes('expired') ? 'expired'
        : status === 409 && message.includes('already checked') ? 'already_checked_in'
        : 'invalid');
      setGuestResult(null);
    } finally {
      scanAnim.stopAnimation();
    }
  };

  const handleReadCode = (event: { nativeEvent?: { codeStringValue?: string } }) => {
    const token = event.nativeEvent?.codeStringValue?.trim();
    if (scanState !== 'scanning' || !token) return;
    setScanToken(token);
    processToken(token);
  };

  const scanLineY = scanAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 220],
  });

  const VIEWFINDER_SIZE = 260;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Dark camera bg */}
      <View style={styles.cameraBg} />

      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Scan Visitor</Text>
          <TouchableOpacity
            onPress={() => setTorchOn(p => !p)}
            style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
            activeOpacity={0.7}
          >
            <Icon name={torchOn ? 'flashlight' : 'flashlight-off'} size={20} color={torchOn ? Colors.accent300 : Colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Viewfinder area */}
      <View style={styles.viewfinderContainer}>
        {scanState === 'scanning' && cameraPermission === 'granted' && (
          <Camera
            style={styles.cameraPreview}
            cameraType={CameraType.Back}
            scanBarcode
            onReadCode={handleReadCode}
            torchMode={torchOn ? 'on' : 'off'}
          />
        )}
        {/* Corner overlays */}
        {/* Scan frame */}
        <View style={styles.frameRow}>
          <View style={styles.overlayPanel} />
          <View style={[styles.frame, { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE }]}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan line */}
            {scanState === 'scanning' && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
              />
            )}

            {/* Idle state */}
            {scanState === 'idle' && (
              <View style={styles.idleContent}>
                <Icon name="qrcode-scan" size={48} color="rgba(255,255,255,0.3)" />
              </View>
            )}
          </View>
          <View style={styles.overlayPanel} />
        </View>
      </View>

      {/* Instructions */}
      {(scanState === 'idle' || scanState === 'scanning') && (
        <View style={styles.instructionRow}>
          <Text style={styles.instructionText}>
            {scanState === 'idle'
                ? cameraUnavailable
                ? 'Camera access is unavailable — enter the invitation code below'
                : 'Tap Scan to start'
              : 'Align QR code within the frame'}
          </Text>
        </View>
      )}

      {scanState === 'idle' && cameraUnavailable && (
        <View style={styles.permissionActions}>
          <Text style={styles.permissionHint}>You can continue manually or enable camera access in Settings.</Text>
          <TouchableOpacity onPress={openCameraSettings} style={styles.settingsButton} activeOpacity={0.8}>
            <Icon name="cog-outline" size={16} color={Colors.white} />
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual token entry also makes the flow testable on simulators without a camera. */}
      {showManualEntry && (
        <View style={styles.simulateContainer}>
          <Text style={styles.simulateLabel}>Invitation code</Text>
          <View style={styles.tokenRow}>
            <TextInput value={scanToken} onChangeText={setScanToken} placeholder="e.g. V001" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" style={styles.tokenInput} />
            <TouchableOpacity onPress={() => processToken()} disabled={!scanToken.trim()} style={[styles.processButton, !scanToken.trim() && { opacity: 0.4 }]} activeOpacity={0.8}><Text style={styles.processButtonText}>Process</Text></TouchableOpacity>
          </View>
          <TextInput value={badgeId} onChangeText={setBadgeId} placeholder="Badge number (optional)" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" style={[styles.tokenInput, styles.optionalInput]} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Reception notes (optional)" placeholderTextColor={Colors.textMuted} style={[styles.tokenInput, styles.optionalInput]} />
        </View>
      )}

      {/* Scan button */}
      {scanState === 'idle' && (
        <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={handleStartScan} style={styles.scanBtn} activeOpacity={0.85}>
            <Icon name="qrcode-scan" size={22} color={Colors.white} />
            <Text style={styles.scanBtnText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Result Bottom Sheet ── */}
      {(scanState === 'success' || scanState === 'expired' || scanState === 'invalid' || scanState === 'already_checked_in') && (
        <View style={[styles.resultSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.sheetHandle} />

          {/* Success */}
          {scanState === 'success' && guestResult && (
            <>
              <View style={styles.resultHeaderRow}>
                <View style={styles.successIconWrap}>
                  <Icon name="check-circle" size={32} color={Colors.success} />
                </View>
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Checked In!</Text>
                  <Text style={styles.resultSub}>
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={styles.guestCard}>
                <View style={styles.guestRow}>
                  <View style={[styles.guestAvatar, { backgroundColor: '#A78BFA' }]}>
                    <Text style={styles.guestAvatarText}>
                      {guestResult.guestName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{guestResult.guestName}</Text>
                    {guestResult.guestCompany && (
                      <Text style={styles.guestCompany}>{guestResult.guestCompany}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.guestDivider} />

                <View style={styles.guestDetailRow}>
                  <Icon name="account-arrow-left-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.guestDetailLabel}>Visiting</Text>
                  <Text style={styles.guestDetailValue}>{guestResult.invitedBy}</Text>
                </View>
                <View style={styles.guestDetailRow}>
                  <Icon name="office-building" size={14} color={Colors.textMuted} />
                  <Text style={styles.guestDetailLabel}>Cabin</Text>
                  <Text style={[styles.guestDetailValue, { color: '#30BCED' }]}>{guestResult.cabin}</Text>
                </View>
                <View style={styles.guestDetailRow}>
                  <Icon name="clock-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.guestDetailLabel}>Slot</Text>
                  <Text style={styles.guestDetailValue}>{formatTimeRange(guestResult.slotStart, guestResult.slotEnd)}</Text>
                </View>
                {guestResult.purpose && (
                  <View style={styles.guestDetailRow}>
                    <Icon name="text-box-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.guestDetailLabel}>Purpose</Text>
                    <Text style={styles.guestDetailValue}>{guestResult.purpose}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={handleReset} style={styles.scanAgainBtn} activeOpacity={0.8}>
                <Icon name="qrcode-scan" size={18} color={Colors.white} />
                <Text style={styles.scanAgainBtnText}>Scan Next Visitor</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Expired */}
          {scanState === 'expired' && (
            <>
              <View style={styles.resultHeaderRow}>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(255,126,21,0.15)' }]}>
                  <Icon name="clock-alert-outline" size={32} color={Colors.accent300} />
                </View>
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Invite Expired</Text>
                  <Text style={styles.resultSub}>This QR code is no longer valid</Text>
                </View>
              </View>
              <View style={styles.errorCard}>
                <Icon name="information-outline" size={16} color={Colors.accent300} />
                <Text style={styles.errorCardText}>
                  The visit slot for this invite has passed. The guest will need a new invitation from the member.
                </Text>
              </View>
              <TouchableOpacity onPress={handleReset} style={[styles.scanAgainBtn, { backgroundColor: Colors.secondarySurface }]} activeOpacity={0.8}>
                <Icon name="qrcode-scan" size={18} color={Colors.textPrimary} />
                <Text style={[styles.scanAgainBtnText, { color: Colors.textPrimary }]}>Scan Again</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Invalid */}
          {scanState === 'invalid' && (
            <>
              <View style={styles.resultHeaderRow}>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(229,67,57,0.15)' }]}>
                  <Icon name="qrcode-remove" size={32} color={Colors.alert} />
                </View>
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Invalid QR Code</Text>
                  <Text style={styles.resultSub}>This code was not recognised</Text>
                </View>
              </View>
              <View style={[styles.errorCard, { borderColor: 'rgba(229,67,57,0.30)', backgroundColor: 'rgba(229,67,57,0.08)' }]}>
                <Icon name="alert-circle-outline" size={16} color={Colors.alert} />
                <Text style={[styles.errorCardText, { color: Colors.alert }]}>
                  {scanError || 'This QR code does not match any guest invite in the system. Please ask the guest to show their original invitation email.'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleReset} style={[styles.scanAgainBtn, { backgroundColor: Colors.secondarySurface }]} activeOpacity={0.8}>
                <Icon name="qrcode-scan" size={18} color={Colors.textPrimary} />
                <Text style={[styles.scanAgainBtnText, { color: Colors.textPrimary }]}>Scan Again</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Already Checked In */}
          {scanState === 'already_checked_in' && (
            <>
              <View style={styles.resultHeaderRow}>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(48,188,237,0.15)' }]}>
                  <Icon name="account-check" size={32} color="#30BCED" />
                </View>
                <View style={styles.resultHeaderText}>
                  <Text style={styles.resultTitle}>Already Checked In</Text>
                  <Text style={styles.resultSub}>{scanError || 'This visitor has already been checked in.'}</Text>
                </View>
              </View>

              {guestResult ? <View style={styles.guestCard}>
                <View style={styles.guestRow}>
                  <View style={[styles.guestAvatar, { backgroundColor: '#30BCED' }]}>
                    <Text style={styles.guestAvatarText}>
                      {guestResult.guestName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{guestResult.guestName}</Text>
                    {guestResult.guestCompany && (
                      <Text style={styles.guestCompany}>{guestResult.guestCompany}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.guestDivider} />
                <View style={styles.guestDetailRow}>
                  <Icon name="office-building" size={14} color={Colors.textMuted} />
                  <Text style={styles.guestDetailLabel}>Cabin</Text>
                  <Text style={[styles.guestDetailValue, { color: '#30BCED' }]}>{guestResult.cabin}</Text>
                </View>
                <View style={styles.guestDetailRow}>
                  <Icon name="clock-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.guestDetailLabel}>Checked in at</Text>
                  <Text style={[styles.guestDetailValue, { color: Colors.success }]}>{guestResult.checkInTime}</Text>
                </View>
              </View> : null}

              <TouchableOpacity onPress={handleReset} style={[styles.scanAgainBtn, { backgroundColor: Colors.secondarySurface }]} activeOpacity={0.8}>
                <Icon name="qrcode-scan" size={18} color={Colors.textPrimary} />
                <Text style={[styles.scanAgainBtnText, { color: Colors.textPrimary }]}>Scan Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#0A0A0A' },
  cameraBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0A0A0A' },
  safeTop:  { backgroundColor: 'transparent' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { ...Typography.pageTitle, color: Colors.white, flex: 1 },
  torchBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  torchBtnOn:  { backgroundColor: 'rgba(255,126,21,0.2)' },
  tokenRow: { flexDirection: 'row', gap: Spacing.sm },
  tokenInput: { flex: 1, height: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: Colors.cardSurface, color: Colors.textPrimary, paddingHorizontal: Spacing.md },
  optionalInput: { flex: 0, marginTop: Spacing.sm },
  processButton: { height: 44, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300, justifyContent: 'center' },
  processButtonText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.white },

  // Viewfinder
  viewfinderContainer: { flex: 1, justifyContent: 'center' },
  cameraPreview: { ...StyleSheet.absoluteFillObject },
  overlayRow:  { flexDirection: 'row', height: 60 },
  overlayPanel:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  frameRow:    { flexDirection: 'row', alignItems: 'center' },
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: Colors.accent300, borderWidth: 3,
  },
  cornerTL: { top: 0,   left: 0,   borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4     },
  cornerTR: { top: 0,   right: 0,  borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 4    },
  cornerBL: { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 4  },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: Colors.accent300,
    shadowColor: Colors.accent300, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 4,
  },
  idleContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Instruction
  instructionRow: { alignItems: 'center', paddingVertical: Spacing.lg },
  instructionText: { fontFamily: 'SequelSans-BookBody', fontSize: 14, color: 'rgba(255,255,255,0.60)', textAlign: 'center' },
  permissionActions: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.sm },
  permissionHint: { fontFamily: 'SequelSans-BookBody', fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  settingsButtonText: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 12, color: Colors.white },

  // Simulate buttons
  simulateContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  simulateLabel:     { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: 'rgba(255,255,255,0.40)', textAlign: 'center', marginBottom: Spacing.sm },
  simulateBtns:      { flexDirection: 'row', gap: Spacing.sm },
  simBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  simBtnSuccess:     { borderColor: 'rgba(0,129,54,0.4)',   backgroundColor: 'rgba(0,129,54,0.12)'    },
  simBtnExpired:     { borderColor: 'rgba(255,126,21,0.4)', backgroundColor: 'rgba(255,126,21,0.12)'  },
  simBtnInvalid:     { borderColor: 'rgba(229,67,57,0.4)',  backgroundColor: 'rgba(229,67,57,0.12)'   },
  simBtnCheckedIn:   { borderColor: 'rgba(48,188,237,0.4)', backgroundColor: 'rgba(48,188,237,0.12)'  },
  simBtnText:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 11 },

  // Scan button
  bottomArea: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent300,
  },
  scanBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },

  // Result sheet
  resultSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: 'center', marginBottom: Spacing.lg },

  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  successIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,129,54,0.15)', justifyContent: 'center', alignItems: 'center' },
  resultIconWrap:  { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  resultHeaderText:{ flex: 1 },
  resultTitle:     { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 20, color: Colors.textPrimary },
  resultSub:       { ...Typography.secondaryBody, color: Colors.textSecondary, marginTop: 2 },

  guestCard: { backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderDefault },
  guestRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  guestAvatar:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  guestAvatarText:  { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.white },
  guestInfo:        { flex: 1 },
  guestName:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 16, color: Colors.textPrimary },
  guestCompany:     { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  guestDivider:     { height: 1, backgroundColor: Colors.borderDefault, marginBottom: Spacing.md },
  guestDetailRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  guestDetailLabel: { ...Typography.caption, color: Colors.textMuted, width: 72 },
  guestDetailValue: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, color: Colors.textPrimary, flex: 1 },

  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: 'rgba(255,126,21,0.08)', borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,126,21,0.25)' },
  errorCardText: { ...Typography.secondaryBody, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

  scanAgainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: BorderRadius.md, backgroundColor: Colors.accent300 },
  scanAgainBtnText: { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.white },
});
