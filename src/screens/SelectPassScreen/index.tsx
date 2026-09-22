import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground,
  Image, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStackNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { OrangeButton } from '../../components/atoms/OrangeButton';
import { useApp } from '../../context/AppContext';
import { useDayPassCatalog } from '../../hooks/useDayPassCatalog';

const BG    = { uri: 'https://ik.imagekit.io/p1zreiw3z/preview.jpg' };
const LOGO  = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png' };
const ARROW = { uri: 'https://ik.imagekit.io/p1zreiw3z/Ofis%20Square/Icon.png' };

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

type CalCell = { day: number; type: 'prev' | 'curr' | 'next' };

function getCalendarDays(year: number, month: number): CalCell[] {
  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotal = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const cells: CalCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevTotal - i, type: 'prev' });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, type: 'curr' });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next' });
    }
  }
  return cells;
}

export function SelectPassScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useApp();
  const { buildings, bundles, loading, error } = useDayPassCatalog();
  const today      = new Date();

  const [quantity,      setQuantity]      = useState(1);
  const [selectedPass,  setSelectedPass]  = useState('single');
  const [buildingId,    setBuildingId]    = useState('');
  const [showLocations, setShowLocations] = useState(false);
  const [showCalendar,  setShowCalendar]  = useState(false);
  const [selectedDate,  setSelectedDate]  = useState<Date | null>(null);
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());

  const calDays = getCalendarDays(calYear, calMonth);
  const selectedBuilding = buildings.find(building => building.id === buildingId);
  const availableBundles = bundles.filter(bundle => !bundle.buildingId || bundle.buildingId === buildingId);
  const background = selectedBuilding?.coverImage ? { uri: selectedBuilding.coverImage } : BG;

  useEffect(() => {
    if (buildingId || !buildings.length) return;
    setBuildingId(buildings.find(building => building.id === user?.buildingId)?.id || buildings[0].id);
  }, [buildingId, buildings, user?.buildingId]);

  useEffect(() => {
    if (selectedPass !== 'single' && !availableBundles.some(bundle => bundle.id === selectedPass)) setSelectedPass('single');
  }, [availableBundles, selectedPass]);

  const currency = (amount: number) => amount > 0
    ? `₹${Math.round(amount).toLocaleString('en-IN')}`
    : 'Price unavailable';

  const dateLabel = () => {
    if (!selectedDate) return 'Today';
    const d = selectedDate;
    if (
      d.getDate()     === today.getDate()  &&
      d.getMonth()    === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) return 'Today';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    calMonth === today.getMonth() &&
    calYear  === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate?.getDate()     === day      &&
    selectedDate?.getMonth()    === calMonth &&
    selectedDate?.getFullYear() === calYear;

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ImageBackground source={background} style={styles.bg} resizeMode="cover">

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
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <Text style={styles.title}>Select your Pass</Text>

            {/* Location */}
            <View style={styles.locationWrapper}>
              <TouchableOpacity
                onPress={() => setShowLocations(p => !p)}
                style={styles.locationRow}
                activeOpacity={0.7}
              >
                <View style={styles.locationDot} />
                <Text style={styles.locationText}>{selectedBuilding?.name || (loading ? 'Loading locations…' : 'Select a location')}</Text>
                <Image
                  source={ARROW}
                  style={[styles.arrowIcon, showLocations && styles.arrowUp]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {showLocations && (
                <View style={styles.locationList}>
                  {buildings.map(building => (
                    <TouchableOpacity
                      key={building.id}
                      style={[styles.locationItem, building.id === buildingId && styles.locationItemActive]}
                      onPress={() => { setBuildingId(building.id); setShowLocations(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.locationItemText, building.id === buildingId && styles.locationItemTextActive]}>
                        {building.name}{building.city ? ` · ${building.city}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {!loading && buildings.length === 0 ? <Text style={styles.catalogMessage}>{error || 'No active locations are available.'}</Text> : null}
                </View>
              )}
            </View>

            {/* Pass header + counter */}
            <View style={styles.passHeaderRow}>
              <Text style={styles.passHeaderLabel}>Choose your Pass</Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => setQuantity(q => Math.max(1, q - 1))}
                  style={[styles.counterBtn, quantity <= 1 && styles.counterBtnOff]}
                  activeOpacity={0.7}
                  disabled={quantity <= 1}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterVal}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(q => q + 1)}
                  style={styles.counterBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1 Day Pass */}
            <TouchableOpacity
              onPress={() => setSelectedPass('single')}
              activeOpacity={0.7}
              style={[styles.passCard, selectedPass === 'single' && styles.passCardSelected]}
            >
              <View style={styles.passCardLeft}>
                <Text style={styles.passTitle}>1 Day Pass</Text>
                <Text style={styles.passSub}>Valid for one visit</Text>
              </View>
              <Text style={styles.passPrice}>{currency((selectedBuilding?.price || 0) * quantity)}</Text>
            </TouchableOpacity>

            {/* Date picker — only when 1day selected */}
            {selectedPass === 'single' && (
              <View style={styles.datePicker}>
                <TouchableOpacity
                  onPress={() => setShowCalendar(p => !p)}
                  style={styles.dateRow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calIcon}>📅</Text>
                  <Text style={styles.dateLabel}>{dateLabel()}</Text>
                  <Image
                    source={ARROW}
                    style={[styles.arrowIcon, showCalendar && styles.arrowUp]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {showCalendar && (
                  <View style={styles.calendar}>
                    {/* Month nav */}
                    <View style={styles.calHeader}>
                      <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                        <Text style={styles.calNavText}>‹</Text>
                      </TouchableOpacity>
                      <Text style={styles.calMonthLabel}>
                        {MONTHS[calMonth]} {calYear}
                      </Text>
                      <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                        <Text style={styles.calNavText}>›</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Day headers */}
                    <View style={styles.calDowRow}>
                      {DAYS_OF_WEEK.map(d => (
                        <Text key={d} style={styles.calDow}>{d}</Text>
                      ))}
                    </View>

                    {/* Day grid */}
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
                              !isCurr          && styles.calDayOtherMonth,
                              isCurr && past   && styles.calDayPast,
                              selected         && styles.calDaySelected,
                              todayDay && !selected && styles.calDayToday,
                            ]}>
                              {cell.day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Bundles header */}
            <Text style={styles.bundleHeader}>Save more with bundles</Text>

            {availableBundles.map(bundle => {
              const total = (selectedBuilding?.price || 0) * bundle.passCount * (1 - bundle.discountPercent / 100);
              return (
                <TouchableOpacity
                  key={bundle.id}
                  onPress={() => setSelectedPass(bundle.id)}
                  activeOpacity={0.7}
                  style={[styles.bundleCard, selectedPass === bundle.id && styles.bundleCardSelected]}
                >
                  <View style={styles.bundleLeft}>
                    <Text style={styles.bundleTitle}>{bundle.name}</Text>
                    <Text style={styles.bundleSub}>{bundle.description || 'Use anytime. Select dates later.'}</Text>
                  </View>
                  <View style={styles.bundleRight}>
                    <Text style={styles.bundlePrice}>{currency(total)}</Text>
                    <Text style={styles.bundleSave}>Save {bundle.discountPercent}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {!loading && availableBundles.length === 0 ? <Text style={styles.catalogMessage}>No bundles are currently available for this location.</Text> : null}

          </ScrollView>

          {/* Fixed bottom */}
          <View style={styles.fixedBottom}>
            <OrangeButton
              label={selectedPass === 'single' ? 'Proceed to Pay' : 'Buy Bundle'}
              loading={loading}
              disabled={!selectedBuilding || selectedBuilding.price <= 0}
              onPress={() => navigation.navigate('AllSetOnDemandScreen')}
            />
          </View>

        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  bg:   { flex: 1 },

  logoContainer: { alignItems: 'center', paddingTop: 94, zIndex: 1 },
  logo:          { width: 124, height: 84 },

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    marginTop: Spacing.xl,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },

  title: {
    ...Typography.pageTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Location
  locationWrapper: { position: 'relative', zIndex: 10, marginBottom: Spacing.xl },
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.borderDefault,
    height: 48, paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  locationDot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent300 },
  locationText:           { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },
  arrowIcon:              { width: 11, height: 5.5 },
  arrowUp:                { transform: [{ rotate: '180deg' }] },
  locationList: {
    position: 'absolute', top: 52, left: 0, right: 0,
    backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault, overflow: 'hidden',
    zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  locationItem:           { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  locationItemActive:     { backgroundColor: 'rgba(255,126,21,0.1)' },
  locationItemText:       { ...Typography.primaryBody, color: Colors.textPrimary },
  locationItemTextActive: { color: Colors.accent300 },
  catalogMessage: { ...Typography.caption, color: Colors.textSecondary, padding: Spacing.md, textAlign: 'center' },

  // Pass header
  passHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  passHeaderLabel: {
    fontFamily: 'SequelSans-SemiBoldBody',
    fontSize: 13, lineHeight: 18, color: Colors.textPrimary,
  },

  // Counter
  counter:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  counterBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent300, justifyContent: 'center', alignItems: 'center' },
  counterBtnOff:  { opacity: 0.4 },
  counterBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold', lineHeight: 20 },
  counterVal:     { fontFamily: 'SequelSans-MediumBody', fontSize: 15, color: Colors.textPrimary, minWidth: 20, textAlign: 'center' },

  // 1 Day pass
  passCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.borderDefault,
    marginBottom: Spacing.md,
  },
  passCardSelected: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  passCardLeft:     { flex: 1 },
  passTitle:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 17, lineHeight: 21, color: Colors.textPrimary },
  passSub:          { fontFamily: 'SequelSans-LightBody', fontSize: 13, lineHeight: 18, color: Colors.textSecondary, marginTop: 2 },
  passPrice:        { fontFamily: 'SequelSans-MediumBody', fontSize: 17, lineHeight: 21, color: Colors.textPrimary },

  // Date picker
  datePicker:    { marginBottom: Spacing.xl },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondarySurface,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.borderDefault,
    height: 48, paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  calIcon:   { fontSize: 16 },
  dateLabel: { ...Typography.primaryBody, color: Colors.textPrimary, flex: 1 },

  // Calendar
  calendar: {
    backgroundColor: '#1A1A1C',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.borderDefault,
    padding: Spacing.lg, marginTop: Spacing.sm,
  },
  calHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  calNavBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  calNavText:    { color: Colors.textPrimary, fontSize: 22, fontWeight: '300' },
  calMonthLabel: { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 15, color: Colors.textPrimary },
  calDowRow:     { flexDirection: 'row', marginBottom: Spacing.sm },
  calDow:        { flex: 1, textAlign: 'center', fontFamily: 'SequelSans-BookBody', fontSize: 11, color: Colors.textSecondary },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:       { width: `${100 / 7}%` as any, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  calCellSelected: { backgroundColor: Colors.accent300, borderRadius: BorderRadius.full },
  calCellToday:    { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.accent300 },
  calDayText:      { fontFamily: 'SequelSans-BookBody', fontSize: 13, color: Colors.textPrimary },
  calDayOtherMonth:{ color: Colors.textMuted, opacity: 0.4 },
  calDayPast:      { color: Colors.textMuted },
  calDaySelected:  { color: Colors.white, fontFamily: 'SequelSans-SemiBoldBody' },
  calDayToday:     { color: Colors.accent300 },

  // Bundles
  bundleHeader:       { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 13, lineHeight: 18, color: Colors.textPrimary, marginBottom: Spacing.md },
  bundleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.secondarySurface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.borderDefault, marginBottom: Spacing.md,
  },
  bundleCardSelected: { borderColor: Colors.accent300, backgroundColor: 'rgba(255,126,21,0.08)' },
  bundleLeft:         { flex: 1 },
  bundleRight:        { alignItems: 'flex-end' },
  bundleTitle:        { fontFamily: 'SequelSans-SemiBoldBody', fontSize: 17, lineHeight: 21, color: Colors.textPrimary },
  bundleSub:          { fontFamily: 'SequelSans-LightBody', fontSize: 13, lineHeight: 18, color: Colors.textSecondary, marginTop: 2 },
  bundlePrice:        { fontFamily: 'SequelSans-MediumBody', fontSize: 17, lineHeight: 21, color: Colors.textPrimary },
  bundleSave:         { fontFamily: 'SequelSans-BookBody', fontSize: 13, lineHeight: 18, color: Colors.accent300, marginTop: 2 },

  // Fixed bottom
  fixedBottom: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
  },
});
