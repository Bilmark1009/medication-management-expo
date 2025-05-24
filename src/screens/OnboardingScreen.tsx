import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const slides: Array<{
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  {
    id: '1',
    title: 'Track Your Medications',
    description: 'Never miss a dose with our smart medication tracking system',
    icon: 'medkit-outline',
    color: '#FF0000',
  },
  {
    id: '2',
    title: 'Get Reminders',
    description: 'Receive timely notifications for your medication schedule',
    icon: 'notifications-outline',
    color: '#FF0000',
  },
  {
    id: '3',
    title: 'Stay Organized',
    description: 'Keep all your health information in one secure place',
    icon: 'folder-outline',
    color: '#FF0000',
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const MIN_TIME_PER_SLIDE = 3; // 3 seconds per slide
  const startTimeRef = useRef<number>(Date.now());

  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Handle scroll end with locking mechanism
  const handleScrollEnd = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    
    if (isLocked) {
      // Prevent scrolling if slide is locked
      scrollViewRef.current?.scrollTo({ x: currentSlide * width, animated: true });
      return;
    }

    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex);
      setIsLocked(true);
      setTimeRemaining(MIN_TIME_PER_SLIDE);
      startTimeRef.current = Date.now();
    }
  };

  // Countdown timer for slide locking
  useEffect(() => {
    if (isLocked) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = Math.max(0, MIN_TIME_PER_SLIDE - elapsed);
        
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          setIsLocked(false);
        }
      }, 200); // Update more frequently for smoother countdown
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLocked, currentSlide]);

  // Reset timer when slide changes
  useEffect(() => {
    setIsLocked(true);
    setTimeRemaining(MIN_TIME_PER_SLIDE);
    startTimeRef.current = Date.now();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentSlide]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#000000', '#000000']}
        style={styles.gradient}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          style={styles.slidesContainer}
          scrollEnabled={!isLocked}
        >
          {slides.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              <Animated.View
                style={[
                  styles.slideContent,
                  {
                    opacity: scrollX.interpolate({
                      inputRange: slides.map((_, i) => i * width),
                      outputRange: slides.map(() => 1),
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <View style={[styles.iconContainer, { borderColor: slide.color }]}>
                  <Ionicons name={slide.icon} size={40} color={slide.color} />
                </View>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.swipeHintContainer}>
          {isLocked ? (
            <Text style={styles.loadingText}>
              Please read for {timeRemaining}s...
            </Text>
          ) : currentSlide === 0 ? (
            <Text style={styles.swipeHintText}>Swipe left to explore</Text>
          ) : null}
        </View>

        <View style={styles.progressBarContainer}>
          {currentSlide !== slides.length - 1 &&
            slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressBar,
                  currentSlide === index && styles.activeProgressBar,
                ]}
              />
            ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentSlide === slides.length - 1 && (
            <TouchableOpacity
              style={[styles.getStartedButton, isLocked && styles.disabledButton]}
              onPress={() => !isLocked && navigation.navigate('Register')}
              disabled={isLocked}
            >
              <Text style={styles.getStartedButtonText}>
                {isLocked ? `Please wait ${timeRemaining}s...` : 'Get Started'}
              </Text>
              {!isLocked && <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  slidesContainer: {
    flex: 1,
  },
  slide: {
    width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    backgroundColor: '#121212',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  slideDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  swipeHintContainer: {
    alignItems: 'center',
    marginVertical: 10,
    minHeight: 24,
  },
  swipeHintText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  progressBar: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666666',
    marginHorizontal: 5,
  },
  activeProgressBar: {
    backgroundColor: '#FF0000',
  },
  buttonContainer: {
    padding: 20,
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default OnboardingScreen;
