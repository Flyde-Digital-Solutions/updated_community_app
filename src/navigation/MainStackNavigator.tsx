import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenList } from '../screens/ScreenList';
import { OtpScreen } from '../screens/OtpScreen';
import { EnterDetailsScreen } from '../screens/EnterDetailsScreen';
import { WhatToBookScreen } from '../screens/WhatToBookScreen';
import { SelectPassScreen } from '../screens/SelectPassScreen';
import { AllSetOnDemandScreen } from '../screens/AllSetOnDemandScreen';
import { PrivateCabinDetailsScreen } from '../screens/PrivateCabinDetailsScreen';
import { PrivateCabinAllSetScreen } from '../screens/PrivateCabinAllSetScreen';
import { SingleDeskScreen } from '../screens/SingleDeskScreen';
import { SingleDeskAllSetScreen } from '../screens/SingleDeskAllSetScreen';

export type RootStackParamList = {
  ScreenList: undefined;
  OtpScreen: undefined;
  EnterDetailsScreen: undefined;
  WhatToBookScreen: undefined;
  SelectPassScreen: undefined;
  AllSetOnDemandScreen: undefined;
  PrivateCabinDetailsScreen: undefined;
  PrivateCabinAllSetScreen: undefined;
  SingleDeskScreen: undefined;
  SingleDeskAllSetScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ScreenList"
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
      <Stack.Screen name="ScreenList"                component={ScreenList} />
      <Stack.Screen name="OtpScreen"                 component={OtpScreen} />
      <Stack.Screen name="EnterDetailsScreen"        component={EnterDetailsScreen} />
      <Stack.Screen name="WhatToBookScreen"          component={WhatToBookScreen} />
      <Stack.Screen name="SelectPassScreen"          component={SelectPassScreen} />
      <Stack.Screen name="AllSetOnDemandScreen"      component={AllSetOnDemandScreen} />
      <Stack.Screen name="PrivateCabinDetailsScreen" component={PrivateCabinDetailsScreen} />
      <Stack.Screen name="PrivateCabinAllSetScreen"  component={PrivateCabinAllSetScreen} />
      <Stack.Screen name="SingleDeskScreen"          component={SingleDeskScreen} />
      <Stack.Screen name="SingleDeskAllSetScreen"    component={SingleDeskAllSetScreen} />
    </Stack.Navigator>
  );
}