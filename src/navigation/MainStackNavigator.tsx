import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Signup Flow
import { ScreenList }                from '../screens/ScreenList';
import { OtpScreen }                 from '../screens/OtpScreen';
import { EnterDetailsScreen }        from '../screens/EnterDetailsScreen';
import { WhatToBookScreen }          from '../screens/WhatToBookScreen';
import { SelectPassScreen }          from '../screens/SelectPassScreen';
import { AllSetOnDemandScreen }      from '../screens/AllSetOnDemandScreen';
import { PrivateCabinDetailsScreen } from '../screens/PrivateCabinDetailsScreen';
import { PrivateCabinAllSetScreen }  from '../screens/PrivateCabinAllSetScreen';
import { SingleDeskScreen }          from '../screens/SingleDeskScreen';
import { SingleDeskAllSetScreen }    from '../screens/SingleDeskAllSetScreen';

// Community App
import { HomeScreen }                from '../screens/HomeScreen';
import { AllTicketsScreen }          from '../screens/AllTicketsScreen';
import { TicketDetailScreen }        from '../screens/TicketDetailScreen';
import { AllDayPassesScreen }        from '../screens/AllDayPassesScreen';
import { DayPassDetailScreen }       from '../screens/DayPassDetailScreen';
import { KycVerificationScreen }     from '../screens/KycVerificationScreen';
import { AllRoomBookingsScreen }     from '../screens/AllRoomBookingsScreen';
import { AddRoomBookingScreen }      from '../screens/AddRoomBookingScreen';
import { NotificationsScreen }       from '../screens/NotificationsScreen';
import { ViewGuestsScreen }          from '../screens/ViewGuestsScreen';
import { ScanVisitorScreen }         from '../screens/ScanVisitorScreen';
import { InventoryScreen }           from '../screens/InventoryScreen';
import { CabinDetailScreen }         from '../screens/CabinDetailScreen';
import { MembersScreen }             from '../screens/MembersScreen';
import { MemberDetailScreen }        from '../screens/MemberDetailScreen';
import { CompanyDetailScreen }       from '../screens/CompanyDetailScreen';
import { ProfileScreen }             from '../screens/ProfileScreen';
import { LoginScreen }               from '../screens/LoginScreen';
import { PaymentWebViewScreen }      from '../screens/PaymentWebViewScreen';
import { RazorpayCheckoutScreen }    from '../screens/RazorpayCheckoutScreen';
import {
  ExtendedHoursScreen, GlobalSearchScreen,
  InventoryResourceDetailScreen, InvoicesScreen, LeadDetailScreen, MeetingBookingDetailScreen,
  OnDemandUserDetailScreen, VisitorDetailScreen,
} from '../screens/AdvancedOperationsScreens';
import { useApp }                    from '../context/AppContext';
import { Colors }                    from '../theme';
import {
  BillingScreen, BookDayPassScreen, CommonAreasScreen, CommunityScreen, CreateTicketScreen,
  EventsScreen, InviteVisitorScreen, LeadsScreen, OnDemandUsersScreen, OperationsHubScreen,
  PrinterRequestsScreen, RfidCardsScreen, MeetingRoomsInventoryScreen,
} from '../screens/OperationsScreens';

export type RootStackParamList = {
  // Dev
  ScreenList: undefined;
  LoginScreen: undefined;

  // Signup Flow
  OtpScreen: { phone: string };
  EnterDetailsScreen: { phone?: string };
  WhatToBookScreen: undefined;
  SelectPassScreen: undefined;
  AllSetOnDemandScreen: undefined;
  PrivateCabinDetailsScreen: undefined;
  PrivateCabinAllSetScreen: undefined;
  SingleDeskScreen: undefined;
  SingleDeskAllSetScreen: undefined;

  // Community App
  HomeScreen: undefined;
  AllTicketsScreen: undefined;
  TicketDetailScreen: { ticketId: string };
  AllDayPassesScreen: undefined;
  DayPassDetailScreen: { passId: string };
  KycVerificationScreen: { memberId: string };
  AllRoomBookingsScreen: undefined;
  AddRoomBookingScreen: undefined;
  NotificationsScreen: undefined;
  ViewGuestsScreen: undefined;
  ScanVisitorScreen: undefined;
  InventoryScreen: undefined;
  CabinDetailScreen: { cabinId: string };
  MembersScreen: undefined;
  MemberDetailScreen: { memberId: string };
  CompanyDetailScreen: { companyId: string };
  ProfileScreen: undefined;
  OperationsHubScreen: undefined;
  EventsScreen: undefined;
  CommunityScreen: undefined;
  LeadsScreen: undefined;
  RfidCardsScreen: undefined;
  PrinterRequestsScreen: undefined;
  BillingScreen: undefined;
  CommonAreasScreen: undefined;
  CreateTicketScreen: { ticketId?: string } | undefined;
  InviteVisitorScreen: undefined;
  BookDayPassScreen: undefined;
  OnDemandUsersScreen: undefined;
  MeetingRoomsInventoryScreen: undefined;
  PaymentWebViewScreen: { url: string; title?: string; context?: { invoiceId?: string; meetingBookingId?: string; dayPassId?: string; bundleId?: string; amount?: number } };
  RazorpayCheckoutScreen: { title?: string; order: { key: string; amount: number; orderId: string; description?: string }; prefill?: { name?: string; email?: string; contact?: string }; context?: { invoiceId?: string; meetingBookingId?: string; dayPassId?: string; bundleId?: string; amount?: number } };
  GlobalSearchScreen: undefined;
  LeadDetailScreen: { leadId: string };
  OnDemandUserDetailScreen: { guestId: string };
  VisitorDetailScreen: { visitorId: string };
  InventoryResourceDetailScreen: { kind: 'cabin' | 'meeting-room' | 'common-area'; id: string };
  MeetingBookingDetailScreen: { bookingId: string };
  InvoicesScreen: undefined;
  ExtendedHoursScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MainStackNavigator() {
  const { authenticated, hydrated, sessionValidated } = useApp();

  if (!hydrated || (authenticated && !sessionValidated)) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.accent300} /></View>;
  }

  return (
    <Stack.Navigator
      key={authenticated ? 'authenticated' : 'guest'}
      initialRouteName={authenticated ? 'HomeScreen' : 'LoginScreen'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#0F0F10',
          margin: 0,
          padding: 0,
        },
      }}
    >
      {!authenticated ? (
        <>
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="OtpScreen" component={OtpScreen} />
          <Stack.Screen name="EnterDetailsScreen" component={EnterDetailsScreen} />
        </>
      ) : (
        <>
      {/* Dev Launcher */}
      <Stack.Screen name="ScreenList"                component={ScreenList} />

      {/* Signup Flow */}
      <Stack.Screen name="WhatToBookScreen"          component={WhatToBookScreen} />
      <Stack.Screen name="SelectPassScreen"          component={SelectPassScreen} />
      <Stack.Screen name="AllSetOnDemandScreen"      component={AllSetOnDemandScreen} />
      <Stack.Screen name="PrivateCabinDetailsScreen" component={PrivateCabinDetailsScreen} />
      <Stack.Screen name="PrivateCabinAllSetScreen"  component={PrivateCabinAllSetScreen} />
      <Stack.Screen name="SingleDeskScreen"          component={SingleDeskScreen} />
      <Stack.Screen name="SingleDeskAllSetScreen"    component={SingleDeskAllSetScreen} />

      {/* Community App */}
      <Stack.Screen name="HomeScreen"                component={HomeScreen} />
      <Stack.Screen name="AllTicketsScreen"          component={AllTicketsScreen} />
      <Stack.Screen name="TicketDetailScreen"        component={TicketDetailScreen} />
      <Stack.Screen name="AllDayPassesScreen"        component={AllDayPassesScreen} />
      <Stack.Screen name="DayPassDetailScreen"       component={DayPassDetailScreen} />
      <Stack.Screen name="KycVerificationScreen"     component={KycVerificationScreen} />
      <Stack.Screen name="AllRoomBookingsScreen"     component={AllRoomBookingsScreen} />
      <Stack.Screen name="AddRoomBookingScreen"      component={AddRoomBookingScreen} />
      <Stack.Screen name="NotificationsScreen"       component={NotificationsScreen} />
      <Stack.Screen name="ViewGuestsScreen"          component={ViewGuestsScreen} />
      <Stack.Screen name="ScanVisitorScreen"         component={ScanVisitorScreen} />
      <Stack.Screen name="InventoryScreen"           component={InventoryScreen} />
      <Stack.Screen name="CabinDetailScreen"         component={CabinDetailScreen} />
      <Stack.Screen name="MembersScreen"             component={MembersScreen} />
      <Stack.Screen name="MemberDetailScreen"        component={MemberDetailScreen} />
      <Stack.Screen name="CompanyDetailScreen"       component={CompanyDetailScreen} />
      <Stack.Screen name="ProfileScreen"             component={ProfileScreen} />
      <Stack.Screen name="OperationsHubScreen"       component={OperationsHubScreen} />
      <Stack.Screen name="EventsScreen"              component={EventsScreen} />
      <Stack.Screen name="CommunityScreen"           component={CommunityScreen} />
      <Stack.Screen name="LeadsScreen"               component={LeadsScreen} />
      <Stack.Screen name="RfidCardsScreen"           component={RfidCardsScreen} />
      <Stack.Screen name="PrinterRequestsScreen"     component={PrinterRequestsScreen} />
      <Stack.Screen name="BillingScreen"             component={BillingScreen} />
      <Stack.Screen name="CommonAreasScreen"         component={CommonAreasScreen} />
      <Stack.Screen name="CreateTicketScreen"        component={CreateTicketScreen} />
      <Stack.Screen name="InviteVisitorScreen"       component={InviteVisitorScreen} />
      <Stack.Screen name="BookDayPassScreen"         component={BookDayPassScreen} />
      <Stack.Screen name="OnDemandUsersScreen"       component={OnDemandUsersScreen} />
      <Stack.Screen name="MeetingRoomsInventoryScreen" component={MeetingRoomsInventoryScreen} />
      <Stack.Screen name="PaymentWebViewScreen"      component={PaymentWebViewScreen} />
      <Stack.Screen name="RazorpayCheckoutScreen"    component={RazorpayCheckoutScreen} />
      <Stack.Screen name="GlobalSearchScreen"        component={GlobalSearchScreen} />
      <Stack.Screen name="LeadDetailScreen"          component={LeadDetailScreen} />
      <Stack.Screen name="OnDemandUserDetailScreen"  component={OnDemandUserDetailScreen} />
      <Stack.Screen name="VisitorDetailScreen"       component={VisitorDetailScreen} />
      <Stack.Screen name="InventoryResourceDetailScreen" component={InventoryResourceDetailScreen} />
      <Stack.Screen name="MeetingBookingDetailScreen" component={MeetingBookingDetailScreen} />
      <Stack.Screen name="InvoicesScreen"            component={InvoicesScreen} />
      <Stack.Screen name="ExtendedHoursScreen"       component={ExtendedHoursScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
