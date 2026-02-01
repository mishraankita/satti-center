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

// Convert rank to numeric value
const getRankValue = (rank: string): number => {
  const rankOrder: Record<string, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  return rankOrder[rank] || 0;
};

// Small card width for calculating positions
const SMALL_CARD_WIDTH = CARD_DIMENSIONS.width * 0.7;
// Tight overlap for consecutive middle cards (just show the number ~18px)
const TIGHT_OVERLAP = SMALL_CARD_WIDTH - 18;
// Normal overlap for edge cards
const NORMAL_OVERLAP = 15;

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
    return getRankValue(a.rank) - getRankValue(b.rank);
  });
  
  // Calculate position for each card relative to the 7 (center)
  // Cards below 7 go left (negative offset), cards above 7 go right (positive offset)
  const getCardPosition = (card: CardType, index: number, allCards: CardType[]): number => {
    const rankValue = getRankValue(card.rank);
    
    // Find the 7 card index (if it exists) or use as reference point
    const sevenIndex = allCards.findIndex(c => getRankValue(c.rank) === 7);
    
    if (sevenIndex === -1) {
      // No 7 played yet, shouldn't happen but fallback
      return index * (SMALL_CARD_WIDTH - NORMAL_OVERLAP);
    }
    
    // Calculate position relative to 7
    // 7 is at center (position 0)
    const distanceFromSeven = index - sevenIndex;
    
    if (distanceFromSeven === 0) {
      // This is the 7 card, center position
      return 0;
    }
    
    // Calculate cumulative offset
    let offset = 0;
    
    if (distanceFromSeven < 0) {
      // Card is below 7 (going left)
      // Always use tight spacing for all cards
      for (let i = sevenIndex - 1; i >= index; i--) {
        offset -= (SMALL_CARD_WIDTH - TIGHT_OVERLAP);
      }
    } else {
      // Card is above 7 (going right)
      // Always use tight spacing for all cards
      for (let i = sevenIndex + 1; i <= index; i++) {
        offset += (SMALL_CARD_WIDTH - TIGHT_OVERLAP);
      }
    }
    
    return offset;
  };
  
  // Calculate total width needed for centering
  const calculateTotalWidth = (): number => {
    if (sortedCards.length === 0) return SMALL_CARD_WIDTH;
    
    const positions = sortedCards.map((card, index) => getCardPosition(card, index, sortedCards));
    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);
    
    return (maxPos - minPos) + SMALL_CARD_WIDTH;
  };
  
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
        contentContainerStyle={[
          styles.cardsContainer,
          styles.cardsContainerCentered
        ]}
      >
        {!hasSevenPlayed ? (
          <View style={[styles.emptySlot, { borderColor: suitColor }]}>
            <Text style={[styles.emptyText, { color: suitColor }]}>7{symbol}</Text>
          </View>
        ) : (
          <View style={[styles.cardsRow, { width: calculateTotalWidth() }]}>
            {sortedCards.map((card, index) => {
              const position = getCardPosition(card, index, sortedCards);
              // Find min position to shift all cards so leftmost is at 0
              const positions = sortedCards.map((c, i) => getCardPosition(c, i, sortedCards));
              const minPos = Math.min(...positions);
              const adjustedPosition = position - minPos;
              
              return (
                <View 
                  key={`${card.rank}-${card.suit}`} 
                  style={[
                    styles.cardAbsolute,
                    { left: adjustedPosition }
                  ]}
                >
                  <Card rank={card.rank} suit={card.suit} small />
                </View>
              );
            })}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardsContainerCentered: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  cardsRow: {
    position: 'relative',
    height: CARD_DIMENSIONS.height * 0.7,
  },
  cardAbsolute: {
    position: 'absolute',
    top: 0,
  },
  cardWrapper: {
    marginLeft: -15,
  },
  firstCard: {
    marginLeft: 0,
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
