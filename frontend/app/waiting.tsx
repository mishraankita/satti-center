import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Share,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../src/constants/theme';
import { useGameStore } from '../src/store/gameStore';
import { getRoom, startGame, generateCardImage } from '../src/lib/api';
import supabase from '../src/lib/supabase';

export default function WaitingRoom() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isStarting, setIsStarting] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const { 
    playerId, 
    playerName, 
    room, 
    setRoom, 
    setGameState,
    addCardImage,
    cardImages,
    isSyncing,
    setSyncing
  } = useGameStore();
  
  const isHost = room?.players.find(p => p.id === playerId)?.is_host || false;
  const canStart = room && room.players.length >= 2 && room.players.length <= 4;
  
  // Poll for room updates and setup realtime
  useEffect(() => {
    if (!code) return;
    
    let interval: ReturnType<typeof setInterval>;
    
    const fetchRoom = async () => {
      try {
        setSyncing(true);
        const roomData = await getRoom(code);
        setRoom(code, roomData);
        
        // If game started, navigate to game screen
        if (roomData.status === 'playing' && roomData.game_state) {
          setGameState(roomData.game_state);
          router.replace(`/game?code=${code}`);
        }
      } catch (e) {
        console.error('Failed to fetch room:', e);
      } finally {
        setSyncing(false);
      }
    };
    
    fetchRoom();
    interval = setInterval(fetchRoom, 2000); // Poll every 2 seconds
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [code]);
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my Strata 7 game! Room code: ${code}`,
      });
    } catch (e) {
      console.error('Share error:', e);
    }
  };
  
  const handleGenerateImages = async () => {
    setIsGeneratingImages(true);
    const ranks = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
    const missingRanks = ranks.filter(r => !cardImages[r]);
    
    if (missingRanks.length === 0) {
      Alert.alert('All images generated', 'All card images are ready!');
      setIsGeneratingImages(false);
      return;
    }
    
    let completed = ranks.length - missingRanks.length;
    setGenerationProgress(completed / ranks.length);
    
    for (const rank of missingRanks) {
      try {
        const result = await generateCardImage(rank);
        addCardImage(rank, result.image_base64);
        completed++;
        setGenerationProgress(completed / ranks.length);
      } catch (e) {
        console.error(`Failed to generate ${rank}:`, e);
      }
    }
    
    setIsGeneratingImages(false);
    setGenerationProgress(1);
  };
  
  const handleStart = async () => {
    if (!code) return;
    
    setIsStarting(true);
    try {
      const result = await startGame(code);
      setGameState(result.game_state);
      router.replace(`/game?code=${code}`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };
  
  const handleLeave = () => {
    router.replace('/');
  };
  
  const imagesGenerated = Object.keys(cardImages).length;
  const totalImages = 13;
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waiting Room</Text>
        {isSyncing && (
          <View style={styles.syncIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.syncText}>Syncing...</Text>
          </View>
        )}
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Room Code */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <Text style={styles.codeText}>{code}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={COLORS.primary} />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Players */}
        <View style={styles.playersContainer}>
          <Text style={styles.sectionTitle}>Players ({room?.players.length || 0}/4)</Text>
          {room?.players.map((player, index) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <View style={[styles.playerAvatar, { backgroundColor: getPlayerColor(index) }]}>
                  <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.is_host && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostText}>HOST</Text>
                  </View>
                )}
              </View>
              {player.id === playerId && (
                <Text style={styles.youText}>You</Text>
              )}
            </View>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: 4 - (room?.players.length || 0) }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptySlot}>
              <View style={styles.emptyAvatar}>
                <Ionicons name="person-add-outline" size={20} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>Waiting for player...</Text>
            </View>
          ))}
        </View>
        
        {/* Card Images Status */}
        <View style={styles.imageStatusContainer}>
          <Text style={styles.sectionTitle}>Card Images</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(imagesGenerated / totalImages) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{imagesGenerated}/{totalImages} images ready</Text>
          
          {isHost && imagesGenerated < totalImages && (
            <TouchableOpacity 
              style={[styles.generateButton, isGeneratingImages && styles.buttonDisabled]}
              onPress={handleGenerateImages}
              disabled={isGeneratingImages}
            >
              {isGeneratingImages ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                  <Text style={styles.generateText}>Generating... ({Math.round(generationProgress * 100)}%)</Text>
                </>
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.generateText}>Generate Card Art (AI)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Game Rules */}
        <View style={styles.rulesContainer}>
          <Text style={styles.sectionTitle}>How to Play</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>1</Text>
            <Text style={styles.ruleText}>Player with 7♥ starts the game</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>2</Text>
            <Text style={styles.ruleText}>Play 7s to start new suit sequences</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>3</Text>
            <Text style={styles.ruleText}>Build up (8→K) or down (6→A) from 7</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleNumber}>4</Text>
            <Text style={styles.ruleText}>First to empty their hand wins!</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Start Button (Host only) */}
      {isHost && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.startButton, 
              (!canStart || isStarting) && styles.buttonDisabled
            ]}
            onPress={handleStart}
            disabled={!canStart || isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <>
                <Ionicons name="play" size={24} color={COLORS.textPrimary} />
                <Text style={styles.startText}>
                  {canStart ? 'Start Game' : `Need ${2 - (room?.players.length || 0)} more players`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {!isHost && (
        <View style={styles.footer}>
          <Text style={styles.waitingText}>Waiting for host to start the game...</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  syncText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  content: {
    padding: SPACING.md,
  },
  codeContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  codeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  codeText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  shareText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  playersContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  hostBadge: {
    backgroundColor: COLORS.highlight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
  hostText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
  },
  youText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    opacity: 0.5,
  },
  emptyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginLeft: SPACING.sm,
  },
  imageStatusContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  generateText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  rulesContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ruleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
  ruleText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  startText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  waitingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
