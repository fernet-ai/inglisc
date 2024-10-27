import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Alert } from 'react-native';
import React, { useState } from 'react';
import { Button, TextInput , useTheme, Icon, MD3Colors } from 'react-native-paper';
import { createLobby, joinLobby } from '../services/LobbyService';

export default function HomeScreen({ navigation }) {
  
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
    <View style={styles.container}>
     <Text style={[styles.title, { color: theme.colors.text }]}>
        🇬🇧 ThE InGliSc GaMe 🇬🇧
      </Text>
      {/* Input per il nickname */}
      <TextInput
        style={styles.inputContainer}
        label="Inserisci il tuo nickname"
        value={nickname}
        onChangeText={setNickname}
      />

      {/* Input + Create Lobby */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          label="Inserisci il codice della lobby"
          value={lobbyCodeCreate}
          onChangeText={setLobbyCodeCreate}
        />
        <Button mode="contained" onPress={handleCreateLobby}>
            Crea
        </Button>
      </View>

      {/* Input + Join Lobby */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          label="Inserisci il codice della lobby"
          value={lobbyCodeJoin}
          onChangeText={setLobbyCodeJoin}
        />
        <Button mode="contained" onPress={handleJoinLobby} >
            Join
        </Button>


        {/* <Icon
          source="format-page-break"
          color={MD3Colors.error50}
          size={20}
        /> */}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    flex: 1,
    marginRight: 10,
  },
});
