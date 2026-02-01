import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Card } from './Card';
import type { Card as CardType } from '../lib/api';

interface PlayerHandProps {
  cards: CardType[];
  playableCards: CardType[];
  onCardPress: (card: CardType) => void;
  isMyTurn: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ 
  cards, 
  playableCards, 
  onCardPress,
  isMyTurn
}) => {
  const isCardPlayable = (card: CardType) => {
    return playableCards.some(
      p => p.rank === card.rank && p.suit === card.suit
    );
  };
  
  // Sort cards by suit then rank
  const sortedCards = [...cards].sort((a, b) => {
    const suitOrder: Record<string, number> = {
      'hearts': 0, 'diamonds': 1, 'clubs': 2, 'spades': 3
    };
    const rankOrder: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return rankOrder[a.rank] - rankOrder[b.rank];
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Hand ({cards.length} cards)</Text>
        {isMyTurn && playableCards.length > 0 && (
          <Text style={styles.hint}>Tap a glowing card to play</Text>
        )}
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
      >
        {sortedCards.map((card, index) => {
          const playable = isCardPlayable(card);
          return (
            <View key={`${card.rank}-${card.suit}-${index}`} style={styles.cardWrapper}>
              <Card
                rank={card.rank}
                suit={card.suit}
                onPress={playable && isMyTurn ? () => onCardPress(card) : undefined}
                disabled={!playable || !isMyTurn}
                isPlayable={playable && isMyTurn}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.highlight,
    fontSize: 12,
  },
  cardsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  cardWrapper: {
    marginRight: -15,
  },
});
