import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackStatus } from 'expo-av';

// Type definitions
type SoundName = 'riffle' | 'tableHit' | 'sevenMagic' | 'passThud' | 'sparkle';

// Volume constants
const SFX_VOLUME = 0.7;

// Local sound assets
const SOUND_ASSETS: Record<SoundName, any> = {
  riffle: require('../../assets/sounds/riffle.mp3'),
  tableHit: require('../../assets/sounds/tableHit.mp3'),
  sevenMagic: require('../../assets/sounds/sevenMagic.mp3'),
  passThud: require('../../assets/sounds/passThuds.mp3'),
  sparkle: require('../../assets/sounds/sparkle.mp3'),
};

class SoundManagerClass {
  private isInitialized: boolean = false;
  private isMuted: boolean = false;
  private loadedSounds: Map<SoundName, Audio.Sound> = new Map();

  /**
   * Initialize audio mode and preload sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure audio mode for iOS - critical settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      console.log('🔊 Audio mode configured (expo-av legacy)');
      
      // Preload key sounds
      await this.preloadSounds();
      
      this.isInitialized = true;
      console.log('🔊 SoundManager ready with audio');
    } catch (error) {
      console.error('SoundManager init failed:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Preload sounds for instant playback
   */
  private async preloadSounds(): Promise<void> {
    const soundsToPreload: SoundName[] = ['tableHit', 'passThud'];
    
    for (const name of soundsToPreload) {
      try {
        console.log(`Preloading: ${name}`);
        const { sound } = await Audio.Sound.createAsync(
          SOUND_ASSETS[name],
          { shouldPlay: false, volume: SFX_VOLUME }
        );
        this.loadedSounds.set(name, sound);
        console.log(`✓ Preloaded: ${name}`);
      } catch (error) {
        console.warn(`✗ Failed to preload ${name}:`, error);
      }
    }
  }

  /**
   * Play a sound
   */
  async playAudio(name: SoundName, volume: number = SFX_VOLUME): Promise<void> {
    if (this.isMuted) return;

    try {
      // Try to use preloaded sound
      const preloaded = this.loadedSounds.get(name);
      if (preloaded) {
        const status = await preloaded.getStatusAsync();
        if (status.isLoaded) {
          await preloaded.setPositionAsync(0);
          await preloaded.setVolumeAsync(volume);
          await preloaded.playAsync();
          console.log(`🔊 Played (preloaded): ${name}`);
          return;
        }
      }

      // Create fresh sound
      console.log(`Creating fresh sound: ${name}`);
      const { sound } = await Audio.Sound.createAsync(
        SOUND_ASSETS[name],
        { shouldPlay: true, volume }
      );
      
      // Auto cleanup
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
      
      console.log(`🔊 Played (fresh): ${name}`);
    } catch (error) {
      console.error(`Audio play failed for ${name}:`, error);
      // Fallback to haptics
      await this.triggerHaptic('medium');
    }
  }

  /**
   * Trigger haptic feedback
   */
  async triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (this.isMuted) return;

    try {
      switch (style) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {}
  }

  /**
   * Play sound + haptic combo
   */
  async playSound(name: SoundName, options?: { volume?: number }): Promise<void> {
    if (this.isMuted) return;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Play audio
    await this.playAudio(name, options?.volume ?? SFX_VOLUME);
    
    // Also haptic for tactile feedback
    await this.triggerHaptic('light');
  }

  // ==================== GAME-SPECIFIC METHODS ====================

  /**
   * THE DEAL: Shuffle sound
   */
  async playDealSequence(cardCount: number = 13): Promise<void> {
    if (this.isMuted) return;
    
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`🔊 Deal sequence: ${cardCount} cards`);

    // Play shuffle sound
    await this.playAudio('riffle', 0.5);
    await this.triggerHaptic('medium');
  }

  /**
   * THE PLAY: Card on table
   */
  async playCardPlace(isSeven: boolean = false): Promise<void> {
    if (this.isMuted) return;
    
    console.log(`🔊 Card place (seven: ${isSeven})`);

    if (isSeven) {
      // Special 7 - magic chime + thud
      await this.playAudio('tableHit', 0.5);
      await this.triggerHaptic('medium');
      await this.delay(100);
      await this.playAudio('sevenMagic', 0.4);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await this.playAudio('tableHit', 0.6);
      await this.triggerHaptic('medium');
    }
  }

  /**
   * Special 7 sound
   */
  async playSpecialSevenSound(): Promise<void> {
    await this.playCardPlace(true);
  }

  /**
   * THE PASS: Soft thud
   */
  async playPassThud(): Promise<void> {
    if (this.isMuted) return;
    
    console.log('🔊 Pass thud');
    await this.playAudio('passThud', 0.4);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * VICTORY: Celebratory sound
   */
  async playVictory(): Promise<void> {
    if (this.isMuted) return;
    
    console.log('🔊 Victory!');
    await this.playAudio('sparkle', 0.7);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await this.delay(200);
    await this.triggerHaptic('heavy');
  }

  // ==================== AMBIENT (placeholder) ====================

  async startAmbient(): Promise<void> {
    console.log('🎵 Ambient music placeholder');
  }

  async stopAmbient(): Promise<void> {}

  async fadeOutAmbient(duration: number = 1000): Promise<void> {
    await this.stopAmbient();
  }

  // ==================== CONTROL ====================

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    console.log(`🔊 Muted: ${muted}`);
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    for (const [name, sound] of this.loadedSounds) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
    this.loadedSounds.clear();
    this.isInitialized = false;
    console.log('🔊 Cleaned up');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
export const SoundManager = new SoundManagerClass();

// ==================== REACT HOOK ====================

import { useEffect, useRef, useCallback } from 'react';

export function useSoundManager() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      SoundManager.initialize();
    }
    
    return () => {
      // Don't cleanup on unmount to preserve sounds across navigation
    };
  }, []);

  const playDeal = useCallback((cardCount?: number) => {
    SoundManager.playDealSequence(cardCount);
  }, []);

  const playCard = useCallback((isSeven?: boolean) => {
    SoundManager.playCardPlace(isSeven);
  }, []);

  const playSpecialSeven = useCallback(() => {
    SoundManager.playSpecialSevenSound();
  }, []);

  const playPass = useCallback(() => {
    SoundManager.playPassThud();
  }, []);

  const playVictory = useCallback(() => {
    SoundManager.playVictory();
  }, []);

  const startAmbient = useCallback(() => {
    SoundManager.startAmbient();
  }, []);

  const stopAmbient = useCallback(() => {
    SoundManager.stopAmbient();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    SoundManager.setMuted(muted);
  }, []);

  return {
    playDeal,
    playCard,
    playSpecialSeven,
    playPass,
    playVictory,
    startAmbient,
    stopAmbient,
    setMuted,
    isMuted: SoundManager.getMuted(),
    isReady: SoundManager.isReady(),
  };
}