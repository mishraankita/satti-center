import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SUIT_SYMBOLS } from '../src/constants/theme';
import { useGameStore } from '../src/store/gameStore';
import { getRoom, playCard, passTurn, getPlayableCards } from '../src/lib/api';
import { subscribeToRoom, unsubscribeFromRoom } from '../src/lib/supabase';
import type { Card as CardType } from '../src/lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Card } from '../src/components/Card';
import { SuitStack } from '../src/components/SuitStack';
import { PlayerHand } from '../src/components/PlayerHand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GameScreen() {
  const { code, ai } = useLocalSearchParams<{ code: string; ai?: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isAIGame = ai === 'true';
  
  const { 
    playerId, 
    gameState, 
    setGameState,
    playableCards,
    setPlayableCards,
    setRoom,
    isSyncing,
    setSyncing
  } = useGameStore();
  
  const currentPlayerIndex = gameState?.current_player_index ?? 0;
  const currentPlayer = gameState?.players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = gameState?.players.find(p => p.id === playerId);
  const myHand = myPlayer?.hand || [];
  const winner = gameState?.winner;
  const winnerPlayer = gameState?.players.find(p => p.id === winner);
  
  // Fetch game state with smart polling
  const fetchGameState = useCallback(async () => {
    if (!code) return;
    
    try {
      setSyncing(true);
      const roomData = await getRoom(code);
      
      // Only update if data has changed
      const newUpdateTime = roomData.updated_at || roomData.created_at;
      if (newUpdateTime !== lastUpdateTime) {
        setLastUpdateTime(newUpdateTime);
        setRoom(code, roomData);
        
        if (roomData.game_state) {
          setGameState(roomData.game_state);
        }
      }
      
      // Fetch playable cards
      if (roomData.game_state && playerId) {
        const playable = await getPlayableCards(code, playerId);
        setPlayableCards(playable.playable_cards);
      }
    } catch (e) {
      // Silently fail - polling will retry
    } finally {
      setSyncing(false);
    }
  }, [code, playerId, lastUpdateTime]);
  
  // Setup polling and Supabase realtime
  useEffect(() => {
    if (!code) return;
    
    // Initial fetch
    fetchGameState();
    
    // Setup Supabase realtime subscription
    channelRef.current = subscribeToRoom(code, (payload) => {
      if (payload.game_state) {
        setGameState(payload.game_state);
        setLastUpdateTime(new Date().toISOString());
      }
    });
    
    // Polling interval - faster for AI games
    const pollInterval = isAIGame ? 800 : 1500;
    const interval = setInterval(fetchGameState, pollInterval);
    
    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        unsubscribeFromRoom(channelRef.current);
      }
    };
  }, [code, isAIGame]);
  
  const handlePlayCard = async (card: CardType) => {
    if (!code || !playerId || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const result = await playCard(code, playerId, card);
      setGameState(result.game_state);
      setLastUpdateTime(new Date().toISOString());
      
      // Refresh playable cards
      const playable = await getPlayableCards(code, playerId);
      setPlayableCards(playable.playable_cards);
    } catch (e: any) {
      Alert.alert('Invalid Move', e.response?.data?.detail || 'Cannot play this card');
    } finally {
      setIsPlaying(false);
    }
  };
  
  const handlePass = async () => {
    if (!code || !playerId || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const result = await passTurn(code, playerId);
      setGameState(result.game_state);
      setLastUpdateTime(new Date().toISOString());
    } catch (e: any) {
      Alert.alert('Cannot Pass', e.response?.data?.detail || 'You have playable cards');
    } finally {
      setIsPlaying(false);
    }
  };
  
  const handleLeave = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => router.replace('/') }
      ]
    );
  };
  
  const handlePlayAgain = () => {
    router.replace('/');
  };
  
  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Winner screen
  if (winner) {
    const isWinner = winner === playerId;
    const isAIWinner = winnerPlayer?.is_ai;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.winnerContainer}>
          <Ionicons 
            name={isWinner ? 'trophy' : 'ribbon'} 
            size={80} 
            color={isWinner ? COLORS.highlight : COLORS.textSecondary} 
          />
          <Text style={styles.winnerTitle}>
            {isWinner ? 'You Win!' : `${winnerPlayer?.name} Wins!`}
          </Text>
          <Text style={styles.winnerSubtitle}>
            {isWinner ? 'Congratulations!' : isAIWinner ? 'The AI was too smart this time!' : 'Better luck next time!'}
          </Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.turnInfo}>
          <Text style={styles.turnText}>
            {isMyTurn ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
          </Text>
          {currentPlayer?.is_ai && (
            <View style={styles.aiBadge}>
              <Ionicons name="hardware-chip" size={12} color={COLORS.textPrimary} />
            </View>
          )}
          {isSyncing && (
            <View style={styles.syncBadge}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </View>
        
        <View style={styles.roomBadge}>
          <Text style={styles.roomCode}>{code}</Text>
          {isAIGame && <Text style={styles.aiLabel}>AI</Text>}
        </View>
      </View>
      
      {/* Last Action */}
      <View style={styles.actionBanner}>
        <Text style={styles.actionText}>{gameState.last_action}</Text>
      </View>
      
      {/* Game Board */}
      <ScrollView style={styles.boardContainer} contentContainerStyle={styles.boardContent}>
        {/* Players Status */}
        <View style={styles.playersRow}>
          {gameState.players.map((player, index) => (
            <View 
              key={player.id} 
              style={[
                styles.playerStatus,
                index === currentPlayerIndex && styles.activePlayer,
                player.id === playerId && styles.myPlayer
              ]}
            >
              <View style={[styles.playerDot, { backgroundColor: getPlayerColor(index) }]} />
              <Text style={styles.playerStatusName} numberOfLines={1}>
                {player.name}
              </Text>
              {player.is_ai && (
                <Ionicons name="hardware-chip" size={12} color={COLORS.textMuted} style={styles.aiIcon} />
              )}
              <Text style={styles.cardCount}>{player.hand.length}</Text>
            </View>
          ))}
        </View>
        
        {/* Board - Suit Stacks */}
        <View style={styles.suitStacks}>
          {['hearts', 'spades', 'diamonds', 'clubs'].map(suit => {
            const suitState = gameState.board[suit];
            return (
              <SuitStack
                key={suit}
                suit={suit}
                cards={suitState.cards}
                hasSevenPlayed={suitState.has_seven}
                low={suitState.low}
                high={suitState.high}
              />
            );
          })}
        </View>
      </ScrollView>
      
      {/* Player Hand */}
      <PlayerHand
        cards={myHand}
        playableCards={playableCards}
        onCardPress={handlePlayCard}
        isMyTurn={isMyTurn}
      />
      
      {/* Pass Button */}
      {isMyTurn && playableCards.length === 0 && (
        <View style={styles.passContainer}>
          <TouchableOpacity 
            style={[styles.passButton, isPlaying && styles.buttonDisabled]}
            onPress={handlePass}
            disabled={isPlaying}
          >
            {isPlaying ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.passText}>Pass Turn</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* AI Thinking indicator */}
      {!isMyTurn && currentPlayer?.is_ai && (
        <View style={styles.aiThinkingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.aiThinkingText}>{currentPlayer.name} is thinking...</Text>
        </View>
      )}
      
      {/* Loading overlay */}
      {isPlaying && (
        <View style={styles.playingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const getPlayerColor = (index: number) => {
  const colors = [COLORS.hearts, COLORS.spades, COLORS.diamonds, COLORS.clubs];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  turnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  turnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  aiBadge: {
    backgroundColor: COLORS.success,
    padding: 4,
    borderRadius: 4,
  },
  syncBadge: {
    marginLeft: SPACING.xs,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
    gap: SPACING.xs,
  },
  roomCode: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  aiLabel: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  actionBanner: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  boardContainer: {
    flex: 1,
  },
  boardContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  playersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activePlayer: {
    borderColor: COLORS.highlight,
  },
  myPlayer: {
    backgroundColor: COLORS.surfaceLight,
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerStatusName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    maxWidth: 60,
  },
  aiIcon: {
    marginLeft: 2,
  },
  cardCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: COLORS.cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suitStacks: {
    gap: SPACING.sm,
  },
  passContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  passButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  passText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  aiThinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  aiThinkingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  winnerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  winnerSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    marginTop: SPACING.xl,
  },
  playAgainText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});
