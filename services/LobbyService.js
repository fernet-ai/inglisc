const SERVER_URL = 'http://192.168.1.105:3000';

// Creazione di una nuova lobby
export const createLobby = (lobbyCode) => {
  return fetch(`${SERVER_URL}/lobby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: lobbyCode }),
  })
    .then((response) => response.json().then((data) => ({ status: response.status, data })))
    .then(({ status, data }) => {
      if (status === 201) {
        return { status: 'success', message: data.message };
      } else {
        return { status: 'error', message: data.message };
      }
    })
    .catch((error) => {
      console.error('Errore durante la creazione della lobby:', error);
      return { status: 'error', message: 'Impossibile creare la lobby.' };
    });
};

// Unisciti ad una lobby esistente
export const joinLobby = (lobbyCode, nickname) => {
  return fetch(`${SERVER_URL}/lobby/${lobbyCode}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname }),
  })
    .then((response) => response.json().then((data) => ({ status: response.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        return { status: 'success', users: data.users };
      } else {
        return { status: 'error', message: data.message };
      }
    })
    .catch((error) => {
      console.error("Errore durante l'unione alla lobby:", error);
      return { status: 'error', message: 'Impossibile unirsi alla lobby.' };
    });
};
