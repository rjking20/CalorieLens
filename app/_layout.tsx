import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from '@/services/database';
import { useProfileStore } from '@/store/useProfileStore';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const isOnboarded = useProfileStore((state) => state.isOnboarded);

  // Initialize SQLite database on app start
  useEffect(() => {
    let isMounted = true;

    const setupDatabase = async () => {
      try {
        await initDatabase();
        if (isMounted) {
          setIsDbReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Still proceed so user can access UI
        if (isMounted) {
          setIsDbReady(true);
        }
      }
    };

    setupDatabase();

    // Check store hydration from AsyncStorage
    const checkHydration = () => {
      const hydrated = useProfileStore.persist.hasHydrated();
      if (hydrated) {
        setIsHydrated(true);
      } else {
        const unsubscribe = useProfileStore.persist.onFinishHydration(() => {
          setIsHydrated(true);
        });
        return unsubscribe;
      }
    };

    const cleanupHydration = checkHydration();

    return () => {
      isMounted = false;
      if (cleanupHydration) {
        cleanupHydration();
      }
    };
  }, []);

  const isReady = isDbReady && isHydrated;

  // Route protection / onboarding redirection
  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === 'onboarding';
    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isReady, isOnboarded, segments]);

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="dark" />
        <View style={styles.logoBadge}>
          <Ionicons name="nutrition" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.splashTitle}>CalorieLens</Text>
        <Text style={styles.splashSubtitle}>Smart Food & Nutrition Tracking</Text>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {/* Main Tab Navigator Group */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* Modal / Secondary Screens */}
        <Stack.Screen
          name="meal-detail"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        <Stack.Screen
          name="weight"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  splashTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginTop: Spacing.md,
  },
});
