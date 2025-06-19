import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { User, Crown, Info, Volume2, VolumeX } from 'lucide-react-native';
import { CampaignMessage } from '../atoms/campaignHistoryAtoms';
import { getCharacterAvatarUrl } from '../utils/avatarStorage';
import DiceRoll from './DiceRoll';
import * as Speech from 'expo-speech';

interface StoryEventItemProps {
  message: CampaignMessage;
}

export default function StoryEventItem({ message }: StoryEventItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        Speech.stop();
      }
    };
  }, [isPlaying]);

  // Generate consistent dice roll based on message ID (for testing)
  const getTestDiceRoll = () => {
    if (message.dice_roll) return message.dice_roll;
    if (message.message_type === 'player') {
      // Use message ID as seed for consistent random number
      const seed = message.id;
      return ((seed * 9301 + 49297) % 233280) % 20 + 1;
    }
    return null;
  };

  const testDiceRoll = getTestDiceRoll();

  const getEventIcon = () => {
    switch (message.message_type) {
      case 'dm':
        return <Crown size={24} color="#FFD700" />;
      case 'player':
        // Show character avatar if available, otherwise default user icon
        if (message.character_avatar && message.character_avatar.trim() !== '') {
          console.log('📸 Showing avatar for character:', message.character_name, message.character_avatar);
          
          // Create a mock character object to use with getCharacterAvatarUrl
          const mockCharacter = {
            avatar: message.character_avatar,
            name: message.character_name,
          };
          
          const avatarSource = getCharacterAvatarUrl(mockCharacter as any);
          
          return (
            <View style={styles.avatarContainer}>
              <Image 
                source={avatarSource} 
                style={styles.characterAvatar}
                onError={(error) => {
                  console.error('Avatar load error:', error);
                  console.log('Failed avatar URL:', message.character_avatar);
                }}
                onLoad={() => console.log('✅ Avatar loaded successfully')}
                onLoadStart={() => console.log('🔄 Avatar loading started')}
                resizeMode="cover"
              />
            </View>
          );
        }
        console.log('👤 No avatar found for character:', message.character_name || 'unknown', 'character_id:', message.character_id);
        return <User size={24} color="#4CAF50" />;
      case 'system':
        return <Info size={24} color="#2196F3" />;
      default:
        return null;
    }
  };

  const getEventStyles = () => {
    switch (message.message_type) {
      case 'dm':
        return {
          container: styles.dmContainer,
          text: styles.dmText,
          header: styles.dmHeader,
        };
      case 'player':
        return {
          container: styles.playerContainer,
          text: styles.playerText,
          header: styles.playerHeader,
        };
      case 'system':
        return {
          container: styles.systemContainer,
          text: styles.systemText,
          header: styles.systemHeader,
        };
      default:
        return {
          container: styles.dmContainer,
          text: styles.dmText,
          header: styles.dmHeader,
        };
    }
  };

  const eventStyles = getEventStyles();

  const handleSpeakerPress = async () => {
    // If already playing, stop the current playback
    if (isPlaying) {
      setIsPlaying(false);
      Speech.stop();
      return;
    }

    try {
      setIsPlaying(true);

      // Use different voice options based on message type
      const options: Speech.SpeechOptions = {
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
      };

      // Adjust voice characteristics based on message type
      if (message.message_type === 'dm') {
        options.pitch = 0.9; // Deeper voice for DM
        options.rate = 0.85; // Slightly slower for DM
      } else if (message.message_type === 'player') {
        options.pitch = 1.1; // Higher pitch for players
        options.rate = 0.95;
      } else if (message.message_type === 'system') {
        options.pitch = 1.0;
        options.rate = 1.0;
      }

      // Start speaking with the specified options
      await Speech.speak(message.message, {
        ...options,
        onDone: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
        onError: (error) => {
          console.error('Speech error:', error);
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing text-to-speech:', error);
      setIsPlaying(false);
    }
  };

  return (
    <View style={[styles.container, eventStyles.container]}>
      <View style={[styles.header, eventStyles.header]}>
        {getEventIcon()}
        <Text style={styles.headerText}>
          {message.message_type === 'dm' ? 'Dungeon Master' : 
           message.message_type === 'player' ? (message.character_name || message.author) : 
           'System'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.speakerButton}
            onPress={handleSpeakerPress}
            activeOpacity={0.7}
          >
            {isPlaying ? (
              <VolumeX size={18} color="#ccc" />
            ) : (
              <Volume2 size={18} color="#ccc" />
            )}
          </TouchableOpacity>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.content, eventStyles.text]}>
          {message.message}
        </Text>
        {testDiceRoll && (
          <View style={styles.diceContainer}>
            <DiceRoll 
              rollResult={testDiceRoll} 
              size={100} 
              isRolling={false} // For now, always show result immediately for testing
              difficulty={message.difficulty || 10}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#4CAF50',
    overflow: 'hidden',
  },
  characterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerButton: {
    padding: 5,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },
  contentContainer: {
    gap: 12,
  },
  content: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  diceContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  // DM styles
  dmContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  dmHeader: {
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  dmText: {
    color: '#1a1a1a',
  },
  // Player styles
  playerContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  playerHeader: {
    borderBottomColor: 'rgba(76, 175, 80, 0.3)',
  },
  playerText: {
    color: '#1a1a1a',
  },
  // System styles
  systemContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  systemHeader: {
    borderBottomColor: 'rgba(33, 150, 243, 0.3)',
  },
  systemText: {
    color: '#1a1a1a',
    fontStyle: 'italic',
  },
});