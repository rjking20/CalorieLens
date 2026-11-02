import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';

export interface DateSelectorProps {
  selectedDate: string; // ISO date format 'YYYY-MM-DD'
  onDateChange: (date: string) => void;
  daysCount?: number; // Number of days to show, default 14
}

interface DateItem {
  dateString: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateChange,
  daysCount = 14,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate list of recent dates up to today
  const dates = useMemo<DateItem[]>(() => {
    const list: DateItem[] = [];
    const today = new Date();
    const todayString = formatLocalDate(today);

    // Create dates from (daysCount - 1) days ago up to today
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      const dateString = formatLocalDate(d);
      const isToday = dateString === todayString;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = d.getDate();

      list.push({
        dateString,
        dayName,
        dayNumber,
        monthName,
        isToday,
      });
    }

    return list;
  }, [daysCount]);

  // Auto-scroll to selected date on mount or selection change
  useEffect(() => {
    const selectedIndex = dates.findIndex((item) => item.dateString === selectedDate);
    if (selectedIndex >= 0 && scrollViewRef.current) {
      // Each item is 56px wide + 8px marginRight = 64px
      const itemWidth = 64;
      const scrollX = Math.max(0, selectedIndex * itemWidth - 120);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollX, animated: true });
      }, 100);
    }
  }, [selectedDate, dates]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((item) => {
          const isSelected = item.dateString === selectedDate;

          return (
            <TouchableOpacity
              key={item.dateString}
              activeOpacity={0.7}
              onPress={() => onDateChange(item.dateString)}
              style={[
                styles.dateCard,
                isSelected ? styles.selectedCard : styles.unselectedCard,
              ]}
            >
              {/* Day Name / 'Today' */}
              <Text
                style={[
                  styles.dayName,
                  isSelected ? styles.selectedText : styles.unselectedDayName,
                  item.isToday && !isSelected && styles.todayDayName,
                ]}
                numberOfLines={1}
              >
                {item.isToday ? 'Today' : item.dayName}
              </Text>

              {/* Day Number */}
              <Text
                style={[
                  styles.dayNumber,
                  isSelected ? styles.selectedText : styles.unselectedDayNumber,
                ]}
              >
                {item.dayNumber}
              </Text>

              {/* Month Abbreviation */}
              <Text
                style={[
                  styles.monthText,
                  isSelected ? styles.selectedSubText : styles.unselectedMonthText,
                ]}
              >
                {item.monthName}
              </Text>

              {/* Subtle indicator dot for Today when not selected */}
              {item.isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs + 2,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  dateCard: {
    width: 58,
    height: 76,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  unselectedCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    ...Shadows.sm,
  },
  selectedCard: {
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  dayName: {
    fontSize: FontSize.xs - 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  unselectedDayName: {
    color: Colors.textSecondary,
  },
  todayDayName: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  dayNumber: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    lineHeight: 22,
  },
  unselectedDayNumber: {
    color: Colors.text,
  },
  monthText: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  unselectedMonthText: {
    color: Colors.textLight,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  todayDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
  },
});

export default DateSelector;
