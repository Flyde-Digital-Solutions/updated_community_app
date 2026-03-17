import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, TouchableOpacity, ScrollView, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { OrangeButton } from '../../components/atoms/OrangeButton';

const BG    = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO  = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };
const ARROW = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square/Icon.png' };

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WORK_AS_OPTIONS = [
  'Freelancer', 'Entrepreneur', 'Remote Employee',
  'Consultant', 'Student', 'Other',
];

const MOVE_IN_OPTIONS = [
  'Immediately (0–15 days)',
  'In 1 month',
  'In 2–3 months',
  'Just exploring',
];

const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

type CalCell = { day: number; type: 'prev' | 'curr' | 'next' };

function getCalendarDays(year: number, month: number): CalCell[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const totalDays   = new Date(year, month + 1, 0).getDate();
  const prevTotal   = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const cells: CalCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: prevTotal - i, type: 'prev' });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, type: 'curr' });
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' });
  return cells;
}

export function SingleDeskScreen() {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();
  const today      = new Date();

  const [workAs,         setWorkAs]         = useState('Freelancer');
  const [showWorkAs,     setShowWorkAs]     = useState(false);
  const [workType,       setWorkType]       = useState('');
  const [moveIn,         setMoveIn]         = useState('Immediately (0–15 days)');
  const [showMoveIn,     setShowMoveIn]     = useState(false);
  const [budget,         setBudget]         = useState('');
  const [bookTour,       setBookTour]       = useState(false);
  const [showCalendar,   setShowCalendar]   = useState(false);
  const [selectedDate,   setSelectedDate]   = useState<Date | null>(null);
  const [calMonth,       setCalMonth]       = useState(today.getMonth());
  const [calYear,        setCalYear]        = useState(today.getFullYear());

  const calDays = getCalendarDays(calYear, calMonth);

  const isSelected = (day: number) =>
    selectedDate?.getDate()     === day      &&
    selectedDate?.getMonth()    === calMonth &&
    selectedDate?.getFullYear() === calYear;

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    calMonth === today.getMonth() &&
    calYear  === today.getFullYear();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const tourDateLabel = () => {
    if (!selectedDate) return `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">

        <LinearGradient
          colors={['rgba(0,0,0,0)', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <LinearGradient
          colors={['rgba(28,28,30,0.80)', 'rgba(21,21,23,0.80)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheet}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 24 }]}
          >
            <Text style={styles.title}>Single Desk</Text>

            {/* Row: Work As + Work Type */}
            <View style={styles.row}>

              {/* Work As dropdown */}
              <View style={styles.halfLeft}>
                <Text style={styles.fieldLabel}>You work as?</Text>
                <View style={styles.dropdownWrapper}>
                  <TouchableOpacity
                    onPress={() => { setShowWorkAs(p => !p); setShowMoveIn(false); }}
                    style={styles.dropdown}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownValue}>{workAs}</Text>
                    <Image
                      source={ARROW}
                      style={[styles.arrowIcon, showWorkAs && styles.arrowUp]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  {showWorkAs && (
                    <View style={styles.dropList}>
                      {WORK_AS_OPTIONS.map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.dropItem, opt === workAs && styles.dropItemActive]}
                          onPress={() => { setWorkAs(opt); setShowWorkAs(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropItemText, opt === workAs && styles.dropItemTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Work Type input */}
              <View style={styles.halfRight}>
                <Text style={styles.fieldLabel}>What kind of work you do?</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Designing"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={workType}
                    onChangeText={setWorkType}
                  />
                </View>
              </View>

            </View>

            {/* Move in */}
            <Text style={styles.fieldLabel}>When are you looking to move in?</Text>
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                onPress={() => { setShowMoveIn(p => !p); setShowWorkAs(false); }}
                style={styles.dropdown}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownValue}>{moveIn}</Text>
                <Image
                  source={ARROW}
                  style={[styles.arrowIcon, showMoveIn && styles.arrowUp]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {showMoveIn && (
                <View style={styles.dropList}>
                  {MOVE_IN_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.dropItem, opt === moveIn && styles.dropItemActive]}
                      onPress={() => { setMoveIn(opt); setShowMoveIn(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropItemText, opt === moveIn && styles.dropItemTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Budget */}
            <Text style={styles.fieldLabel}>Budget Qualification</Text>
            <View style={styles.budgetWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Do you have a monthly budget range in mind?"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={budget}
                onChangeText={setBudget}
              />
            </View>

            {/* Book a Tour */}
            <View style={styles.tourRow}>
              <TouchableOpacity
                onPress={() => { setBookTour(p => !p); setShowCalendar(false); }}
                style={styles.tourLeft}
                activeOpacity={0.7}
              >
                <View style={[styles.checkBox, bookTour && styles.checkBoxOn]}>
                  {bookTour && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.tourLabel}>Book a Tour</Text>
              </TouchableOpacity>

              <View style={styles.tourDateTimeRow}>
                <TouchableOpacity
                  onPress={() => { if (bookTour) setShowCalendar(true); }}
                  style={[styles.datePill, !bookTour && styles.datePillDim]}
                  activeOpacity={bookTour ? 0.7 : 1}
                >
                  <Text style={[styles.datePillText, !bookTour && styles.datePillTextDim]}>
                    {tourDateLabel()}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.timePill, !bookTour && styles.datePillDim]}>
                  <Text style={[styles.datePillText, !bookTour && styles.datePillTextDim]}>
                    9:41 AM
                  </Text>
                </View>
              </View>
            </View>

            <OrangeButton
              label="Sign Up"
              onPress={() => navigation.navigate('SingleDeskAllSetScreen')}
              style={styles.btn}
            />

          </ScrollView>
        </LinearGradient>

      </ImageBackground>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calDowRow}>
              {DAYS_OF_WEEK.map(d => (
                <Text key={d} style={styles.calDow}>{d}</Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {calDays.map((cell, i) => {
                const isCurr   = cell.type === 'curr';
                const past     = isCurr && isPast(cell.day);
                const selected = isCurr && isSelected(cell.day);
                const todayDay = isCurr && isToday(cell.day);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.calCell,
                      selected && styles.calCellSelected,
                      todayDay && !selected && styles.calCellToday,
                    ]}
                    onPress={() => {
                      if (isCurr && !past) {
                        setSelectedDate(new Date(calYear, calMonth, cell.day));
                        setShowCalendar(false);
                      }
                    }}
                    disabled={!isCurr || past}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.calDayText,
                      !isCurr && styles.calDayOtherMonth,
                      isCurr && past && styles.calDayPast,
                      selected && styles.calDaySelected,
                      todayDay && !selected && styles.calDayToday,
                    ]}>
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <OrangeButton
              label="Confirm Date"
              onPress={() => setShowCalendar(false)}
              style={styles.modalBtn}
            />

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  bg:   { flex: 1 },

  logoContainer: {
    position: 'absolute',
    top: 100, left: 0, right: 0,
    alignItems: 'center', zIndex: 1,
  },
  logo: { width: 180, height: 122 },

  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },

  inner: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },

  title: {
    ...Typography.pageTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  fieldLabel: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 12, lineHeight: 14,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },

  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    zIndex: 20,
  },
  halfLeft:  { flex: 1 },
  halfRight: { flex: 1 },

  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.lg,
  },
  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    height: 52, paddingHorizontal: Spacing.md,
  },
  dropdownValue:      { fontFamily: 'SequelSans-BookBody', fontSize: 15, color: 'rgba(255,255,255,0.7)', flex: 1 },
  arrowIcon:          { width: 11, height: 5.5 },
  arrowUp:            { transform: [{ rotate: '180deg' }] },
  dropList: {
    position: 'absolute', top: 54, left: 0, right: 0,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: Colors.borderDefault, overflow: 'hidden',
    zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  dropItem:           { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  dropItemActive:     { backgroundColor: 'rgba(255,126,21,0.1)' },
  dropItemText:       { ...Typography.primaryBody, color: Colors.textPrimary },
  dropItemTextActive: { color: Colors.accent300 },

  inputWrapper: {
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    height: 52, paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  budgetWrapper: {
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    minHeight: 52, paddingHorizontal: Spacing.lg,
    justifyContent: 'center', marginBottom: Spacing.lg,
  },
  input: {
    fontFamily: 'SequelSans-BookBody',
    fontSize: 15, color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },

  tourRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  tourLeft:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tourLabel:       { fontFamily: 'SequelSans-BookBody', fontSize: 13, lineHeight: 18, color: Colors.textPrimary },
  checkBox:        { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.borderDefault, backgroundColor: Colors.secondarySurface, justifyContent: 'center', alignItems: 'center' },
  checkBoxOn:      { backgroundColor: Colors.accent300, borderColor: Colors.accent300 },
  checkMark:       { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  tourDateTimeRow: { flexDirection: 'row', gap: Spacing.sm },
  datePill:        { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  timePill:        { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.sm, backgroundColor: Colors.secondarySurface, borderWidth: 1, borderColor: Colors.borderDefault },
  datePillDim:     { opacity: 0.4 },
  datePillText:    { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textPrimary },
  datePillTextDim: { fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textSecondary },

  btn: { marginTop: Spacing.sm },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%', backgroundColor: '#1A1A1C',
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.borderDefault,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  modalTitle: { ...Typography.sectionHeader, color: Colors.textPrimary },
  modalClose: { color: Colors.textSecondary, fontSize: 18, padding: 4 },
  modalBtn:   { marginTop: Spacing.xl },

  calHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  calNavBtn:       { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  calNavText:      { color: Colors.textPrimary, fontSize: 22, fontWeight: '300' },
  calMonthLabel:   { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  calDowRow:       { flexDirection: 'row', marginBottom: Spacing.sm },
  calDow:          { flex: 1, textAlign: 'center', fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textSecondary },
  calGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:         { width: `${100 / 7}%` as any, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  calCellSelected: { backgroundColor: Colors.accent300, borderRadius: BorderRadius.full },
  calCellToday:    { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.accent300 },
  calDayText:      { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textPrimary },
  calDayOtherMonth:{ color: Colors.textMuted, opacity: 0.4 },
  calDayPast:      { color: Colors.textMuted },
  calDaySelected:  { color: Colors.white, fontFamily: 'SequelSans-SemiBoldBody' },
  calDayToday:     { color: Colors.accent300 },
});