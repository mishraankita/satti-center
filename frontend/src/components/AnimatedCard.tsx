import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Card } from './Card';
import type { Card as CardType } from '../lib/api';
import { CARD_DIMENSIONS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedCardProps {
  card: CardType;
  index?: number;
  isPlayable?: boolean;
  isMyTurn?: boolean;
  disabled?: boolean;
  small?: boolean;
  onPress?: () => void;
  // Deal animation props
  shouldAnimateDeal?: boolean;
  dealDelay?: number;
}

export interface AnimatedCardRef {
  triggerShake: () => void;
  triggerPlayAnimation: (destX: number, destY: number, onComplete?: () => void) => void;
}

export const AnimatedCard = forwardRef<AnimatedCardRef, AnimatedCardProps>(({
  card,
  index = 0,
  isPlayable = false,
  isMyTurn = false,
  disabled = false,
  small = false,
  onPress,
  shouldAnimateDeal = false,
  dealDelay = 0,
}, ref) => {
  // Animated values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const liftY = useRef(new Animated.Value(0)).current;
  
  // Track if deal animation has run
  const hasAnimatedDeal = useRef(false);
  // Track pulse animation
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Deal animation: start from center, animate to position
  useEffect(() => {
    if (shouldAnimateDeal && !hasAnimatedDeal.current) {
      hasAnimatedDeal.current = true;
      
      // Start from deck position (center of screen, slightly above)
      translateX.setValue(SCREEN_WIDTH / 2 - CARD_DIMENSIONS.width / 2);
      translateY.setValue(-SCREEN_HEIGHT / 2);
      scale.setValue(0.5);
      opacity.setValue(0);
      rotation.setValue((Math.random() - 0.5) * 30);
      
      // Animate to final position with stagger
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            damping: 12,
            stiffness: 100,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            damping: 12,
            stiffness: 100,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            damping: 12,
            stiffness: 100,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(rotation, {
            toValue: 0,
            damping: 12,
            stiffness: 100,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]).start();
      }, dealDelay);
    }
  }, [shouldAnimateDeal, dealDelay]);
  
  // Pulse animation for playable cards
  useEffect(() => {
    if (isPlayable && isMyTurn) {
      // Start pulsing animation
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.current.start();
      
      // Lift card up
      Animated.spring(liftY, {
        toValue: -20,
        damping: 15,
        stiffness: 150,
        mass: 0.5,
        useNativeDriver: true,
      }).start();
    } else {
      // Stop pulsing
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
      Animated.timing(pulseOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Lower card
      Animated.spring(liftY, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        mass: 0.5,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
    };
  }, [isPlayable, isMyTurn]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    // Error shake animation
    triggerShake: () => {
      Animated.sequence([
        Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    },
    
    // Parabolic play animation
    triggerPlayAnimation: (destX: number, destY: number, onComplete?: () => void) => {
      const duration = 400;
      
      Animated.parallel([
        // Animate X position
        Animated.timing(translateX, {
          toValue: destX,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Animate Y with parabolic arc
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: destY - 100,
            duration: duration / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: destY,
            duration: duration / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Scale: grow to 1.2 in middle, shrink to 1.0 at end
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: duration / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.0,
            duration: duration / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Rotation during flight
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: -5,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        // Fade out at end
        Animated.sequence([
          Animated.delay(duration - 100),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    },
  }));
  
  // Interpolate rotation to degrees
  const rotateInterpolate = rotation.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        {
          transform: [
            { translateX },
            { translateY },
            { translateY: liftY },
            { scale },
            { rotate: rotateInterpolate },
          ],
          opacity,
        }
      ]}
    >
      <Animated.View style={[styles.pulseWrapper, { opacity: pulseOpacity }]}>
        <Card
          rank={card.rank}
          suit={card.suit}
          onPress={onPress}
          disabled={disabled}
          small={small}
          isPlayable={isPlayable && isMyTurn}
        />
      </Animated.View>
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

const styles = StyleSheet.create({
  container: {
    // Container for transform animations
  },
  pulseWrapper: {
    // Wrapper for opacity pulse
  },
});

export default AnimatedCard;