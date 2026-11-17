# InGliSc

> Un piccolo gioco di parole inglesi in compagnia: tre amici, cinque opzioni e una sola risposta da scoprire.

InGliSc è un'app Expo/React Native per Android e Web dedicata a tre giocatori. Una persona crea una lobby privata, condivide il codice e gli amici entrano con nickname diversi. Il creatore sceglie una partita da **3, 6, 9 o 12 manche**; il paroliere ruota e, a ogni manche, i giocatori scelgono, scartano e confermano la loro risposta.

<p align="center">
  <img src="./assets/inglisc-icon.png" alt="Logo InGliSc i." width="180" />
</p>

## Funzionalità

- Lobby privata con codice a 6 caratteri
- 3 giocatori esatti e nickname univoci
- Partite da 3, 6, 9 o 12 manche
- Rotazione del ruolo del paroliere
- Scelta iniziale segreta e scarto della parola sbagliata
- Conferma finale con un solo cambio possibile
- Punteggi, risultati dettagliati e classifica finale
- Rivincita nella stessa lobby
- Memo locale delle parole salvate
- Modalità chiara e scura persistente
- Suoni sintetici opzionali e animazioni leggere
- Compatibilità Android, iOS e Web
- Sessione locale riconnettibile con AsyncStorage

## Come si gioca

1. Il creatore sceglie il numero di manche, inserisce il nickname e crea la lobby.
2. Condivide il codice con altri due giocatori.
3. Al completamento del gruppo, il creatore avvia la partita.
4. Il paroliere scrive un indizio in italiano e cinque opzioni inglesi distinte.
5. Gli altri due selezionano una risposta in segreto.
6. Il paroliere scarta una risposta sbagliata.
7. Ciascun giocatore conferma la propria risposta finale: può mantenerla o cambiarla una volta.

### Punteggi

- Risposta corretta senza cambio: **+3 punti**
- Risposta corretta dopo il cambio: **+1 punto**
- Risposta sbagliata: **0 punti**
- Il paroliere ottiene +3 se nessuno indovina, +1 se uno solo indovina cambiando idea, altrimenti 0.

La traduzione e la correttezza delle sinonimie sono responsabilità del paroliere: il server non valida il significato delle parole.

## Avvio rapido

È necessario utilizzare **Node.js 22** per l'ambiente Expo del progetto.

```bash
# Terminale 1: backend
cd inglisc-be
npm install
npm start

# Terminale 2: app
cd inglisc
npm install
npm start
```

Per aprire direttamente la versione web:

```bash
npm run web
```

Il frontend predefinito cerca il backend su `http://localhost:3000` nel browser. Per testare su telefonini o altri dispositivi, collegali alla stessa rete Wi-Fi del computer e configura l'indirizzo LAN del backend.

## Collegamento al backend

Crea un file `.env` nella cartella `inglisc`:

```env
EXPO_PUBLIC_SERVER_URL=http://192.168.1.53:3000
```

Sostituisci l'IP con quello del PC che esegue il backend, quindi riavvia Expo cancellando la cache:

```bash
npx expo start --clear
```

Su Android fisico, `localhost` significa il telefono e non il computer. Su emulatori Android usa normalmente `http://10.0.2.2:3000`. Per una build distribuita serve un'origine raggiungibile e, preferibilmente, HTTPS.

Ricorda che il backend usa memoria volatile: riavviarlo cancella tutte le lobby attive.

## Script disponibili

```bash
npm start       # Avvia Metro/Expo
npm run web     # Avvia l'app Web
npm run android # Avvia l'app su Android
npm run ios     # Avvia l'app su iOS
npm test        # Solo se configurato nel progetto
```

## Verifiche

Con Node 22:

```bash
node --test test/api.test.js
npx expo install --check
npx expo export --platform web --output-dir /tmp/inglisc-web --max-workers 1
npx expo export --platform android --output-dir /tmp/inglisc-android --max-workers 1
```

I test frontend avviano un backend temporaneo su una porta casuale e verificano lobby, manche personalizzate, risultati e rivincita senza usare servizi esterni.

## Identità visiva

Il logo `i.` viola è condiviso tra l'icona app, il favicon e la splash screen Expo. Gli asset si trovano in `assets/` e vengono configurati in `app.json`.

## Progetto dimostrativo

InGliSc è pensato come gioco locale o su rete privata. Il backend mantiene lobby e sessioni in memoria e non include account, database, chat, matchmaking pubblico o protezioni complete per un deployment pubblico.

Per l'esposizione su Internet servono HTTPS, rate limiting, autenticazione più robusta, storage persistente e policy di sicurezza appropriate.
