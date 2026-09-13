import { Feather } from '@expo/vector-icons';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initializeDatabase } from '@/db/database';
import { bootstrapAds } from '@/monetization/ads';
import { shouldShowAds } from '@/monetization/entitlements';
import { ensureAndroidChannel } from '@/notifications/reminders';
import { usePremiumStore } from '@/store/usePremiumStore';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function Fallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);
  const initialize = usePremiumStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
    void ensureAndroidChannel();
    void SplashScreen.hideAsync();
  }, [initialize]);

  useEffect(() => {
    // Ads bootstrap (and the iOS tracking prompt) is deferred until we know the
    // user is not premium — a paying user is never shown a tracking prompt for
    // ads they will never see.
    if (shouldShowAds({ isPremium, isReady })) void bootstrapAds();
  }, [isPremium, isReady]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ title: 'New habit', presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: '' }} />
        <Stack.Screen name="habit/edit/[id]" options={{ title: 'Edit habit', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="archive" options={{ title: 'Archived habits' }} />
        <Stack.Screen
          name="paywall"
          options={{
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Suspense fallback={<Fallback />}>
            <SQLiteProvider
              databaseName={DATABASE_NAME}
              onInit={initializeDatabase}
              useSuspense
            >
              <RootNavigator />
            </SQLiteProvider>
          </Suspense>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Keeps Feather's font warm so the first frame never flashes missing glyphs.
void Feather.loadFont?.();
