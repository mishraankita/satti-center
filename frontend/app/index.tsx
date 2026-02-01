import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../src/constants/theme';
import { useGameStore } from '../src/store/gameStore';
import { createRoom, joinRoom, createAIGame, getCardConfig, getAllCardImages } from '../src/lib/api';

export default function LobbyScreen() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'host' | 'join' | 'ai'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPlayers, setAiPlayers] = useState(1);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  const { setPlayer, setRoom, setGameState, setCardConfig, addCardImage, reset } = useGameStore();
  
  useEffect(() => {
    reset();
    loadCardConfig();
  }, []);
  
  const loadCardConfig = async () => {
    try {
      const config = await getCardConfig();
      setCardConfig(config);
      const images = await getAllCardImages();
      images.forEach(img => addCardImage(img.rank, img.image_base64));
    } catch (e) {
      console.log('Failed to load card config:', e);
    }
  };
  
  const handleHost = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createRoom(playerName.trim());
      setPlayer(result.player_id, playerName.trim());
      setRoom(result.room_code, result.room);
      router.push(`/waiting?code=${result.room_code}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      setPlayer(result.player_id, playerName.trim());
      setRoom(result.room_code, result.room);
      router.push(`/waiting?code=${result.room_code}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePlayAI = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createAIGame(playerName.trim(), aiPlayers, aiDifficulty);
      setPlayer(result.player_id, playerName.trim());
      setGameState(result.game_state);
      router.push(`/game?code=${result.room_code}&ai=true`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start AI game');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>STRATA</Text>
        <Text style={styles.logoNumber}>7</Text>
      </View>
      <Text style={styles.subtitle}>Badam Satti / Sevens</Text>
      <Text style={styles.description}>A journey from Earth's core to deep space</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={() => setMode('ai')}
        >
          <Ionicons name="hardware-chip-outline" size={24} color={COLORS.textPrimary} />
          <Text style={styles.buttonText}>Play vs AI</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => setMode('host')}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.textPrimary} />
          <Text style={styles.buttonText}>Host Game</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => setMode('join')}
        >
          <Ionicons name="enter-outline" size={24} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Join Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderHostForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('menu')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.formTitle}>Host a Game</Text>
      <Text style={styles.formSubtitle}>Create a room and invite your friends</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Your Display Name"
          placeholderTextColor={COLORS.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
          autoCapitalize="words"
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleHost}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Create Room</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
  
  const renderJoinForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('menu')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.formTitle}>Join a Game</Text>
      <Text style={styles.formSubtitle}>Enter the room code shared by host</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Your Display Name"
          placeholderTextColor={COLORS.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
          autoCapitalize="words"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="key-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="ABCD"
          placeholderTextColor={COLORS.textMuted}
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          maxLength={4}
          autoCapitalize="characters"
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="enter-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Join Room</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
  
  const renderAIForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('menu')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.formTitle}>Play vs AI</Text>
      <Text style={styles.formSubtitle}>Practice against computer opponents</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Your Display Name"
          placeholderTextColor={COLORS.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
          autoCapitalize="words"
        />
      </View>
      
      {/* AI Players Selection */}
      <Text style={styles.optionLabel}>Number of AI Opponents</Text>
      <View style={styles.optionRow}>
        {[1, 2, 3].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.optionButton,
              aiPlayers === num && styles.optionButtonActive
            ]}
            onPress={() => setAiPlayers(num)}
          >
            <Text style={[
              styles.optionText,
              aiPlayers === num && styles.optionTextActive
            ]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Difficulty Selection */}
      <Text style={styles.optionLabel}>Difficulty</Text>
      <View style={styles.optionRow}>
        {(['easy', 'medium', 'hard'] as const).map((diff) => (
          <TouchableOpacity
            key={diff}
            style={[
              styles.optionButton,
              styles.difficultyButton,
              aiDifficulty === diff && styles.optionButtonActive,
              diff === 'easy' && aiDifficulty === diff && styles.easyActive,
              diff === 'hard' && aiDifficulty === diff && styles.hardActive,
            ]}
            onPress={() => setAiDifficulty(diff)}
          >
            <Text style={[
              styles.optionText,
              aiDifficulty === diff && styles.optionTextActive
            ]}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={[styles.aiButton, isLoading && styles.buttonDisabled]}
        onPress={handlePlayAI}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="play" size={24} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Start Game</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'menu' && renderMenu()}
          {mode === 'host' && renderHostForm()}
          {mode === 'join' && renderJoinForm()}
          {mode === 'ai' && renderAIForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  menuContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  logoNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl * 2,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  formContainer: {
    width: '100%',
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  optionLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  difficultyButton: {
    flex: 1,
  },
  optionButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  easyActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '20',
  },
  hardActive: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '20',
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextActive: {
    color: COLORS.textPrimary,
  },
});
