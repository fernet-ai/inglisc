# InGliSc — frontend

Gioco Expo React Native/web per tre persone, in italiano. Una persona crea la lobby e condivide il codice; gli altri due entrano con nickname diversi. La partita comprende tre manche e la rivincita nella stessa lobby. Il regolamento completo è disponibile nell'app; la traduzione è responsabilità del paroliere e non sono previste contestazioni o penalità manuali.

## Avvio

Usare Node 22 (almeno 22.13 per le dipendenze Expo installate). Installare le dipendenze con `npm install` in questa directory. Avviare separatamente il backend, seguendo il README nella directory `../inglisc-be`, e poi avviare qui `npm start` o `npm run web`. Non è necessario arrestare servizi già in esecuzione: scegliere porte libere in caso di conflitto.

### Indirizzo del server

`EXPO_PUBLIC_SERVER_URL` ha precedenza su `expo.extra.SERVER_URL` nella configurazione Expo. Deve essere l'origine completa, ad esempio `http://192.168.1.20:3000`, senza percorsi. Impostare la variabile prima di avviare Expo e riavviare Metro dopo averla modificata: Expo incorpora le variabili pubbliche nel bundle. L'URL è pubblico, non inserirvi credenziali.

* Web sul computer del backend: senza configurazione si usa `http://localhost:3000`. Un browser su un altro dispositivo deve invece usare l'IP LAN del computer del backend. Una pagina HTTPS non può normalmente chiamare un backend HTTP per via del mixed content.
* Android fisico / Expo Go: `localhost` indica il telefono, non il computer. Durante lo sviluppo l'app prova a usare l'IP privato LAN dell'host Metro sulla porta 3000; se usa tunnel, host non privato, porta backend diversa o un'altra macchina, impostare esplicitamente `EXPO_PUBLIC_SERVER_URL` all'indirizzo LAN corretto. Collegare dispositivi alla stessa rete e consentire la porta nel firewall. Se l'indirizzo non è rilevabile, l'app chiede di configurarlo, senza usare un server remoto implicito.
* Android emulatore: configurare esplicitamente l'indirizzo raggiungibile dall'emulatore, normalmente `http://10.0.2.2:3000` per il computer host.
* Build distribuite: configurare esplicitamente un'origine HTTPS raggiungibile. Le build Android possono bloccare HTTP non cifrato per le policy di rete; Expo Go in sviluppo non garantisce il comportamento della build standalone.

Il backend conserva tutto in memoria e il riavvio cancella le sessioni. L'app ripristina la sessione con AsyncStorage e aggiorna lo stato ogni due secondi in primo piano; dopo un errore di rete rilegge lo stato senza reinviare automaticamente l'azione. Uscire durante la partita la interrompe per tutti. La rimozione della sola sessione locale non libera il posto sul server. Il memo è locale e non sincronizzato; per provare tre giocatori web usare profili browser separati, non tre schede con lo stesso storage.

Il token è una credenziale: AsyncStorage e lo storage web non sono cifrati, né protetti da altri script dello stesso sito o da chi controlla il dispositivo. Non condividere dispositivi/profili per giocatori diversi. Questo è un prototipo, non adatto a produzione pubblica senza TLS, storage sicuro, limitazione del traffico e altre protezioni lato server.

## Verifiche

`node --test test/api.test.js` esercita il client HTTP frontend contro un'istanza backend temporanea su porta casuale; richiede le dipendenze del backend installate. `npx expo export --platform android --output-dir /tmp/inglisc-export-android --max-workers 1` e `npx expo export --platform web --output-dir /tmp/inglisc-export-web --max-workers 1` verificano i bundle. `npx expo install --check` segnala le versioni non corrispondenti all'SDK. L'export non sostituisce una prova interattiva su tre dispositivi e su Android reale.
