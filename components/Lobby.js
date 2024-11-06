import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Card, Button, Text, Divider, List } from 'react-native-paper';

const Lobby = ({ name }) => {

    const [visible, setVisible] = React.useState(false);


    const handleAccept = () => {
        console.log("Accettato!");
        // Logica aggiuntiva per l'azione "Accetta"
    };

    const handleDecline = () => {
        console.log("Rifiutato!");
        // Logica aggiuntiva per l'azione "Rifiuta"
    };

    const onToggleSnackBar = () => setVisible(!visible);


    return (
        <View style={{ padding: '2%' }}>
            <Card>
                <Card.Title title="Lobby Pazza" subtitle="created by Fernet" />
                <Card.Content>
                    <Text variant="bodyMedium">

                        <List.Item
                            title="First Item"
                        />

                        <List.Item
                            title="Second Item"
                        />


                    </Text>
                </Card.Content>
                <Card.Actions>
                    {/* <Button onPress={handleAccept} disabled='true'> Cancel</Button> */}
                    {/* <Button onPress={handleDecline}>Join</Button> */}
                    <Button onPress={onToggleSnackBar}>{visible ? 'Join' : 'Quit'}</Button>
                    <Button onPress={handleDecline}>Start</Button>
                </Card.Actions>
            </Card>
        </View>
    );
};

export default Lobby;
