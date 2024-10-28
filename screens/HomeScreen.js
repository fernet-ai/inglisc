import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert, TouchableOpacity, Image, Dimensions } from 'react-native';
import React, { useState } from 'react';
import { Button ,Text,TextInput, useTheme } from 'react-native-paper';
import { createLobby, joinLobby } from '../services/LobbyService';

export default function HomeScreen({ navigation }) {
    
  // Ottieni larghezza e altezza dello schermo
  const { width, height } = Dimensions.get('window');

  const fontSizeVW = width * 0.11;

  const theme = useTheme(); 

  const [lobbyCodeCreate, setLobbyCodeCreate] = useState('');
  const [lobbyCodeJoin, setLobbyCodeJoin] = useState('');
  const [nickname, setNickname] = useState('');



  const handleCreateLobby = () => {
    createLobby(lobbyCodeCreate)
      .then((result) => {
        if (result.status === 'success') {
          Alert.alert('Lobby Creata', result.message);
        } else {
          Alert.alert('Errore', result.message);
        }
      })
      .catch((error) => {
        console.error('Errore durante la creazione della lobby:', error);
        Alert.alert('Errore', 'Impossibile creare la lobby.');
      });
  };

  const handleJoinLobby = () => {
    joinLobby(lobbyCodeJoin, nickname)
      .then((result) => {
        if (result.status === 'success') {
          Alert.alert('Successo', `Unito alla lobby. Utenti: ${result.users.join(', ')}`);
        } else {
          Alert.alert('Errore', result.message);
        }
      })
      .catch((error) => {
        console.error("Errore durante l'unione alla lobby:", error);
        Alert.alert('Errore', 'Impossibile unirsi alla lobby.');
      });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

      <StatusBar style="auto" />

      <Image
          source={require('../assets/cover_letters.png')}
          style={styles.backgroundImage}
          opacity={0.08} 
        />

      <View style={styles.titleContainer}>
        <Text style={{ color: theme.colors.primary, fontSize: fontSizeVW, fontStyle: 'italic' }}>ThE</Text>
        <Text style={[styles.title, {fontSize: fontSizeVW  }]}>🇬🇧 InGliSc 🇬🇧</Text>
        <Text style={{ color: theme.colors.accent, fontSize: fontSizeVW, fontStyle: 'italic' }}>GaMe</Text>
      </View>




      <View style={styles.secondaryContainer}>
        <TouchableOpacity style={styles.iconButtonView}> 
          <Image
            source={require('../assets/book.png')}
            style={styles.image}
          />
           <Text style={{ fontSize: 18  }}>Regolamento</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButtonView}>
        <Image
            source={require('../assets/checklist.png')}
            style={styles.image}
          />
          <Text style={{ fontSize: 18  }}>Memo parole</Text>
        </TouchableOpacity>

      </View>

      
      <View style={styles.primaryContainer}>

          <TextInput
             style={styles.item} 
             mode="outlined"
            label="Inserisci il tuo nickname"
            value={nickname}
            onChangeText={setNickname}
          />


        <Button 
            disabled={!nickname}
            style={[styles.item, {backgroundColor: theme.colors.primary}]} 
            mode="contained" 
            onPress={handleJoinLobby} >
            Start the gheim!
        </Button>

      </View>






    </View>
  );
}

const styles = StyleSheet.create({

  backgroundImage: {
    position: 'absolute', 
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%', 
    height: '100%',
    resizeMode: 'cover', 
  },

  titleContainer: {
    flex: 5,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontWeight: 'bold'
  },


  primaryContainer: {
    flex: 3,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  item: {
    width: '80%',
    margin: '2%',
  },


  secondaryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconButtonView: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: '2%'
  },

  image: {
    width: 60,  
    height: 60, 
    resizeMode: 'contain', 
  },
  

});
