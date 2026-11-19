import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import useGame from './services/useGame';
import { attachSoundPlayer, playUiSound, setSoundEnabled as setSoundEffectsEnabled } from './services/soundEffects';
import { applySuggestion, createSuggestionPicker, updateSetupForm, isPromptInDictionary, findDictionaryAnswerIndex } from './services/wordSuggestions';

const LIGHT = { ink: '#202340', muted: '#626681', purple: '#5844C5', primary: '#5844C5', pale: '#EDE9FF', cream: '#F8F6F0', yellow: '#FFDF78', heroAccent: '#FFDF78', green: '#D6F2DE', dictionaryFound: '#EAF6EC', dictionaryFoundBorder: '#C2DEC7', dictionaryMissing: '#FFF7DB', dictionaryMissingBorder: '#E6D58A', coral: '#FFE4DD', coffee: '#D8B18C', coffeeInk: '#38291F', white: '#FFFFFF', border: '#DFDDE8', field: '#FAF9FC', edge: '#EEECF2', divider: '#F0EFF4', subtle: '#F1F0F5', discarded: '#F2F1F3', errorInk: '#7B2D23', placeholder: '#85879A', success: '#39845B', heroTag: '#DAD3FF', heroText: '#F0EDFF' };
const DARK = { ink: '#F4F2FA', muted: '#B9BCD0', purple: '#B9AAFF', primary: '#7060D8', pale: '#302B49', cream: '#171720', yellow: '#2D6664', heroAccent: '#BFE6D8', green: '#203C2D', dictionaryFound: '#24382C', dictionaryFoundBorder: '#3D6248', dictionaryMissing: '#3D3824', dictionaryMissingBorder: '#66582E', coral: '#482A28', coffee: '#D8B18C', coffeeInk: '#38291F', white: '#23232E', border: '#454554', field: '#2D2D39', edge: '#353541', divider: '#393945', subtle: '#33333F', discarded: '#30303A', errorInk: '#FFB7A9', placeholder: '#A8A9B8', success: '#77D69A', heroTag: '#E1DBFF', heroText: '#F5F2FF' };
let C = LIGHT;
let s;

function Button({ title, onPress, disabled, onDisabledPress, kind = 'primary', icon }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 35, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 28, bounciness: 6 }).start();
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled && !onDisabledPress }} disabled={disabled && !onDisabledPress} onPressIn={pressIn} onPressOut={pressOut} onPress={() => { if (disabled) { onDisabledPress?.(); return; } void playUiSound('tap'); onPress?.(); }} style={({ pressed }) => [s.button, kind === 'secondary' && s.buttonSecondary, kind === 'light' && s.buttonLight, disabled && s.disabled, pressed && s.pressed]}>
    {icon && <MaterialCommunityIcons name={icon} size={20} color={kind === 'primary' ? C.white : C.purple} />}
    <Text style={[s.buttonText, kind !== 'primary' && s.buttonAlt]}>{title}</Text>
  </Pressable></Animated.View>;
}
function ScreenEntrance({ children }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(progress, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 18, bounciness: 3 }).start(); }, [progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>{children}</Animated.View>;
}
function Card({ children, style }) { return <View style={[s.card, style]}>{children}</View>; }
function Label({ children }) { return <Text style={s.label}>{children}</Text>; }
function Input({ label, inputStyle, ...props }) { return <View style={s.inputWrap}><Label>{label}</Label><TextInput placeholderTextColor={C.placeholder} {...props} accessibilityLabel={label} style={[s.input, props.editable === false && s.inputLocked, inputStyle]} /></View>; }
function Heading({ eyebrow, title, subtitle }) { return <View style={s.heading}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={s.title}>{title}</Text>{subtitle && <Text style={s.subtitle}>{subtitle}</Text>}</View>; }
function Notice({ children, color = C.pale }) { return <View accessibilityLiveRegion="polite" style={[s.notice, { backgroundColor: color }]}><Text style={s.noticeText}>{children}</Text></View>; }
const RARITY_LEVELS = [
  { value: 'facile', label: 'Comune' },
  { value: 'medio', label: 'Insolita' },
  { value: 'difficile', label: 'Rara' },
];
function RaritySlider({ value, onChange }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, RARITY_LEVELS.findIndex(level => level.value === value));
  const updateFromX = locationX => {
    if (!width) return;
    const progress = Math.max(0, Math.min(1, (locationX - 12) / (width - 24)));
    onChange(RARITY_LEVELS[Math.round(progress * (RARITY_LEVELS.length - 1))].value);
  };
  const updateFromAccessibility = actionName => {
    const nextIndex = Math.max(0, Math.min(RARITY_LEVELS.length - 1, index + (actionName === 'increment' ? 1 : -1)));
    onChange(RARITY_LEVELS[nextIndex].value);
  };
  return <View style={s.rarityPicker}>
    <View style={s.rarityHeading}><Label>Rarità parola</Label><View style={s.rarityValue}><Text style={s.rarityValueText}>{RARITY_LEVELS[index].label}</Text></View></View>
    <View accessibilityRole="adjustable" accessibilityLabel="Rarità parola" accessibilityValue={{ min: 0, max: RARITY_LEVELS.length - 1, now: index, text: RARITY_LEVELS[index].label }} accessibilityActions={[{ name: 'increment', label: 'Aumenta rarità' }, { name: 'decrement', label: 'Diminuisci rarità' }]} onAccessibilityAction={event => updateFromAccessibility(event.nativeEvent.actionName)} onLayout={event => setWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={event => updateFromX(event.nativeEvent.locationX)} onResponderMove={event => updateFromX(event.nativeEvent.locationX)} style={s.raritySlider}>
      <View pointerEvents="none" style={s.rarityRail}>
        <View style={s.rarityTrack} />
        <View style={[s.rarityFill, { width: `${index * 50}%` }]} />
        {RARITY_LEVELS.map((level, stop) => <View key={level.value} style={[s.rarityStop, { left: `${stop * 50}%` }, index >= stop && s.rarityStopActive]} />)}
        <View style={[s.rarityThumb, { left: `${index * 50}%` }]} />
      </View>
    </View>
    <View style={s.rarityLabels}>{RARITY_LEVELS.map((level, stop) => <Text key={level.value} style={[s.rarityLabel, index === stop && s.rarityLabelActive]}>{level.label}</Text>)}</View>
  </View>;
}
const nameOf = (snap, id) => snap.players.find(p => p.id === id)?.nickname || 'Giocatore';
const optionOf = (round, id) => round.options.find(o => o.id === id)?.text || '—';
const nextWordSuggestion = createSuggestionPicker();

function Home({ game, open, onCoffeeThanks }) {
  const nicknameInput = useRef(null);
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [roundCount, setRoundCount] = useState(3);
  const [expandedLobby, setExpandedLobby] = useState(null);
  const offerCoffee = () => {
    const name = nickname.normalize('NFKC').trim();
    onCoffeeThanks(name ? `Grazie ${name}! ❤️` : 'Grazie! ❤️');
    void game.offerCoffee();
  };
  const valid = nickname.normalize('NFKC').trim().length > 0 && nickname.normalize('NFKC').trim().length <= 30;
  const canJoin = valid && code.trim().length === 6 && !game.busy;
  return <View style={s.homeContent}>
    <View style={s.hero}><View style={s.heroTop}><Text style={s.heroTag}>DHE GREITEST GHEIM</Text><Text style={s.heroSpark}>✳</Text></View><Text style={s.heroTitle}>Speak English,{'\n'}play <Text style={{ color: C.heroAccent }}>InGliSc!</Text></Text><Text style={s.heroText}>Tre amici, cinque parole e una sola risposta giusta. Pronti a mettervi alla prova?</Text><View style={s.heroPill}><MaterialCommunityIcons name="account-group-outline" size={17} color={C.ink} /><Text style={s.heroPillText}>3 GIOCATORI  ·  3, 6, 9 O 12 MANCHE</Text></View></View>
    <Card><Heading eyebrow="SI COMINCIA" title="Entra in gioco" subtitle="Scegli un nickname e invita i tuoi amici." />
      <Input ref={nicknameInput} label="Il tuo nickname" placeholder="Come ti chiami?" value={nickname} onChangeText={setNickname} maxLength={30} autoCapitalize="words" />
      <Input label="Codice lobby" placeholder="Es. ABC234" value={code} onChangeText={v => setCode(v.toUpperCase())} maxLength={6} autoCapitalize="characters" />
      <View style={s.lobbyList}><Text style={s.sectionTitle}>Lobby attive</Text>{game.openLobbies.length === 0 ? <Text style={s.helper}>Nessuna lobby attiva.</Text> : game.openLobbies.map(lobby => {
        const expanded = expandedLobby === lobby.code;
        const status = lobby.isInProgress ? 'Partita in corso' : lobby.joinable ? 'In attesa' : 'Completa';
        return <Pressable key={lobby.code} accessibilityRole="button" accessibilityLabel={`Lobby ${lobby.code}, creatore ${lobby.creatorNickname}, ${lobby.roundCount} manche, ${lobby.participantCount} su ${lobby.maxParticipants}, ${status}${lobby.joinable ? '' : ', non selezionabile per l’ingresso'}`} accessibilityState={{ expanded, selected: code === lobby.code }} onPress={() => { if (lobby.joinable) setCode(lobby.code); setExpandedLobby(current => current === lobby.code ? null : lobby.code); }} style={[s.lobbyItem, code === lobby.code && lobby.joinable && s.lobbyItemSelected, !lobby.joinable && s.lobbyItemUnavailable]}>
          <View style={s.lobbyItemTop}><View style={s.lobbyMain}><View style={s.lobbyCodeRow}><Text style={s.lobbyCode}>{lobby.code}</Text><Text style={[s.lobbyStatus, lobby.isInProgress ? s.lobbyStatusPlaying : lobby.joinable ? s.lobbyStatusWaiting : s.lobbyStatusFull]}>{status}</Text></View><Text style={s.lobbyCreator}>Creatore: {lobby.creatorNickname} · {lobby.roundCount} manche</Text></View><View style={s.lobbyCount}><Text style={s.lobbyParticipants}>{lobby.participantCount}/{lobby.maxParticipants}</Text><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} /></View></View>
          {expanded && <View style={s.lobbyDetails}><Text style={s.lobbyDetailsLabel}>Partecipanti</Text><Text style={s.lobbyDetailsNames}>{lobby.participantNames.join(' · ')}</Text>{!lobby.joinable && <Text style={s.lobbyUnavailableText}>Questa lobby non accetta altri giocatori.</Text>}</View>}
        </Pressable>;
      })}</View>
      <Button kind={canJoin ? 'primary' : 'secondary'} title={valid ? 'Entra nella lobby' : 'Inserisci il nickname'} icon="arrow-right" disabled={!canJoin} onDisabledPress={!valid && !game.busy ? () => nicknameInput.current?.focus() : undefined} onPress={() => game.enter(code.trim(), nickname)} />
      <View style={s.divider}><View style={s.line} /><Text style={s.dividerText}>OPPURE CREA LOBBY</Text><View style={s.line} /></View>
      <View style={s.roundPicker}><View><Text style={s.label}>Numero di manche</Text><Text style={s.helper}>Puoi scegliere fino a 12 manche.</Text></View><View style={s.roundOptions}>{[3, 6, 9, 12].map(count => <Pressable key={count} accessibilityRole="radio" accessibilityState={{ checked: roundCount === count }} onPress={() => setRoundCount(count)} style={[s.roundOption, roundCount === count && s.roundOptionSelected]}><Text style={[s.roundOptionText, roundCount === count && s.roundOptionTextSelected]}>{count}</Text></Pressable>)}</View></View>
      <Button title="Crea lobby" icon="plus-circle-outline" disabled={!valid || game.busy} onPress={() => game.enter('', nickname, roundCount)} />
    </Card>
    <View style={s.quickGrid}>
      <View style={s.quickRow}><Pressable accessibilityRole="button" onPress={() => { void playUiSound('tap'); open('rules'); }} style={s.quick}><Text style={s.quickIcon}>✦</Text><Text style={s.quickTitle}>Come si gioca</Text><Text style={s.quickSub}>Le regole, semplici semplici →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { void playUiSound('tap'); open('memo'); }} style={[s.quick, { backgroundColor: C.green }]}><Text style={s.quickIcon}>✏️</Text><Text style={s.quickTitle}>Memo parole</Text><Text style={s.quickSub}>La tua collezione →</Text></Pressable></View>
      <View style={s.quickRow}><View accessibilityLabel="Scrivimi: segnala un bug, suggerimenti, proposte. Work in progress." accessibilityState={{ disabled: true }} style={[s.quick, s.quickDisabled, { backgroundColor: C.coral }]}><View style={s.quickStatusRow}><MaterialCommunityIcons name="bug-outline" size={25} color={C.errorInk} /><Text style={s.quickStatus}>Work in progress 🚧</Text></View><Text style={s.quickTitle}>Scrivimi</Text><Text style={s.quickSub}>Segnala un bug, suggerimenti, proposte</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Offrimi un caffè, ${game.coffeeCount} caffè offerti`} onPress={() => { void playUiSound('tap'); offerCoffee(); }} style={[s.quick, { backgroundColor: C.coffee }]}><Text style={[s.quickIcon, { color: C.coffeeInk }]}>☕</Text><Text style={[s.quickTitle, { color: C.coffeeInk }]}>Offrimi un caffè</Text><Text style={[s.quickSub, { color: C.coffeeInk }]}><Text style={{ fontWeight: '900' }}>{game.coffeeCount}</Text> caffè offerti</Text></Pressable></View>
    </View>
    <Text style={[s.footnote, s.footerSpacing]}>Made with ❤️ by Fernet</Text>
  </View>;
}

function Rules() { return <View style={s.rulesPage}><Heading eyebrow="LE REGOLE" title="Piccola guida, grande gioco." subtitle="Tre giocatori e 3, 6, 9 oppure 12 manche: tutti fanno il paroliere a turno." />
  <View style={s.rulesList}>
    <Card><Text style={s.sectionTitle}>01  Il paroliere prepara</Text><Text style={s.body}>Scrive una parola o indizio in italiano, cinque opzioni inglesi distinte e indica la risposta corretta. Il gioco verifica la coppia parola-traduzione nel dizionario Wiktionary; una coppia non verificata limita a 2 i punti del paroliere se nessuno indovina.</Text></Card>
    <Card><Text style={s.sectionTitle}>02  Si sceglie e si scarta</Text><Text style={s.body}>Gli altri due scelgono in segreto, anche la stessa parola. Quando entrambi hanno scelto, le risposte diventano visibili. Il paroliere scarta una parola sbagliata, anche se scelta.</Text></Card>
    <Card><Text style={s.sectionTitle}>03  Conferma la scelta</Text><Text style={s.body}>Conferma la scelta iniziale oppure cambiala una volta. Se è stata scartata devi cambiarla. La conferma è definitiva.</Text></Card>
    <Card><Text style={s.sectionTitle}>04  Punteggi e vittoria</Text><Text style={s.body}>Ogni giocatore guadagna:</Text><View style={s.scoreHint}>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="check-circle-outline" size={19} color={C.success} /><Text style={s.rulesScoreLabel}>Risposta giusta al primo colpo</Text></View><Text style={[s.rulesScorePoints, s.rulesScorePositive]}>+3</Text></View>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="swap-horizontal-circle-outline" size={19} color={C.purple} /><Text style={s.rulesScoreLabel}>Risposta giusta dopo il cambio</Text></View><Text style={[s.rulesScorePoints, s.rulesScoreNeutral]}>+1</Text></View>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="close-circle-outline" size={19} color={C.errorInk} /><Text style={s.rulesScoreLabel}>Risposta sbagliata</Text></View><Text style={[s.rulesScorePoints, s.rulesScoreZero]}>+0</Text></View>
    </View><Text style={s.body}>Il paroliere guadagna:</Text><View style={s.scoreHint}>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="check-circle-outline" size={19} color={C.success} /><Text style={s.rulesScoreLabel}>Nessuno indovina, coppia nel dizionario</Text></View><Text style={[s.rulesScorePoints, s.rulesScorePositive]}>+3</Text></View>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={C.errorInk} /><Text style={s.rulesScoreLabel}>Nessuno indovina, coppia non verificata</Text></View><Text style={[s.rulesScorePoints, s.rulesScoreNeutral]}>+2</Text></View>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="swap-horizontal-circle-outline" size={19} color={C.purple} /><Text style={s.rulesScoreLabel}>Solo uno indovina cambiando idea</Text></View><Text style={[s.rulesScorePoints, s.rulesScoreNeutral]}>+1</Text></View>
      <View style={s.rulesScoreRow}><View style={s.rulesScoreDescription}><MaterialCommunityIcons name="close-circle-outline" size={19} color={C.errorInk} /><Text style={s.rulesScoreLabel}>Negli altri casi</Text></View><Text style={[s.rulesScorePoints, s.rulesScoreZero]}>+0</Text></View>
    </View><Text style={s.body}>Alla fine delle manche scelte dal creatore vince chi ha più punti: in caso di pareggio, la classifica è condivisa.</Text></Card>
  </View>
</View>; }
function Memo({ game }) { return <View style={s.memoPage}><Heading eyebrow="LA TUA COLLEZIONE" title="Memo parole" subtitle="Le parole salvate dai risultati restano solo su questo dispositivo." /><Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Flashcards. Allenati nel memorizzare le parole salvate. Work in progress." disabled style={[s.flashcardsButton, s.flashcardsDisabled]}><View style={s.flashcardsIconWrap}><MaterialCommunityIcons name="cards-outline" size={26} color={C.white} /></View><View style={s.flashcardsCopy}><Text style={s.flashcardsTitle}>Flashcards</Text><Text style={s.flashcardsSubtitle}>Allenati nel memorizzare le parole salvate</Text><Text style={s.flashcardsStatus}>Work in progress 🚧</Text></View><MaterialCommunityIcons name="arrow-right" size={22} color={C.purple} /></Pressable>{game.memo.length === 0 ? <Card><Text style={s.sectionTitle}>Ancora tutto da scrivere ✨</Text><Text style={s.body}>Alla fine di una manche puoi salvare la parola e la sua traduzione qui.</Text></Card> : game.memo.map((w, i) => <Card key={`${w.prompt}-${w.text}-${i}`}><View style={s.rowBetween}><View style={{ flex: 1 }}><Text style={s.word}>{w.prompt}</Text><Text style={s.body}>{w.text}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Elimina ${w.prompt} dal memo`} onPress={() => game.removeWord(i)} style={s.iconButton}><MaterialCommunityIcons name="trash-can-outline" size={24} color={C.purple} /></Pressable></View></Card>)}</View>; }

function Setup({ game, snap }) {
  const [form, setForm] = useState({ prompt: '', options: ['', '', '', '', ''], correct: null, suggested: null });
  const [replaceConfirmation, setReplaceConfirmation] = useState(false);
  const [difficulty, setDifficulty] = useState('facile');
  const { prompt, options, correct, suggested } = form;
  const promptHasText = Boolean(prompt.normalize('NFKC').trim());
  const promptInDictionary = Boolean(suggested) || (promptHasText && isPromptInDictionary(prompt));
  const dictionaryCorrectIndex = suggested ? suggested.index : findDictionaryAnswerIndex(prompt, options);
  const selectedCorrect = dictionaryCorrectIndex ?? correct;
  const promptInputStyle = promptHasText ? {
    backgroundColor: promptInDictionary ? C.dictionaryFound : C.dictionaryMissing,
    borderColor: promptInDictionary ? C.dictionaryFoundBorder : C.dictionaryMissingBorder,
  } : null;
  const updateForm = changes => { setForm(old => updateSetupForm(old, changes)); setReplaceConfirmation(false); };
  const suggest = () => {
    const result = applySuggestion(form, nextWordSuggestion(difficulty));
    setForm(result.form);
    setReplaceConfirmation(false);
  };
  const generateSuggestion = () => {
    const hasExistingContent = prompt.trim() || options.some(option => option.trim());
    if (!suggested && hasExistingContent) setReplaceConfirmation(true);
    else suggest();
  };
  const normalized = options.map(v => v.normalize('NFKC').trim());
  const duplicateIndexes = normalized.flatMap((value, index) => value && normalized.some((other, otherIndex) => otherIndex !== index && other.toLowerCase() === value.toLowerCase()) ? [index] : []);
  const valid = prompt.normalize('NFKC').trim().length > 0 && normalized.every(Boolean) && duplicateIndexes.length === 0 && selectedCorrect !== null;
  return <Card><Heading eyebrow="TOCCA A TE" title="Prepara la manche" subtitle="Scrivi un indizio in italiano e cinque opzioni inglesi diverse. Seleziona quella giusta: resterà segreta." />
    <View style={s.suggestionPanel}><RaritySlider value={difficulty} onChange={setDifficulty} /><View style={s.suggestionButton}><Button kind="secondary" title="Genera suggerimento" icon="creation" onPress={generateSuggestion} /></View></View>
    <Text style={s.helper}>Il suggerimento genera la parola e tutte e cinque le opzioni. Passa alla compilazione manuale per modificarle.</Text>
    <Text style={s.helper}>Dati da Wiktionary tramite Kaikki.org/Wiktextract, licenza CC BY-SA 4.0.</Text>
    {replaceConfirmation && <><Notice color={C.coral}>La nuova generazione sostituirà la parola e le opzioni già compilate.</Notice><View style={{ gap: 6 }}><Button kind="light" title="Mantieni la compilazione" icon="close" onPress={() => setReplaceConfirmation(false)} /><Button title="Sostituisci e genera" icon="creation" onPress={suggest} /></View></>}
    {suggested && <><Text style={s.helper}>Parola e opzioni generate sono bloccate. Passa alla compilazione manuale per rivederle e modificarle.</Text>{suggested.synonyms.length > 0 && <Text style={s.helper}>Possibili sinonimi: {suggested.synonyms.join(', ')}. Verifica che il significato sia adatto.</Text>}<Button kind="light" title="Passa alla compilazione manuale" icon="pencil-outline" onPress={() => { setForm(old => ({ ...old, suggested: null })); setReplaceConfirmation(false); }} /></>}
    <Input label="Parola o indizio italiano" placeholder="Es. gatto" value={prompt} editable={!suggested} onChangeText={v => updateForm({ prompt: v })} maxLength={120} inputStyle={promptInputStyle} accessibilityHint={!promptHasText ? undefined : promptInDictionary ? 'Parola presente nel dizionario Wiktionary.' : 'Parola non trovata nel dizionario Wiktionary.'} />
    {promptHasText && <Text style={s.helper}>{promptInDictionary ? 'Presente nel dizionario Wiktionary.' : 'Non trovata nel dizionario Wiktionary.'}</Text>}
    {promptHasText && dictionaryCorrectIndex === null && <Notice color={C.dictionaryMissing}>Parola e traduzione corretta non sono entrambe verificate nel dizionario. Se nessuno indovina, il paroliere otterrà al massimo 2 punti.</Notice>}
    {options.map((value, i) => {
      const dictionaryCorrect = dictionaryCorrectIndex === i;
      const lockedCorrect = dictionaryCorrect || suggested?.index === i;
      const optionInputStyle = lockedCorrect ? { backgroundColor: C.dictionaryFound, borderColor: C.dictionaryFoundBorder } : null;
      return <View key={i} style={s.setupRow}><View style={{ flex: 1 }}><Input label={`Opzione ${i + 1}${suggested?.index === i ? ' · corretta (bloccata)' : dictionaryCorrect ? ' · corretta dal dizionario (bloccata)' : ''}${duplicateIndexes.includes(i) ? ' · duplicata' : ''}`} placeholder="Parola inglese" value={value} editable={!suggested} onChangeText={v => updateForm({ options: options.map((x, n) => n === i ? v : x) })} inputStyle={optionInputStyle} /></View><Pressable accessibilityRole="radio" accessibilityLabel={`Opzione ${i + 1} corretta`} accessibilityState={{ checked: selectedCorrect === i, disabled: !!suggested || dictionaryCorrectIndex !== null }} disabled={!!suggested || dictionaryCorrectIndex !== null} onPress={() => updateForm({ correct: i })} style={[s.radio, selectedCorrect === i && s.radioOn]}><MaterialCommunityIcons name={selectedCorrect === i ? 'check' : 'check-outline'} size={21} color={selectedCorrect === i ? 'white' : C.muted} /></Pressable></View>;
    })}
    {duplicateIndexes.length > 0 && <Notice color={C.coral}>Le opzioni {duplicateIndexes.map(index => index + 1).join(', ')} sono uguali. Inserisci parole diverse per continuare.</Notice>}
    <Text style={s.helper}>{suggested || dictionaryCorrectIndex !== null ? '✓ La risposta corretta è selezionata automaticamente e bloccata.' : '✓ Indica la risposta corretta. Il server non verifica le traduzioni.'}</Text><Button title="Procedi" icon="arrow-right" disabled={!valid || game.busy} onPress={() => game.action('setup', { prompt, options, correctIndex: selectedCorrect })} />
  </Card>;
}

function Choices({ game, snap }) {
  const r = snap.round, master = r.wordmasterId === snap.me;
  const [selected, setSelected] = useState(null);
  const initial = r.initialChoices.find(c => c.playerId === snap.me)?.optionId;
  const done = r.initialSubmittedPlayerIds.includes(snap.me);
  const finalDone = r.finalConfirmedPlayerIds.includes(snap.me);
  const phase = snap.phase;
  const known = r.id && game.secret?.code === snap.code && game.secret?.playerId === snap.me && game.secret?.roundId === r.id && game.secret?.prompt === r.prompt ? game.secret.text : null;
  const selectedFinal = selected || (initial !== r.discardedOptionId ? initial : null);
  const selection = phase === 'final-choices' ? selectedFinal : selected;
  const canChoose = (phase === 'initial-choices' && !master && !done) || (phase === 'discard' && master) || (phase === 'final-choices' && !master && !finalDone);
  let title = '', subtitle = '';
  if (phase === 'initial-choices') { title = master ? 'Le scelte sono in corso' : done ? 'Scelta inviata!' : 'Qual è la parola giusta?'; subtitle = master || done ? 'Aspettiamo che entrambi i giocatori scelgano.' : 'Scegli una risposta. Sarà visibile quando entrambi avranno scelto.'; }
  if (phase === 'discard') { title = master ? 'Scarta una parola' : 'Il paroliere sta scegliendo'; subtitle = master ? 'Elimina una parola sbagliata, anche se è stata scelta.' : 'Le scelte sono visibili. Aspetta lo scarto del paroliere.'; }
  if (phase === 'final-choices') { title = master ? 'Conferma finale' : finalDone ? 'Scelta confermata!' : 'Conferma la tua risposta'; subtitle = master || finalDone ? 'Aspettiamo le conferme dei giocatori.' : initial === r.discardedOptionId ? 'La tua prima scelta è stata scartata: devi cambiarla.' : 'Mantieni la tua scelta o cambiala una volta. La conferma è definitiva.'; }
  return <Card><Heading eyebrow={`MANCHE ${r.number} / ${snap.roundCount || snap.totalRounds || 3}`} title={title} subtitle={subtitle} /><View style={s.prompt}><Text style={s.promptLabel}>LA PAROLA ITALIANA</Text><Text style={s.promptText}>{r.prompt}</Text></View>
    {r.options.map((o, i) => {
      const discarded = o.id === r.discardedOptionId;
      const isCorrectKnown = master && known && o.text === known;
      const locked = !canChoose || discarded || (phase === 'discard' && isCorrectKnown);
      const chosenBy = r.initialChoices.filter(c => c.optionId === o.id).map(c => nameOf(snap, c.playerId));
      return <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: selection === o.id, disabled: !!locked }} disabled={!!locked} onPress={() => { setSelected(o.id); void playUiSound('tap'); }} style={[s.option, selection === o.id && s.optionSelected, discarded && s.optionDiscarded]}><View style={s.optionLetter}><Text style={s.optionLetterText}>{String.fromCharCode(65 + i)}</Text></View><View style={{ flex: 1 }}><Text style={[s.optionText, discarded && s.strike]}>{o.text}</Text>{chosenBy.length > 0 && <Text style={s.optionMeta}>Scelta iniziale: {chosenBy.join(', ')}</Text>}{discarded && <Text style={s.optionMeta}>Scartata</Text>}{isCorrectKnown && <Text style={s.optionMeta}>La tua risposta corretta</Text>}</View>{selection === o.id && <MaterialCommunityIcons name="check-circle" size={22} color={C.purple} />}</Pressable>;
    })}
    {phase === 'discard' && master && !known && <Notice color={C.yellow}>La soluzione non è disponibile su questo dispositivo. Ricorda quale hai indicato: il server impedirà di scartarla.</Notice>}
    {phase === 'initial-choices' && !master && !done && <Button title="Invia la scelta" disabled={!selection || game.busy} onPress={() => game.action('initial-choice', { optionId: selection })} />}
    {phase === 'discard' && master && <Button title="Scarta questa parola" icon="close-circle-outline" disabled={!selection || game.busy} onPress={() => game.action('discard', { optionId: selection })} />}
    {phase === 'final-choices' && !master && !finalDone && <Button title="Conferma scelta" icon="check-circle-outline" disabled={!selection || selection === r.discardedOptionId || game.busy} onPress={() => game.action('confirm', { optionId: selection })} />}
    {((phase === 'initial-choices' && (master || done)) || (phase === 'discard' && !master) || (phase === 'final-choices' && (master || finalDone))) && <Notice>In attesa degli altri giocatori…</Notice>}
  </Card>;
}

function RoundResult({ game, snap }) {
  const r = snap.round.result;
  if (!r) return <Notice>Caricamento risultato…</Notice>;
  const correct = optionOf(r, r.correctOptionId);
  const saved = game.memo.some(w => w.prompt === r.prompt && w.text === correct);
  return <><Card><Heading eyebrow={`MANCHE ${r.number} COMPLETATA`} title="La risposta era…" subtitle="Ecco come sono andate le scelte." /><View style={[s.prompt, { backgroundColor: C.green }]}><Text style={s.promptLabel}>{r.prompt}</Text><Text style={s.promptText}>{correct} ✨</Text></View>
    {r.guesses.map(g => <View key={g.playerId} style={s.resultRow}><View style={{ flex: 1 }}><Text style={s.playerName}>{nameOf(snap, g.playerId)}</Text><Text style={s.body}>{optionOf(r, g.initialOptionId)} → {optionOf(r, g.finalOptionId)} · {g.changed ? 'cambiata' : 'invariata'} · {g.correct ? 'corretta' : 'errata'}</Text></View><Text style={s.points}>+{g.points}</Text></View>)}
    <View style={s.resultRow}><Text style={[s.playerName, { flex: 1 }]}>{nameOf(snap, r.wordmasterId)} · paroliere</Text><Text style={s.points}>+{r.wordmasterPoints}</Text></View>
    <Button kind="secondary" icon="bookmark-outline" title={saved ? 'Salvata nel memo' : 'Salva nel memo'} disabled={saved} onPress={() => game.saveWord(r)} />
  </Card><Scoreboard snap={snap} /><Card>{snap.hostId === snap.me ? <Button title={r.number === (snap.roundCount || snap.totalRounds || 3) ? 'Mostra la classifica' : 'Prossima manche'} icon="arrow-right" disabled={game.busy} onPress={() => game.action('advance')} /> : <Notice>Il creatore farà avanzare la partita.</Notice>}</Card></>;
}
function Scoreboard({ snap }) { return <Card><Text style={s.sectionTitle}>Punteggi</Text>{snap.players.map(p => <View key={p.id} style={s.scoreRow}><Text style={s.playerName}>{p.nickname}{p.id === snap.me ? ' (tu)' : ''}</Text><Text style={s.score}>{p.score} pt</Text></View>)}</Card>; }
function Waiting({ game, snap }) {
  const [copied, setCopied] = useState(false);
  return <><Card><Heading eyebrow="LA TUA LOBBY" title="Raduna la squadra" subtitle={`${snap.roundCount || snap.totalRounds || 3} manche · Condividi il codice: si parte quando siete in tre.`} /><View style={s.codeBox}><View><Text style={s.promptLabel}>CODICE LOBBY</Text><Text selectable style={s.code}>{snap.code}</Text></View><Button kind="secondary" icon="content-copy" title={copied ? 'Copiato' : 'Copia'} onPress={async () => { try { await Clipboard.setStringAsync(snap.code); setCopied(true); } catch { game.setError('Copia non disponibile: seleziona il codice manualmente.'); } }} /></View></Card>
    <Card><View style={s.rowBetween}><Text style={s.sectionTitle}>La squadra</Text><Text style={s.count}>{snap.players.length} / 3</Text></View>{[0, 1, 2].map(i => { const p = snap.players[i]; return <View key={i} style={s.playerRow}><View style={[s.avatar, !p && { backgroundColor: C.divider }]}><Text style={s.avatarText}>{p ? p.nickname.slice(0, 1).toUpperCase() : '+'}</Text></View><View style={{ flex: 1 }}><Text style={s.playerName}>{p ? p.nickname : 'Posto libero'}</Text><Text style={s.helper}>{p ? `${p.id === snap.hostId ? 'Creatore' : 'Giocatore'}${p.id === snap.me ? ' · tu' : ''}` : 'In attesa di un amico'}</Text></View>{p && <MaterialCommunityIcons name="check-circle" size={21} color={C.success} />}</View>; })}
    {snap.hostId === snap.me ? <Button title="Inizia la partita" icon="play" disabled={snap.players.length !== 3 || game.busy} onPress={() => game.action('start')} /> : <Notice>Il creatore avvierà la partita quando sarete in tre.</Notice>}</Card>
    {snap.lastEvent?.type === 'game_aborted' && <Notice color={C.yellow}>{snap.lastEvent.nickname} è uscito: partita interrotta e punteggi azzerati.</Notice>}
  </>;
}
function GameResult({ game, snap }) { return <><Card><Heading eyebrow="PARTITA COMPLETATA" title="La classifica! 🏆" subtitle={`${snap.roundCount || snap.totalRounds || 3} manche, tante parole. Ecco il podio.`} />{(snap.ranking || []).map(p => <View key={p.playerId} style={s.rankRow}><Text style={s.rank}>#{p.rank}</Text><Text style={[s.playerName, { flex: 1 }]}>{nameOf(snap, p.playerId)}{p.playerId === snap.me ? ' (tu)' : ''}</Text><Text style={s.score}>{p.score} pt</Text></View>)}{snap.ranking && new Set(snap.ranking.map(p => p.rank)).size < snap.ranking.length && <Text style={s.helper}>A pari punti corrisponde la stessa posizione.</Text>}</Card>
  <Card><Text style={s.sectionTitle}>Parole della partita</Text>{snap.results.map(r => <View key={r.number} style={s.resultRow}><View style={{ flex: 1 }}><Text style={s.playerName}>{r.prompt} → {optionOf(r, r.correctOptionId)}</Text><Text style={s.helper}>Manche {r.number}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Salva ${r.prompt} nel memo`} onPress={() => game.saveWord(r)} style={s.iconButton}><MaterialCommunityIcons name={game.memo.some(w => w.prompt === r.prompt && w.text === optionOf(r, r.correctOptionId)) ? 'bookmark-check' : 'bookmark-plus-outline'} size={24} color={C.purple} /></Pressable></View>)}</Card>
  <Card>{snap.hostId === snap.me ? <Button title="Giochiamo ancora" icon="refresh" disabled={game.busy} onPress={() => game.action('rematch')} /> : <Notice>Il creatore può iniziare una rivincita nella stessa lobby.</Notice>}</Card></>; }

function Game({ game }) {
  const snap = game.snapshot;
  if (!snap) return <Card><ActivityIndicator color={C.purple} /><Text style={[s.body, { textAlign: 'center', marginTop: 12 }]}>Riconnessione alla lobby…</Text><Button kind="secondary" title="Riprova" onPress={game.refresh} /><Button kind="light" title="Rimuovi sessione locale" onPress={() => game.forget('Sessione rimossa da questo dispositivo. Il posto nella lobby potrebbe rimanere occupato fino alla scadenza.')} /></Card>;
  if (snap.phase === 'waiting') return <Waiting game={game} snap={snap} />;
  if (snap.phase === 'game-result') return <GameResult game={game} snap={snap} />;
  if (!snap.round) return <Notice>Aggiornamento della manche in corso…</Notice>;
  if (snap.phase === 'setup') return snap.round.wordmasterId === snap.me ? <Setup key={snap.round.id} game={game} snap={snap} /> : <Card><Heading eyebrow={`MANCHE ${snap.round.number} / ${snap.roundCount || snap.totalRounds || 3}`} title="Si prepara la sfida" subtitle={`${nameOf(snap, snap.round.wordmasterId)} sta preparando le parole.`} /><Notice>Un momento, il paroliere è all’opera…</Notice></Card>;
  if (snap.phase === 'round-result') return <RoundResult game={game} snap={snap} />;
  if (['initial-choices', 'discard', 'final-choices'].includes(snap.phase)) return <Choices key={`${snap.round.id}-${snap.phase}`} game={game} snap={snap} />;
  return <Notice>Stato della partita non riconosciuto. Riprova ad aggiornare.</Notice>;
}

function AppContent({ onCoffeeThanks }) {
  const game = useGame();
  const { width: windowWidth } = useWindowDimensions();
  const compactHeader = windowWidth < 430;
  const audioPlayer = useAudioPlayer(null);
  const [page, setPage] = useState('home');
  const [exit, setExit] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const lastSoundEvent = useRef(null);
  useEffect(() => { void attachSoundPlayer(audioPlayer); }, [audioPlayer]);
  useEffect(() => {
    AsyncStorage.getItem('inglisc:dark-mode').then(value => {
      const savedDarkMode = value === 'true';
      C = savedDarkMode ? DARK : LIGHT;
      s = buildStyles();
      setDarkMode(savedDarkMode);
      setThemeReady(true);
    }).catch(() => {
      C = LIGHT;
      s = buildStyles();
      setThemeReady(true);
    });
  }, []);
  useEffect(() => { if (!game.session) setExit(false); }, [game.session]);
  const activePage = game.session && page === 'home' ? 'game' : page;
  const snapshot = game.snapshot;
  const screenKey = `${activePage}:${activePage === 'game' ? `${snapshot?.phase || 'loading'}:${snapshot?.round?.id || ''}` : ''}`;
  useEffect(() => {
    if (!snapshot) return;
    const eventKey = `${snapshot.code}:${snapshot.phase}:${snapshot.round?.id || ''}`;
    if (lastSoundEvent.current === null) { lastSoundEvent.current = eventKey; return; }
    if (eventKey === lastSoundEvent.current) return;
    lastSoundEvent.current = eventKey;
    if (snapshot.phase === 'round-result') void playUiSound('success');
    else if (snapshot.phase === 'game-result') void playUiSound('reveal');
  }, [snapshot]);
  const back = () => { if (exit) setExit(false); else if (activePage === 'game') setExit(true); else if (page !== 'home') setPage('home'); else return false; return true; };
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', back); return () => sub.remove(); });
  return <SafeAreaView style={s.safe}><StatusBar style={darkMode ? 'light' : 'dark'} /><Modal transparent visible={game.serverWaking} animationType="fade" statusBarTranslucent onRequestClose={() => {}}><View style={s.wakeBackdrop}><View accessibilityRole="progressbar" accessibilityLabel="Attendo la connessione al server" style={s.wakeSpinner}><ActivityIndicator size="large" color={C.purple} /></View></View></Modal><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.container}>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel={activePage === 'home' ? 'InGliSc home' : 'Indietro'} onPress={back} style={s.brand}><View style={s.brandMark}><Text style={s.brandMarkText}>i.</Text></View>{!compactHeader && <Text style={s.brandText}>InGliSc<Text style={{ color: C.purple }}>!</Text></Text>}</Pressable><View style={[s.navRight, compactHeader && s.navRightCompact]}><View accessibilityLabel={`${game.activeUsers} utenti attivi`} style={[s.activeBadge, compactHeader && s.activeBadgeCompact]}><View style={s.onlineDot} /><Text style={s.activeText}>{game.activeUsers}</Text></View><Pressable accessibilityRole="switch" accessibilityLabel={soundEnabled ? 'Disattiva suoni' : 'Attiva suoni'} accessibilityState={{ checked: soundEnabled }} onPress={() => { const next = !soundEnabled; setSoundEnabled(next); setSoundEffectsEnabled(next); if (next) void playUiSound('tap'); }} style={[s.navButton, compactHeader && s.navButtonCompact]}><MaterialCommunityIcons name={soundEnabled ? 'volume-high' : 'volume-off'} size={21} color={C.purple} /></Pressable><Pressable accessibilityRole="switch" accessibilityLabel={darkMode ? 'Attiva modalità chiara' : 'Attiva modalità scura'} accessibilityState={{ checked: darkMode }} disabled={!themeReady} onPress={() => { const next = !darkMode; C = next ? DARK : LIGHT; s = buildStyles(); setDarkMode(next); AsyncStorage.setItem('inglisc:dark-mode', String(next)).catch(() => {}); void playUiSound('tap'); }} style={[s.navButton, compactHeader && s.navButtonCompact, !themeReady && s.disabled]}><MaterialCommunityIcons name={darkMode ? 'white-balance-sunny' : 'weather-night'} size={21} color={C.purple} /></Pressable>{activePage === 'game' && <Pressable accessibilityRole="button" accessibilityLabel="Memo parole" onPress={() => { void playUiSound('tap'); setPage('memo'); }} style={[s.navButton, compactHeader && s.navButtonCompact]}><MaterialCommunityIcons name="bookmark-outline" size={20} color={C.purple} />{!compactHeader && <Text style={s.navText}>Memo</Text>}</Pressable>}{activePage !== 'home' && <Pressable accessibilityRole="button" accessibilityLabel={activePage === 'game' ? 'Esci dalla lobby' : 'Indietro'} onPress={back} style={[s.navButton, compactHeader && s.navButtonCompact]}><MaterialCommunityIcons name={activePage === 'game' ? 'exit-to-app' : 'arrow-left'} size={20} color={C.purple} />{!compactHeader && <Text style={s.navText}>{activePage === 'game' ? 'Esci' : 'Indietro'}</Text>}</Pressable>}</View></View>
    {!!game.error && <View style={s.error}><Text accessibilityLiveRegion="polite" style={s.errorText}>{game.error}</Text>{game.session && <Pressable accessibilityRole="button" onPress={game.refresh}><Text style={s.errorLink}>Riprova aggiornamento</Text></Pressable>}</View>}
    {exit && game.session && <Card style={{ backgroundColor: C.coral }}><Text style={s.sectionTitle}>Vuoi uscire dalla lobby?</Text><Text style={s.body}>Durante una partita l’uscita interrompe il gioco per tutti e azzera i punteggi. Se la rete non funziona, puoi rimuovere solo la sessione locale, ma il posto rimarrà occupato fino alla scadenza.</Text><Button title="Sì, esci dalla lobby" disabled={game.busy} onPress={async () => { if (await game.action('leave')) { setExit(false); setPage('home'); } }} /><Button kind="secondary" title="Resta qui" onPress={() => setExit(false)} /><Button kind="light" title="Rimuovi solo sessione locale" onPress={() => { game.forget('Sessione locale rimossa. Il posto può rimanere occupato fino alla scadenza.'); setExit(false); setPage('home'); }} /></Card>}
    {!game.ready || !themeReady ? <ActivityIndicator size="large" color={C.purple} /> : <ScreenEntrance key={screenKey}>{activePage === 'home' ? <Home game={game} open={setPage} onCoffeeThanks={onCoffeeThanks} /> : activePage === 'rules' ? <Rules /> : activePage === 'memo' ? <Memo game={game} /> : <Game game={game} />}</ScreenEntrance>}
    <View style={{ height: 28 }} />
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function CoffeeToast({ message }) {
  return <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.coffeeToast}><MaterialCommunityIcons name="coffee" size={20} color={C.coffee} /><Text style={s.coffeeToastText}>{message}</Text></View>;
}

export default function App() {
  const [coffeeToast, setCoffeeToast] = useState('');
  const coffeeToastTimer = useRef(null);
  useEffect(() => () => clearTimeout(coffeeToastTimer.current), []);
  const showCoffeeToast = message => {
    clearTimeout(coffeeToastTimer.current);
    setCoffeeToast(message);
    coffeeToastTimer.current = setTimeout(() => setCoffeeToast(''), 3000);
  };
  return <SafeAreaProvider style={{ flex: 1 }}><AppContent onCoffeeThanks={showCoffeeToast} />{coffeeToast ? <CoffeeToast message={coffeeToast} /> : null}</SafeAreaProvider>;
}

function buildStyles() {
  return StyleSheet.create({
    coffeeToast: { position: 'absolute', bottom: 24, left: 16, right: 16, alignSelf: 'center', maxWidth: 480, minHeight: 54, borderRadius: 16, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, elevation: 10, shadowColor: '#000000', shadowOpacity: .2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, zIndex: 100 }, coffeeToastText: { color: C.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
    safe: { flex: 1, backgroundColor: C.cream }, wakeBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }, wakeSpinner: { width: 68, height: 68, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.edge, alignItems: 'center', justifyContent: 'center' }, container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
    nav: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: 'white', fontSize: 24, fontWeight: '900' }, brandText: { fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: -1 }, navRight: { flexDirection: 'row', gap: 4, alignItems: 'center' }, navRightCompact: { gap: 0 }, navButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 }, navButtonCompact: { minWidth: 40, paddingHorizontal: 4 }, navText: { color: C.purple, fontWeight: '700' }, activeBadge: { height: 32, minWidth: 48, borderRadius: 16, backgroundColor: C.pale, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 9 }, activeBadgeCompact: { height: 30, minWidth: 42, paddingHorizontal: 7 }, onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success }, activeText: { color: C.ink, fontSize: 13, fontWeight: '900' },
    homeContent: { gap: 16 }, memoPage: { gap: 16 }, hero: { backgroundColor: C.primary, borderRadius: 28, padding: 26, gap: 14 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroTag: { color: C.heroTag, fontSize: 11, letterSpacing: 1.8, fontWeight: '900' }, heroSpark: { color: C.heroAccent, fontSize: 30 }, heroTitle: { color: 'white', fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1.5 }, heroText: { color: C.heroText, fontSize: 16, lineHeight: 24 }, heroPill: { alignSelf: 'flex-start', backgroundColor: C.yellow, borderRadius: 30, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }, heroPillText: { color: C.ink, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
    card: { backgroundColor: C.white, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: C.edge }, heading: { gap: 7 }, eyebrow: { color: C.purple, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, title: { color: C.ink, fontWeight: '900', fontSize: 27, lineHeight: 33, letterSpacing: -.7 }, subtitle: { color: C.muted, fontSize: 15, lineHeight: 22 }, body: { color: C.muted, fontSize: 15, lineHeight: 22 }, sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '800' },
    button: { minHeight: 50, borderRadius: 14, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }, buttonSecondary: { backgroundColor: C.pale }, buttonLight: { backgroundColor: 'transparent' }, buttonText: { color: 'white', fontWeight: '800', textAlign: 'center', fontSize: 15 }, buttonAlt: { color: C.purple }, disabled: { opacity: .43 }, pressed: { opacity: .75 },
    inputWrap: { gap: 7 }, label: { fontSize: 13, fontWeight: '800', color: C.ink }, input: { backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 13, color: C.ink, fontSize: 16, minHeight: 50, paddingHorizontal: 14, paddingVertical: 10 }, inputLocked: { backgroundColor: C.pale, borderColor: C.purple }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10 }, line: { height: 1, backgroundColor: C.border, flex: 1 }, dividerText: { color: C.muted, fontSize: 10, letterSpacing: 1, fontWeight: '800' },
    quickGrid: { gap: 8 }, quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, quick: { flexGrow: 1, flexBasis: 140, backgroundColor: C.yellow, borderRadius: 22, padding: 20, minHeight: 130, justifyContent: 'space-between' }, quickDisabled: { opacity: .9 }, quickCentered: { justifyContent: 'center', gap: 14 }, quickIcon: { fontSize: 25, color: C.ink }, quickTitle: { fontSize: 16, fontWeight: '900', color: C.ink }, quickSub: { fontSize: 12, color: C.ink }, quickStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, quickStatus: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: C.yellow, color: C.ink, fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4 }, flashcardsButton: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.pale }, flashcardsDisabled: { opacity: .78 }, flashcardsIconWrap: { width: 48, height: 48, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }, flashcardsCopy: { flex: 1, gap: 4 }, flashcardsTitle: { color: C.ink, fontSize: 17, fontWeight: '900' }, flashcardsSubtitle: { color: C.muted, fontSize: 13, lineHeight: 19 }, flashcardsStatus: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: C.yellow, color: C.ink, fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4 }, coffeeThanksToast: { alignSelf: 'center', backgroundColor: C.coffee, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 }, coffeeThanksText: { color: C.coffeeInk, fontSize: 14, fontWeight: '900', textAlign: 'center' }, footnote: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, footerSpacing: { marginTop: 8 },
    rulesPage: { gap: 18 }, rulesList: { gap: 14 }, notice: { borderRadius: 14, padding: 14 }, noticeText: { color: C.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' }, scoreHint: { backgroundColor: C.pale, borderRadius: 14, padding: 12, gap: 8, marginTop: 4 }, rulesScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, rulesScoreDescription: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, rulesScoreLabel: { flexShrink: 1, color: C.ink, fontSize: 13, lineHeight: 19, fontWeight: '700' }, rulesScorePoints: { minWidth: 40, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, textAlign: 'center', fontSize: 14, fontWeight: '900' }, rulesScorePositive: { backgroundColor: C.green, color: C.ink }, rulesScoreNeutral: { backgroundColor: C.yellow, color: C.ink }, rulesScoreZero: { backgroundColor: C.coral, color: C.errorInk }, error: { borderRadius: 16, padding: 16, backgroundColor: C.coral, gap: 8 }, errorText: { color: C.errorInk, lineHeight: 21, fontWeight: '600' }, errorLink: { color: C.errorInk, textDecorationLine: 'underline', fontWeight: '800' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, codeBox: { borderRadius: 18, backgroundColor: C.pale, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, code: { color: C.purple, fontSize: 30, fontWeight: '900', letterSpacing: 4 }, promptLabel: { color: C.purple, fontSize: 11, letterSpacing: 1, fontWeight: '900' }, count: { color: C.purple, fontWeight: '900' }, playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: C.divider, paddingTop: 12 }, avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: C.pale, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: C.purple, fontSize: 19, fontWeight: '900' }, playerName: { color: C.ink, fontWeight: '800', fontSize: 15 }, helper: { color: C.muted, fontSize: 13, lineHeight: 19 }, lobbyList: { gap: 8 }, lobbyItem: { borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.field, padding: 12, gap: 9 }, lobbyItemSelected: { borderColor: C.purple, backgroundColor: C.pale }, lobbyItemUnavailable: { opacity: .8 }, lobbyItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, lobbyMain: { flex: 1, gap: 4 }, lobbyCodeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, lobbyCode: { color: C.ink, fontSize: 15, fontWeight: '900', letterSpacing: 2 }, lobbyCreator: { color: C.muted, fontSize: 12, fontWeight: '600' }, lobbyCount: { flexDirection: 'row', alignItems: 'center', gap: 3 }, lobbyParticipants: { color: C.ink, fontSize: 14, fontWeight: '900' }, lobbyStatus: { overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '800' }, lobbyStatusWaiting: { backgroundColor: C.green, color: C.ink }, lobbyStatusPlaying: { backgroundColor: C.yellow, color: C.ink }, lobbyStatusFull: { backgroundColor: C.subtle, color: C.muted }, lobbyDetails: { borderTopWidth: 1, borderColor: C.divider, paddingTop: 9, gap: 3 }, lobbyDetailsLabel: { color: C.muted, fontSize: 11, fontWeight: '800' }, lobbyDetailsNames: { color: C.ink, fontSize: 13, fontWeight: '700' }, lobbyUnavailableText: { color: C.muted, fontSize: 11, marginTop: 3 },
    setupRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' }, radio: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.subtle, alignItems: 'center', justifyContent: 'center' }, radioOn: { backgroundColor: C.primary }, prompt: { backgroundColor: C.yellow, borderRadius: 18, padding: 18, gap: 5 }, promptText: { fontSize: 25, fontWeight: '900', color: C.ink }, option: { minHeight: 62, padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white }, optionSelected: { backgroundColor: C.pale, borderColor: C.purple, borderWidth: 2 }, optionDiscarded: { backgroundColor: C.discarded, opacity: .65 }, optionLetter: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, optionLetterText: { color: C.purple, fontWeight: '900' }, optionText: { color: C.ink, fontSize: 16, fontWeight: '800' }, optionMeta: { color: C.muted, fontSize: 12, marginTop: 3 }, strike: { textDecorationLine: 'line-through' },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: C.divider, paddingVertical: 10 }, points: { color: C.purple, fontSize: 21, fontWeight: '900' }, scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, score: { color: C.purple, fontWeight: '900', fontSize: 16 }, rankRow: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderColor: C.divider, paddingVertical: 12 }, rank: { color: C.purple, fontWeight: '900', fontSize: 23, width: 42 }, word: { fontSize: 19, fontWeight: '900', color: C.ink }, iconButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    roundPicker: { gap: 10 }, roundOptions: { flexDirection: 'row', gap: 8 }, roundOption: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' }, roundOptionSelected: { backgroundColor: C.primary, borderColor: C.primary }, roundOptionText: { color: C.ink, fontSize: 16, fontWeight: '900' }, difficultyText: { color: C.ink, fontSize: 14, fontWeight: '800' }, roundOptionTextSelected: { color: 'white' },
    suggestionPanel: { gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.edge, backgroundColor: C.field }, rarityPicker: { gap: 7 }, rarityHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, rarityValue: { minWidth: 76, alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.pale }, rarityValueText: { color: C.purple, fontSize: 12, fontWeight: '900' }, raritySlider: { height: 34, justifyContent: 'center', paddingHorizontal: 12 }, rarityRail: { height: 24, justifyContent: 'center', position: 'relative' }, rarityTrack: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: C.border }, rarityFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: C.primary }, rarityStop: { position: 'absolute', top: 7, width: 10, height: 10, marginLeft: -5, borderWidth: 2, borderRadius: 5, borderColor: C.muted, backgroundColor: C.white }, rarityStopActive: { borderColor: C.primary, backgroundColor: C.white }, rarityThumb: { position: 'absolute', top: 0, width: 24, height: 24, marginLeft: -12, borderWidth: 3, borderRadius: 12, borderColor: C.primary, backgroundColor: C.white, elevation: 2, shadowColor: '#000000', shadowOpacity: .16, shadowOffset: { width: 0, height: 2 }, shadowRadius: 3 }, rarityLabels: { flexDirection: 'row', justifyContent: 'space-between' }, rarityLabel: { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' }, rarityLabelActive: { color: C.primary, fontWeight: '900' }, suggestionButton: { width: '100%' },
  });
}
s = buildStyles();
