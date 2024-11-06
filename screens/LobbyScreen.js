import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, Text, TextInput, useTheme, Avatar, FAB, Dialog, Portal } from 'react-native-paper';
import { createLobby, joinLobby } from '../services/LobbyService';
import Lobby from '../components/Lobby';

export default function LobbyScreen({ route }) {

	const { nickname } = route.params;

	const [lobbyCodeCreate, setLobbyCodeCreate] = useState('');
	const [lobbyCodeJoin, setLobbyCodeJoin] = useState('');
	const theme = useTheme();

	const [visible, setVisible] = React.useState(false);
	const showDialog = () => setVisible(true);
	const hideDialog = () => setVisible(false);


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


			<Portal>
				<Dialog visible={visible} onDismiss={hideDialog}>
					<Dialog.Title>Alert</Dialog.Title>
					<Dialog.Content>
						<Text variant="bodyMedium">This is simple dialog</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={hideDialog}>Done</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			<View style={styles.profileContainer}>
				<TouchableOpacity style={[styles.profileView, { backgroundColor: theme.colors.primary }]} onPress={showDialog} >
					<Avatar.Image size={50} source={require('../assets/customSplash.png')} />
					<Text style={{ color: 'white', fontWeight: "thin" , paddingHorizontal: '2%' }}>
						Player: <Text style={{ color: 'white', fontWeight: "bold", fontStyle: "italic" }}>{nickname}</Text>
					</Text>
				</TouchableOpacity>

			</View>


			<View style={styles.LobbiesContainer}>
				<Text>Benvenuto nella schermata Lobbies!</Text>
				<Lobby name={nickname} />
			</View>


			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => console.log('Pressed')}
			/>
		</View>
	);
}



const styles = StyleSheet.create({

	profileContainer: {
		flex: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},

	profileView: {
		flexDirection: 'row',
		alignItems: "center",
		width: '80%',
		padding: '1%',
		borderRadius: 50,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.32,
		shadowRadius: 5.46,

		elevation: 9
	},

	LobbiesContainer: {
		flex: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'yellow'
	},



})