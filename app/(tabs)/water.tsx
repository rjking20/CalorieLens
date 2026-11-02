import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useWaterStore } from '@/store/useWaterStore';
import { useProfileStore } from '@/store/useProfileStore';
import { WaterGlass } from '@/components/WaterGlass';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';

const QUICK_AMOUNTS = [
  { label: '+100 ml', value: 100, icon: 'water-outline' as const },
  { label: '+250 ml', value: 250, icon: 'cafe-outline' as const },
  { label: '+500 ml', value: 500, icon: 'fitness-outline' as const },
  { label: '+1,000 ml', value: 1000, icon: 'water' as const },
];

export default function WaterScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const profile = useProfileStore((state) => state.profile);
  const { todayEntries, todayTotal, loadToday, addWater, removeEntry } = useWaterStore();

  const waterGoal = profile?.dailyWaterGoal || 2500;

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadToday();
    setRefreshing(false);
  };

  const handleQuickAdd = async (amount: number) => {
    try {
      await addWater(amount);
    } catch (error) {
      console.error('Failed to log water:', error);
      Alert.alert('Error', 'Failed to log water intake.');
    }
  };

  const handleCustomAdd = async () => {
    const amountNum = parseInt(customAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount of water in ml.');
      return;
    }

    try {
      await addWater(amountNum);
      setCustomAmount('');
    } catch (error) {
      console.error('Failed to log custom water:', error);
      Alert.alert('Error', 'Failed to log water intake.');
    }
  };

  const handleDeleteEntry = (id: string, amount: number) => {
    Alert.alert(
      'Delete Water Entry',
      `Delete entry of ${amount} ml?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEntry(id);
            } catch (error) {
              console.error('Failed to remove entry:', error);
            }
          },
        },
      ]
    );
  };

  const formatLogTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Sort entries newest first
  const sortedEntries = [...todayEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>Water Tracker</Text>
        <Text style={styles.screenSubtitle}>Stay hydrated and healthy all day</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.water]}
            tintColor={Colors.water}
          />
        }
      >
        {/* Main Water Glass Card */}
        <View style={styles.glassCard}>
          <WaterGlass
            current={todayTotal}
            goal={waterGoal}
            width={130}
            height={175}
          />
        </View>

        {/* Quick Add Buttons Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddRow}>
            {QUICK_AMOUNTS.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.75}
                style={styles.quickButton}
                onPress={() => handleQuickAdd(item.value)}
              >
                <View style={styles.quickIconCircle}>
                  <Ionicons name={item.icon} size={20} color={Colors.water} />
                </View>
                <Text style={styles.quickButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.customInputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="water-outline"
                size={18}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.customTextInput}
                placeholder="Custom amount (e.g. 350)"
                placeholderTextColor={Colors.textLight}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleCustomAdd}
              />
              <Text style={styles.inputUnit}>ml</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.customAddButton}
              onPress={handleCustomAdd}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.customAddText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Log List */}
        <View style={styles.sectionCard}>
          <View style={styles.logHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            <View style={styles.logCountBadge}>
              <Text style={styles.logCountText}>
                {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </View>

          {sortedEntries.length === 0 ? (
            <View style={styles.emptyLogContainer}>
              <Ionicons name="water-outline" size={36} color="#BBDEFB" />
              <Text style={styles.emptyLogTitle}>No water logged yet today</Text>
              <Text style={styles.emptyLogSubtitle}>
                Drink a glass of water and tap one of the quick buttons above!
              </Text>
            </View>
          ) : (
            sortedEntries.map((entry) => (
              <View key={entry.id} style={styles.logItem}>
                <View style={styles.logLeft}>
                  <View style={styles.logIconBubble}>
                    <Ionicons name="water" size={16} color={Colors.water} />
                  </View>
                  <View>
                    <Text style={styles.logAmount}>{entry.amount} ml</Text>
                    <Text style={styles.logTime}>
                      {formatLogTime(entry.createdAt)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEntry(entry.id, entry.amount)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Hydration Facts & Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={Colors.water} />
            <Text style={styles.tipsHeaderTitle}>Hydration Benefits</Text>
          </View>
          <Text style={styles.tipText}>
            💧 Drinking enough water boosts your metabolism, improves mental focus, and supports optimal physical recovery throughout the day.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl + 20,
  },
  glassCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs + 2,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  quickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.water,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: Spacing.sm,
  },
  inputIcon: {
    marginRight: 6,
  },
  customTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  inputUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  customAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.water,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    gap: 4,
  },
  customAddText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  logCountBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  logCountText: {
    fontSize: FontSize.xs - 2,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyLogContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  emptyLogSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: Spacing.md,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  logAmount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  logTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  deleteButton: {
    padding: 6,
  },
  tipsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  tipsHeaderTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#1565C0',
  },
  tipText: {
    fontSize: FontSize.xs,
    color: '#1976D2',
    lineHeight: 18,
  },
});
