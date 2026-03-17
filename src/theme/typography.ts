import { TextStyle } from 'react-native';

export const FontFamily = {
  semiBoldHead: 'SequelSans-SemiBoldHead',
  semiBoldBody: 'SequelSans-SemiBoldBody',
  mediumBody:   'SequelSans-MediumBody',
  bookBody:     'SequelSans-BookBody',
  lightBody:    'SequelSans-LightBody',
};

export const Typography: Record<string, TextStyle> = {
  // 28px * -0.7% = -0.196
  navigationTitle: { fontFamily: FontFamily.semiBoldHead, fontSize: 28, lineHeight: 32, letterSpacing: -0.196, color: '#FFFFFF' },
  // 22px * -0.5% = -0.11
  pageTitle:       { fontFamily: FontFamily.mediumBody,   fontSize: 22, lineHeight: 30, letterSpacing: -0.11,  color: '#FFFFFF' },
  // 17px * 1% = 0.17
  sectionHeader:   { fontFamily: FontFamily.mediumBody,   fontSize: 17, lineHeight: 21, letterSpacing: 0.17,   color: '#FFFFFF' },
  // 15px * 0% = 0
  primaryBody:     { fontFamily: FontFamily.bookBody,     fontSize: 15, lineHeight: 20, letterSpacing: 0,      color: '#FFFFFF' },
  // 13px * 0% = 0
  secondaryBody:   { fontFamily: FontFamily.lightBody,    fontSize: 13, lineHeight: 18, letterSpacing: 0,      color: '#888888' },
  // 12px * 0% = 0
  caption:         { fontFamily: FontFamily.bookBody,     fontSize: 12, lineHeight: 14, letterSpacing: 0,      color: '#888888' },
  // 13px * -0.2% = -0.026
  sectionLabel:    { fontFamily: FontFamily.semiBoldBody, fontSize: 13, lineHeight: 18, letterSpacing: -0.026, color: '#FFFFFF' },
  // 11px * 0% = 0
  smallLabel:      { fontFamily: FontFamily.bookBody,     fontSize: 11, lineHeight: 14, letterSpacing: 0,      color: '#888888' },
  // 15px * 0% = 0
  buttonText:      { fontFamily: FontFamily.mediumBody,   fontSize: 15, lineHeight: 20, letterSpacing: 0,      color: '#FFFFFF' },
};