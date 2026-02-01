import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SUIT_SYMBOLS, CARD_DIMENSIONS, SPACING } from '../constants/theme';
import { Card } from './Card';
import type { Card as CardType } from '../lib/api';

interface SuitStackProps {
  suit: string;
  cards: CardType[];
  hasSevenPlayed: boolean;
  low: number | null;
  high: number | null;
}

export const SuitStack: React.FC<SuitStackProps> = ({ 
  suit, 
  cards, 
  hasSevenPlayed,
  low,
  high
}) => {
  const suitColor = COLORS[suit as keyof typeof COLORS] || COLORS.textPrimary;
  const symbol = SUIT_SYMBOLS[suit] || '';
  
  // Sort cards by value for display
  const sortedCards = [...cards].sort((a, b) => {
    const rankOrder: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return rankOrder[a.rank] - rankOrder[b.rank];
  });
  
  return (
    <View style={styles.container}>
      {/* Suit Header */}
      <View style={[styles.header, { borderColor: suitColor }]}>
        <Text style={[styles.suitSymbol, { color: suitColor }]}>{symbol}</Text>
        {hasSevenPlayed && (
          <Text style={styles.rangeText}>
            {low && low < 7 ? `A-${low}` : ''} 7 {high && high > 7 ? `${high}-K` : ''}
          </Text>
        )}
      </View>
      
      {/* Cards Stack */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
      >
        {!hasSevenPlayed ? (
          <View style={[styles.emptySlot, { borderColor: suitColor }]}>
            <Text style={[styles.emptyText, { color: suitColor }]}>7{symbol}</Text>
          </View>
        ) : (
          sortedCards.map((card, index) => (
            <View key={`${card.rank}-${card.suit}`} style={styles.cardWrapper}>
              <Card rank={card.rank} suit={card.suit} small />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderLeftWidth: 3,
    marginBottom: SPACING.xs,
  },
  suitSymbol: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  rangeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  cardsContainer: {
    paddingHorizontal: SPACING.sm,
    gap: -20, // Overlap cards
  },
  cardWrapper: {
    marginLeft: -20,
  },
  emptySlot: {
    width: CARD_DIMENSIONS.width * 0.7,
    height: CARD_DIMENSIONS.height * 0.7,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: CARD_DIMENSIONS.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
