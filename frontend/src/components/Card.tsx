import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, CARD_DIMENSIONS, RANK_LABELS, SUIT_SYMBOLS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

interface CardProps {
  rank: string;
  suit: string;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
  isPlayable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  rank, 
  suit, 
  onPress, 
  disabled = false,
  small = false,
  isPlayable = false
}) => {
  const { cardImages } = useGameStore();
  const imageBase64 = cardImages[rank];
  
  const suitColor = COLORS[suit as keyof typeof COLORS] || COLORS.textPrimary;
  const symbol = SUIT_SYMBOLS[suit] || '';
  const label = RANK_LABELS[rank] || '';
  
  const width = small ? CARD_DIMENSIONS.width * 0.7 : CARD_DIMENSIONS.width;
  const height = small ? CARD_DIMENSIONS.height * 0.7 : CARD_DIMENSIONS.height;
  
  const cardContent = (
    <View style={[
      styles.card,
      { width, height, borderColor: suitColor },
      disabled && styles.cardDisabled,
      isPlayable && styles.cardPlayable
    ]}>
      {/* Background Image */}
      {imageBase64 ? (
        <Image
          source={{ uri: `data:image/png;base64,${imageBase64}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardPlaceholder, { backgroundColor: suitColor + '20' }]} />
      )}
      
      {/* Border Overlay */}
      <View style={[styles.borderOverlay, { borderColor: suitColor }]} />
      
      {/* Top-left corner */}
      <View style={styles.cornerTopLeft}>
        <Text style={[styles.rankText, { color: suitColor }, small && styles.smallText]}>{rank}</Text>
        <Text style={[styles.suitSymbol, { color: suitColor }, small && styles.smallText]}>{symbol}</Text>
      </View>
      
      {/* Bottom-right corner */}
      <View style={styles.cornerBottomRight}>
        <Text style={[styles.suitSymbol, { color: suitColor }, small && styles.smallText]}>{symbol}</Text>
        <Text style={[styles.rankText, { color: suitColor }, small && styles.smallText]}>{rank}</Text>
      </View>
      
      {/* Altitude Label (bottom edge) */}
      {!small && (
        <View style={styles.labelContainer}>
          <Text style={[styles.labelText, { color: suitColor }]}>{label}</Text>
        </View>
      )}
      
      {/* Playable indicator */}
      {isPlayable && (
        <View style={[styles.playableIndicator, { backgroundColor: suitColor }]} />
      )}
    </View>
  );
  
  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {cardContent}
      </TouchableOpacity>
    );
  }
  
  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderWidth: CARD_DIMENSIONS.borderWidth,
    borderRadius: CARD_DIMENSIONS.borderRadius,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardPlayable: {
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: CARD_DIMENSIONS.borderRadius - 2,
    opacity: 0.5,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 2,
    left: 3,
    alignItems: 'center',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  suitSymbol: {
    fontSize: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  smallText: {
    fontSize: 9,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 7,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  playableIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
