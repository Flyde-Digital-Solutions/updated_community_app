# Ofis Square — Signup & Booking Flow

React Native app (bare workflow) implementing the signup and booking screens for the Ofis Square coworking platform.

---

## Tech Stack

- **React Native** 0.82.0 (bare workflow)
- **TypeScript**

---

## Navigation

- `@react-navigation/native` ^7
- `@react-navigation/native-stack` ^7
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`

---

## UI & Styling

- `react-native-linear-gradient` — gradients on cards, overlays, sheets
- `react-native-svg` — SVG icons, card glow effects
- `react-native-vector-icons` — icon support

---

## Fonts — Sequel Sans

Custom font family loaded via `react-native-asset`. Files live in `src/assets/fonts/`.

| Font File | Usage |
|---|---|
| `SequelSans-SemiBoldHead.ttf` | Navigation titles |
| `SequelSans-MediumBody.ttf` | Page titles, section headers, button text |
| `SequelSans-BookBody.ttf` | Primary body, captions, labels |
| `SequelSans-LightBody.ttf` | Secondary body |
| `SequelSans-SemiBoldBody.ttf` | Section labels |

---

## State & Storage

- `@reduxjs/toolkit` — Redux store setup
- `react-redux` — React bindings
- `@react-native-async-storage/async-storage` — local persistence

---

## Networking

- `axios` — HTTP client

---

## Project Structure
```
src/
├── assets/
│   └── fonts/          # Sequel Sans font files
├── components/
│   ├── atoms/
│   │   ├── OrangeButton.tsx       # Primary CTA button
│   │   ├── Buttons.tsx            # OutlineButton, AppTextButton
│   │   ├── InputField.tsx         # Text input with label/error states
│   │   ├── OtpInput.tsx           # 4/6 box OTP input
│   │   ├── Controls.tsx           # Badge, Checkbox, CounterInput, Dropdown
│   │   └── index.ts
│   ├── molecules/
│   │   ├── ScreenBackground.tsx   # Full screen BG image + overlay + logo
│   │   ├── BottomSheet.tsx        # Bottom sheet container
│   │   ├── Navigation.tsx         # TopBar, BackHeader, SectionHeader, NavBar
│   │   ├── Cards.tsx              # PassCard, ActionTile, BookingCard, EventCard
│   │   ├── PlanSelectorCard.tsx   # Carousel card for booking type selector
│   │   └── index.ts
│   └── index.ts
├── navigation/
│   └── MainStackNavigator.tsx
├── screens/
│   ├── ScreenList/                # Dev launcher — screen directory
│   ├── OtpScreen/                 # Screen 6 — Verify OTP
│   ├── EnterDetailsScreen/        # Screen 7/8 — Enter Details + error state
│   ├── WhatToBookScreen/          # Screen 9 — Booking type selector
│   ├── SelectPassScreen/          # Screen 12/13/14 — Pass selector + calendar
│   ├── AllSetOnDemandScreen/      # Screen 16 — All Set (On Demand)
│   ├── PrivateCabinDetailsScreen/ # Screen 10 — Private Cabin form
│   ├── PrivateCabinAllSetScreen/  # Screen 11 — Private Cabin All Set
│   ├── SingleDeskScreen/          # Screen 17 — Single Desk form
│   └── SingleDeskAllSetScreen/    # Screen 18 — Single Desk All Set
├── theme/
│   ├── colors.ts       # Full color palette + gradients
│   ├── typography.ts   # All text styles mapped to Sequel Sans
│   ├── spacing.ts      # Spacing scale + border radius + shadows
│   └── index.ts
└── redux/              # Store setup (TBD)
```

---

## Screens

| ID | Screen | Status |
|---|---|---|
| 6  | Verify OTP | ✅ Ready |
| 7  | Enter Details | ✅ Ready |
| 8  | Enter Details — Wrong State | ⚠️ Partial |
| 9  | What Do You Want to Book | ✅ Ready |
| 10 | Private Cabin Details | ✅ Ready |
| 11 | Private Cabin All Set | ✅ Ready |
| 12 | Select Pass | ✅ Ready |
| 13 | 1 Day Pass (date selector state) | ✅ Ready |
| 14 | Select Date (calendar modal) | ✅ Ready |
| 16 | All Set — On Demand | ✅ Ready |
| 17 | Single Desk | ✅ Ready |
| 18 | Single Desk All Set | ✅ Ready |

---

## Design Tokens

### Colors
| Token | Hex |
|---|---|
| Background | `#0F0F10` |
| Card Surface | `#1C1C1E` |
| Secondary Surface | `#2C2C2E` |
| Accent 300 (Primary Orange) | `#FF7E15` |
| Accent 400 | `#BF5600` |
| Accent 500 | `#803900` |
| Accent 200 | `#FF9640` |
| Accent 100 | `#FFB980` |
| Alert | `#E54339` |
| Success | `#008136` |

### Gradients
| Name | Value |
|---|---|
| Card | `180deg, #1C1C1E → #151517` |
| Orange | `180deg, #FF7300 → #B25203` |
| Blue | `90deg, rgba(34,92,154,0.85) → rgba(48,188,237,0.85)` |
| Screen overlay | `180deg, rgba(0,0,0,0) → #000` |
| Bottom sheet | `180deg, rgba(28,28,30,0.80) → rgba(21,21,23,0.80)` |

---

## Getting Started
```bash
# Install dependencies
npm install

# Link fonts
npx react-native-asset

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

---

## Known Issues & Pending Tasks

### Screen-specific

- **Enter Details (Screen 7/8)**
  - Email error/wrong state UI pending
  - `InputField` text vertically off-centred on iOS

- **Select Pass (Screen 12/13)**
  - Single day pass selected state not fully styled
  - Counter `+` button not centred inside circle
  - "Today" date dropdown — border radius, icon and text alignment needs work

- **Private Cabin Details (Screen 10)**
  - Date selector (tour booking) needs refinement

- **Private Cabin All Set (Screen 11)**
  - Icon needs to be updated to correct asset

- **Single Desk All Set (Screen 18)**
  - Icon needs to be updated to correct asset

### Global

- **OrangeButton** — vertical padding needs to be reduced
- **PlanSelectorCard** — icon is currently hardcoded; needs to accept icon as a prop so each plan type can have its own icon

---

## Assets

Background image and logo hosted on ImageKit:
- Background: `https://ik.imagekit.io/p1zreiw3z/preview.jpg`
- Logo: `https://ik.imagekit.io/p1zreiw3z/Ofis%20Square%20White%20Logo%201.png`
- Dropdown arrow: `https://ik.imagekit.io/p1zreiw3z/Ofis%20Square/Icon.png