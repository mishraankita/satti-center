import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { AnimatedCard, AnimatedCardRef } from './AnimatedCard';
import type { Card as CardType } from '../lib/api';

interface PlayerHandProps {
  cards: CardType[];
  playableCards: CardType[];
  onCardPress: (card: CardType) => void;
  isMyTurn: boolean;
  shouldAnimateDeal?: boolean;
}

export interface PlayerHandRef {
  shakeCard: (card: CardType) => void;
}

export const PlayerHand = forwardRef<PlayerHandRef, PlayerHandProps>(({ 
  cards, 
  playableCards, 
  onCardPress,
  isMyTurn,
  shouldAnimateDeal = false,
}, ref) => {
  // Track if we've already animated the deal
  const [hasAnimatedDeal, setHasAnimatedDeal] = useState(false);
  
  // Store refs for each card
  const cardRefs = useRef<Map<string, AnimatedCardRef>>(new Map());
  
  const isCardPlayable = (card: CardType) => {
    return playableCards.some(
      p => p.rank === card.rank && p.suit === card.suit
    );
  };
  
  // Get card key for ref storage
  const getCardKey = (card: CardType) => `${card.rank}-${card.suit}`;
  
  // Set ref callback
  const setCardRef = useCallback((card: CardType, cardRef: AnimatedCardRef | null) => {
    const key = getCardKey(card);
    if (cardRef) {
      cardRefs.current.set(key, cardRef);
    } else {
      cardRefs.current.delete(key);
    }
  }, []);
  
  // Expose shake method via ref
  useImperativeHandle(ref, () => ({
    shakeCard: (card: CardType) => {
      const key = getCardKey(card);
      const cardRef = cardRefs.current.get(key);
      if (cardRef) {
        cardRef.triggerShake();
      }
    },
  }));
  
  // Enable deal animation when cards first load
  useEffect(() => {
    if (cards.length > 0 && shouldAnimateDeal && !hasAnimatedDeal) {
      setHasAnimatedDeal(true);
    }
  }, [cards.length, shouldAnimateDeal, hasAnimatedDeal]);
  
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
        style={styles.scrollView}
      >
        {sortedCards.map((card, index) => {
          const playable = isCardPlayable(card);
          const key = getCardKey(card);
          
          return (
            <View 
              key={`${key}-${index}`} 
              style={styles.cardWrapper}
            >
              <AnimatedCard
                ref={(cardRef) => setCardRef(card, cardRef)}
                card={card}
                index={index}
                isPlayable={playable}
                isMyTurn={isMyTurn}
                disabled={!playable || !isMyTurn}
                onPress={playable && isMyTurn ? () => onCardPress(card) : undefined}
                shouldAnimateDeal={shouldAnimateDeal && !hasAnimatedDeal}
                dealDelay={index * 100} // Stagger by 100ms
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

PlayerHand.displayName = 'PlayerHand';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingVertical: SPACING.sm,
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
  scrollView: {
    overflow: 'visible',
  },
  cardsContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: 30, // Extra space for lift animation
    paddingBottom: SPACING.xs,
    gap: SPACING.xs,
    alignItems: 'flex-end',
  },
  cardWrapper: {
    marginRight: -15,
  },
});

export default PlayerHand;