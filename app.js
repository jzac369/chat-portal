import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs,
  query, orderBy, limit, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ================== ROOM DEFINITIONS ================== */
const DEFAULT_ROOMS = [
  {id:"echo",  name:"Echo",  color1:"#dbeafe", color2:"#bfdbfe", text:"#1e3a8a", maxParticipants:0, locked:false},
  {id:"bloom", name:"Bloom", color1:"#fce7f3", color2:"#fbcfe0", text:"#9d174d", maxParticipants:0, locked:false},
  {id:"drift", name:"Drift", color1:"#dcfce7", color2:"#bbf7d0", text:"#14532d", maxParticipants:0, locked:false},
  {id:"haven", name:"Haven", color1:"#ede9fe", color2:"#ddd6fe", text:"#4c1d95", maxParticipants:0, locked:false},
  {id:"lumen", name:"Lumen", color1:"#fef3c7", color2:"#fde68a", text:"#78350f", maxParticipants:0, locked:false},
  {id:"ember", name:"Ember", color1:"#ffe4e0", color2:"#ffc9be", text:"#9a2e1f", maxParticipants:0, locked:false}
];
let ADMIN_PASSWORD = "olejomalba2026";

const PRESENCE_TTL = 30000;
const HEARTBEAT_INTERVAL = 15000;
const VOICE_MAX_MS = 60000;
const VOICE_LIFETIME_MS = 180000;
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const MAX_BLOCKS = 3;

const EMOJI_LIST = [
  '😀','😂','😍','😎','🤔','😢','😡','👍','👎','🙏',
  '🎉','🔥','❤️','✨','😴','🤝','👏','😮','🥳','😅',
  '😘','🙃','😇','🤩','🥺','😬','🤯','🥶','🤗','😜',
  '🙄','😏','🤤','😱','🤪','😤','🥰','😆','🫠','🤓',
  '👀','💯','🙌','🤙','✌️','🫶','💪','🧠','🍀','🌈',
  '☕','🍕','🎶','📷','🚀','🐶','🐱','🌙','⭐','💤'
];

const TOPIC_LIST = [
  "Talk about your most embarrassing memory from the past :)",
  "What's the best advice you've ever received?",
  "If you could time-travel, which decade would you visit?",
  "Describe your dream vacation destination.",
  "What's a skill you wish you had?",
  "Share your favorite childhood memory.",
  "What's the weirdest food combination you actually enjoy?",
  "If you could have dinner with anyone, alive or dead, who would it be?",
  "What's a movie you can watch over and over again?",
  "What's the last thing that made you laugh really hard?",
  "If you won the lottery tomorrow, what's the first thing you'd do?",
  "What's your go-to comfort food?",
  "Describe your perfect lazy Sunday.",
  "What's a hobby you've always wanted to try?",
  "What's the most spontaneous thing you've ever done?",
  "If you could instantly master one language, which would it be?",
  "What's a book or show that completely changed your perspective?",
  "What's your favorite season and why?",
  "If animals could talk, which one would be the rudest?",
  "What's the best gift you've ever received?",
  "Describe a moment when you felt truly proud of yourself.",
  "What's your go-to karaoke song?",
  "If you could live in any fictional universe, which one would you pick?",
  "What's something you believed as a kid that turned out to be wrong?",
  "What's your favorite way to relax after a long day?",
  "If you had to eat one meal for the rest of your life, what would it be?",
  "What's a small thing that instantly improves your mood?",
  "Describe your dream house in three words.",
  "What's the most beautiful place you've ever visited?",
  "If you could swap lives with someone for a day, who would it be?",
  "What's a tradition from your family that you love?",
  "What's your favorite quote or saying?",
  "If you could learn any instrument overnight, which would you choose?",
  "What's the best concert or live show you've ever been to?",
  "What's a fear you've managed to overcome?",
  "If you had a superpower, what would you do with it first?",
  "What's the funniest thing a pet has ever done in front of you?",
  "What's your favorite way to spend a rainy day?",
  "If you could only keep five apps on your phone, which would they be?",
  "What's a city you'd love to live in someday?",
  "What's the best piece of advice you'd give your younger self?",
  "Describe your ideal weekend getaway.",
  "What's something on your bucket list?",
  "If you could time-travel to witness one historical event, what would it be?",
  "What's your favorite smell and why?",
  "What's a talent you have that surprises people?",
  "If you could redesign your hometown, what would you change?",
  "What's a song that always puts you in a good mood?",
  "What's the most adventurous thing you'd like to try?",
  "If you could be any fictional character for a day, who would you be?",
  "What's your favorite memory with friends?",
  "What's something you're really grateful for today?",
  "If you had an extra hour every day, how would you spend it?",
  "What's the best compliment you've ever received?",
  "What's a habit you're proud of building?",
  "If you could only watch one genre of movies forever, which would it be?",
  "What's your favorite holiday and why?",
  "What's something that always makes you nostalgic?",
  "If you could design your own holiday, what would it celebrate?",
  "What's a place you'd love to revisit?",
  "What's your favorite way to spend time with family?",
  "If you could ask a fortune teller one question, what would it be?",
  "What's the most useful thing you've learned this year?",
  "What's a dish you'd love to learn how to cook?",
  "If your life had a theme song, what would it be?",
  "What's the best piece of feedback you've ever received?",
  "What's a small win you had this week?",
  "If you could time-travel one year into the future, what would you check first?",
  "What's something you do differently than most people?",
  "What's the most interesting fact you know?",
  "If you could only listen to one album for the rest of your life, which would it be?",
  "What's a place that feels like home to you?",
  "What's your favorite way to start the morning?",
  "If you could meet your future self, what would you ask?",
  "What's a goal you're currently working towards?",
  "What's the kindest thing a stranger has ever done for you?",
  "If you could change one rule of life, what would it be?",
  "What's your favorite way to celebrate good news?",
  "What's a lesson you learned the hard way?",
  "If you could instantly become an expert in something, what would it be?",
  "What's the best advice for staying motivated?"
];

let currentNick = null;
let currentRoom = null;
let unsubMessages = null;
let unsubBanned = null;
let unsubRoomConfig = null;
let unsubSettings = null;
let unsubBlocks = null;
let unsubPrivateMessages = null;
let heartbeatTimer = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingCountdownTimer = null;
let isFirstSnapshot = true;
let soundEnabled = localStorage.getItem('mosaic-sound') !== 'off';
let lastActivityTs = Date.now();
let inactivityCheckTimer = null;
let roomSettings = {moderationOn:false, keywords:[], autoLogoutOn:true};
let blocksMap = {}; // { nick: [blockedNicks] }
let currentPrivatePairId = null;
let currentPrivatePartner = null;

/* ================== FIRESTORE HELPERS ================== */
async function getDocData(col, id, fallback){
  try{
    const snap = await getDoc(doc(db, col, id));
    return snap.exists() ? snap.data() : fallback;
  }catch(e){ console.error(e); return fallback; }
}
async function setDocData(col, id, data){
  try{ await setDoc(doc(db, col, id), data); }catch(e){ console.error(e); }
}

async function ensureConfig(){
  let roomsDoc = await getDocData('config', 'rooms', null);
  if(!roomsDoc){
    roomsDoc = { list: DEFAULT_ROOMS.map(r => ({...r, allowedNicks:[]})) };
    await setDocData('config', 'rooms', roomsDoc);
  }
  let changed = false;
  roomsDoc.list.forEach(r => {
    if(r.maxParticipants === undefined){ r.maxParticipants = 0; changed = true; }
    if(r.locked === undefined){ r.locked = false; changed = true; }
  });
  DEFAULT_ROOMS.forEach(dr => {
    if(!roomsDoc.list.find(r => r.id === dr.id)){
      roomsDoc.list.push({...dr, allowedNicks:[]});
      changed = true;
    }
  });
  if(changed) await setDocData('config', 'rooms', roomsDoc);

  let settings = await getDocData('config', 'settings', null);
  if(!settings){
    settings = {moderationOn:false, keywords:[], autoLogoutOn:true};
    await setDocData('config', 'settings', settings);
  }
  if(settings.autoLogoutOn === undefined){
    settings.autoLogoutOn = true;
    await setDocData('config', 'settings', settings);
  }

  let banned = await getDocData('config', 'banned', null);
  if(!banned){
    banned = {};
    DEFAULT_ROOMS.forEach(r => banned[r.id] = []);
    await setDocData('config', 'banned', banned);
  }
  return {rooms: roomsDoc.list, settings, banned};
}

/* ================== COLOR HASH ================== */
const MEMBER_PALETTE = ['#7c3aed','#db2777','#0891b2','#059669','#d97706','#dc2626','#4338ca','#0d9488'];
function nickColor(nick){
  let hash = 0;
  for(let i=0;i<nick.length;i++){ hash = nick.charCodeAt(i) + ((hash<<5)-hash); }
  return MEMBER_PALETTE[Math.abs(hash) % MEMBER_PALETTE.length];
}

/* ================== SOUND NOTIFICATION ================== */
function playPing(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }catch(e){}
}
function toggleSound(){
  soundEnabled = !soundEnabled;
  localStorage.setItem('mosaic-sound', soundEnabled ? 'on' : 'off');
  updateSoundBtn();
}
function updateSoundBtn(){
  const btn = document.getElementById('sound-toggle-btn');
  if(btn) btn.textContent = soundEnabled ? '🔔' : '🔕';
}

/* ================== PRESENCE ================== */
async function getActiveCount(roomId){
  try{
    const snap = await getDocs(collection(db, 'rooms', roomId, 'presence'));
    const now = Date.now();
    return snap.docs.filter(d => (now - (d.data().ts || 0)) < PRESENCE_TTL).length;
  }catch(e){ console.error(e); return 0; }
}
async function getActiveMembers(roomId){
  try{
    const snap = await getDocs(collection(db, 'rooms', roomId, 'presence'));
    const now = Date.now();
    return snap.docs.filter(d => (now - (d.data().ts || 0)) < PRESENCE_TTL).map(d => d.id);
  }catch(e){ return []; }
}
async function joinPresence(){
  await setDocData('rooms/' + currentRoom.id + '/presence', currentNick, {ts: Date.now()});
}
async function heartbeat(){
  if(!currentRoom || !currentNick) return;
  try{ await setDoc(doc(db, 'rooms', currentRoom.id, 'presence', currentNick), {ts: Date.now()}); }catch(e){}
}
async function leavePresence(){
  if(!currentRoom || !currentNick) return;
  try{ await deleteDoc(doc(db, 'rooms', currentRoom.id, 'presence', currentNick)); }catch(e){}
}

/* ================== LANDING ================== */
async function renderLanding(){
  const {rooms} = await ensureConfig();
  const grid = document.getElementById('room-grid');
  grid.innerHTML = '';
  for(const r of rooms){
    const count = await getActiveCount(r.id);
    const btn = document.createElement('button');
    btn.className = 'room-tile';
    btn.style.background = `linear-gradient(150deg, ${r.color1}, ${r.color2})`;
    btn.style.color = r.text;
    const full = r.maxParticipants > 0 && count >= r.maxParticipants;
    btn.innerHTML = `<span class="room-tile-name">${r.locked ? '🔒 ' : ''}${escapeHtml(r.name)} <span class="room-tile-suffix">room</span></span>` +
      `<span class="room-tile-count">${count}${r.maxParticipants > 0 ? ' / ' + r.maxParticipants : ''} online</span>` +
      (full ? `<span class="room-tile-full">FULL</span>` : '');
    btn.onclick = () => tryJoinRoom(r.id);
    grid.appendChild(btn);
  }
}

async function tryJoinRoom(roomId){
  const errEl = document.getElementById('landing-error');
  errEl.textContent = '';
  const nick = document.getElementById('nick-input').value.trim();
  if(!nick){ errEl.textContent = 'Please enter a nickname.'; return; }
  if(nick.toLowerCase() === 'admin'){ errEl.textContent = 'That nickname is reserved.'; return; }

  const {rooms, banned} = await ensureConfig();
  const room = rooms.find(r => r.id === roomId);
  if(!room) return;

  if(room.locked){ errEl.textContent = 'This room is currently closed by an admin.'; return; }
  if(room.allowedNicks && room.allowedNicks.length > 0 && !room.allowedNicks.includes(nick)){
    errEl.textContent = 'You do not have access to this room.'; return;
  }
  if(banned[roomId] && banned[roomId].includes(nick)){
    errEl.textContent = 'You have been removed from this room.'; return;
  }
  if(room.maxParticipants > 0){
    const count = await getActiveCount(roomId);
    if(count >= room.maxParticipants){
      errEl.textContent = 'This room is full. Please try again later.'; return;
    }
  }
  try{
    const presenceSnap = await getDoc(doc(db, 'rooms', roomId, 'presence', nick));
    if(presenceSnap.exists() && (Date.now() - (presenceSnap.data().ts || 0)) < PRESENCE_TTL){
      errEl.textContent = 'This nickname is currently taken in this room. Please choose another.';
      return;
    }
  }catch(e){}

  currentNick = nick;
  currentRoom = room;
  enterRoom();
}

/* ================== MODERATION ================== */
function applyModeration(text, settings){
  if(!settings.moderationOn || !settings.keywords || settings.keywords.length === 0) return text;
  let out = text;
  settings.keywords.forEach(kw => {
    if(!kw) return;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    out = out.replace(re, m => '*'.repeat(m.length));
  });
  return out;
}

/* ================== ROOM ================== */
async function enterRoom(){
  document.getElementById('view-landing').classList.add('hidden');
  document.getElementById('view-room').classList.remove('hidden');
  const header = document.getElementById('room-header');
  header.style.background = `linear-gradient(120deg, ${currentRoom.color1}, ${currentRoom.color2})`;
  header.style.color = currentRoom.text;
  document.getElementById('room-title').textContent = `${currentRoom.name} — ${currentNick}`;
  document.getElementById('messages-pane').innerHTML = '';
  closeEmojiPanel();
  updateSoundBtn();
  isFirstSnapshot = true;

  roomSettings = await getDocData('config', 'settings', {moderationOn:false, keywords:[], autoLogoutOn:true});
  lastActivityTs = Date.now();
  document.addEventListener('keydown', registerActivity);
  document.addEventListener('mousedown', registerActivity);
  document.addEventListener('touchstart', registerActivity);
  inactivityCheckTimer = setInterval(checkInactivity, 30000);

  await postSystemMessage(`${currentNick} joined the room.`);
  await joinPresence();
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
  listenMessages();
  listenBanned();
  listenRoomLockout();
  listenSettings();
  listenBlocks();
}

function registerActivity(){ lastActivityTs = Date.now(); }

function checkInactivity(){
  if(!currentRoom || !roomSettings.autoLogoutOn) return;
  if(Date.now() - lastActivityTs > INACTIVITY_LIMIT_MS){
    leaveRoom(false, 'inactivity');
  }
}

function listenSettings(){
  if(unsubSettings) unsubSettings();
  unsubSettings = onSnapshot(doc(db, 'config', 'settings'), (snap) => {
    if(snap.exists()) roomSettings = snap.data();
  });
}

function listenBlocks(){
  if(unsubBlocks) unsubBlocks();
  unsubBlocks = onSnapshot(doc(db, 'config', 'blocks'), (snap) => {
    blocksMap = snap.exists() ? snap.data() : {};
  });
}

function isHiddenFromMe(otherNick){
  if(!currentNick || otherNick === currentNick) return false;
  const iBlockedThem = (blocksMap[currentNick] || []).includes(otherNick);
  const theyBlockedMe = (blocksMap[otherNick] || []).includes(currentNick);
  return iBlockedThem || theyBlockedMe;
}

function renderMessageRow(m, docRef){
  const row = document.createElement('div');
  if(m.system){
    row.className = 'msg-system';
    row.textContent = m.text;
    return row;
  }
  if(m.nick && isHiddenFromMe(m.nick)) return null;

  row.className = 'msg-row';
  const nickEl = document.createElement('div');
  nickEl.className = 'msg-nick';
  nickEl.style.color = m.color || nickColor(m.nick);
  nickEl.textContent = m.nick;
  row.appendChild(nickEl);

  if(m.type === 'voice'){
    if(Date.now() > (m.expiresAt || 0)){
      if(docRef){
        setDoc(docRef, {
          system:true,
          text:`${m.nick}'s voice message has dissolved...`,
          ts:m.ts
        }).catch(()=>{});
      }
      return null;
    }
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble voice-bubble';
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = m.audio;
    bubble.appendChild(audio);
    const remain = document.createElement('span');
    remain.className = 'voice-expiry';
    remain.textContent = '🎙️ disappears soon';
    bubble.appendChild(remain);
    row.appendChild(bubble);
  } else {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = m._displayText !== undefined ? m._displayText : m.text;
    row.appendChild(bubble);
  }
  return row;
}

function listenMessages(){
  const msgsRef = collection(db, 'rooms', currentRoom.id, 'messages');
  const q = query(msgsRef, orderBy('ts', 'desc'), limit(200));
  if(unsubMessages) unsubMessages();
  unsubMessages = onSnapshot(q, async (snap) => {
    const settings = await getDocData('config', 'settings', {moderationOn:false, keywords:[]});
    const pane = document.getElementById('messages-pane');
    pane.innerHTML = '';
    snap.docs.forEach(d => {
      const m = d.data();
      if(!m.system && m.type !== 'voice'){
        m._displayText = applyModeration(m.text, settings);
      }
      const row = renderMessageRow(m, d.ref);
      if(row) pane.appendChild(row);
    });

    if(!isFirstSnapshot){
      const added = snap.docChanges().filter(c => c.type === 'added');
      const hasNewFromOthers = added.some(c => {
        const data = c.doc.data();
        return data.nick && data.nick !== currentNick && !isHiddenFromMe(data.nick);
      });
      if(hasNewFromOthers && soundEnabled) playPing();
    }
    isFirstSnapshot = false;
  });
}

function listenBanned(){
  if(unsubBanned) unsubBanned();
  unsubBanned = onSnapshot(doc(db, 'config', 'banned'), (snap) => {
    const data = snap.data() || {};
    if(currentRoom && data[currentRoom.id] && data[currentRoom.id].includes(currentNick)){
      alert('You have been removed from this room by an admin.');
      leaveRoom(true);
    }
  });
}

function listenRoomLockout(){
  if(unsubRoomConfig) unsubRoomConfig();
  unsubRoomConfig = onSnapshot(doc(db, 'config', 'rooms'), (snap) => {
    const data = snap.data();
    if(!data || !currentRoom) return;
    const rm = data.list.find(r => r.id === currentRoom.id);
    if(rm && rm.locked){
      alert('This room has been closed by an admin.');
      leaveRoom(true);
    }
  });
}

async function postSystemMessage(text){
  const msgsRef = collection(db, 'rooms', currentRoom.id, 'messages');
  await addDoc(msgsRef, {system:true, text, ts:Date.now()});
}

async function sendMessage(){
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if(!text || !currentRoom) return;
  const msgsRef = collection(db, 'rooms', currentRoom.id, 'messages');
  await addDoc(msgsRef, {nick:currentNick, color:nickColor(currentNick), text, ts:Date.now()});
  input.value = '';
  closeEmojiPanel();
}

async function sendRandomTopic(){
  if(!currentRoom) return;
  const topic = TOPIC_LIST[Math.floor(Math.random() * TOPIC_LIST.length)];
  const msgsRef = collection(db, 'rooms', currentRoom.id, 'messages');
  await addDoc(msgsRef, {system:true, text:`🎲 Topic: ${topic}`, ts:Date.now()});
}

async function leaveRoom(silent, reason){
  if(reason === 'inactivity'){
    await postSystemMessage(`${currentNick} was logged out due to inactivity.`);
  } else if(!silent && currentRoom){
    await postSystemMessage(`${currentNick} left the room.`);
  }
  await leavePresence();
  if(heartbeatTimer) clearInterval(heartbeatTimer);
  if(inactivityCheckTimer) clearInterval(inactivityCheckTimer);
  document.removeEventListener('keydown', registerActivity);
  document.removeEventListener('mousedown', registerActivity);
  document.removeEventListener('touchstart', registerActivity);
  if(unsubMessages) unsubMessages();
  if(unsubBanned) unsubBanned();
  if(unsubRoomConfig) unsubRoomConfig();
  if(unsubSettings) unsubSettings();
  if(unsubBlocks) unsubBlocks();
  stopRecordingIfActive();
  const wasInactivity = reason === 'inactivity';
  currentRoom = null;
  document.getElementById('view-room').classList.add('hidden');
  document.getElementById('view-private').classList.add('hidden');
  document.getElementById('view-landing').classList.remove('hidden');
  document.getElementById('landing-error').textContent = '';
  renderLanding();
  if(wasInactivity) showToast('You were logged out due to inactivity. You can rejoin anytime with the same nickname.');
}
window.addEventListener('beforeunload', () => { if(currentRoom) leavePresence(); });

/* ================== TOAST ================== */
function showToast(text){
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-fade'), 2600);
  setTimeout(() => toast.remove(), 3200);
}

/* ================== EMOJI PICKER ================== */
function toggleEmojiPanel(){
  document.getElementById('emoji-panel').classList.toggle('hidden');
}
function closeEmojiPanel(){
  document.getElementById('emoji-panel').classList.add('hidden');
}
function buildEmojiPanel(){
  const panel = document.getElementById('emoji-panel');
  panel.innerHTML = '';
  EMOJI_LIST.forEach(em => {
    const span = document.createElement('button');
    span.className = 'emoji-item';
    span.textContent = em;
    span.onclick = () => {
      const input = document.getElementById('msg-input');
      input.value += em;
      input.focus();
    };
    panel.appendChild(span);
  });
}

/* ================== VOICE MESSAGES ================== */
function stopRecordingIfActive(){
  if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if(recordingTimer) clearTimeout(recordingTimer);
  if(recordingCountdownTimer) clearInterval(recordingCountdownTimer);
  setMicState(false);
}
function setMicState(recording){
  const micBtn = document.getElementById('mic-btn');
  micBtn.classList.toggle('recording', recording);
  micBtn.textContent = recording ? '⏹️' : '🎤';
  document.getElementById('rec-countdown').classList.toggle('hidden', !recording);
}

async function toggleRecording(){
  if(mediaRecorder && mediaRecorder.state === 'recording'){
    mediaRecorder.stop();
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if(e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setMicState(false);
      if(recordingTimer) clearTimeout(recordingTimer);
      if(recordingCountdownTimer) clearInterval(recordingCountdownTimer);
      if(recordedChunks.length === 0) return;
      const blob = new Blob(recordedChunks, {type:'audio/webm'});
      if(blob.size > 900000){
        alert('Voice message too large — please keep it shorter.');
        return;
      }
      const dataUrl = await blobToDataUrl(blob);
      const now = Date.now();
      const msgsRef = collection(db, 'rooms', currentRoom.id, 'messages');
      await addDoc(msgsRef, {
        nick:currentNick, color:nickColor(currentNick), type:'voice',
        audio:dataUrl, ts:now, expiresAt: now + VOICE_LIFETIME_MS
      });
      showToast('🎙️ Voice message sent — it will disappear in 3 minutes.');
    };
    mediaRecorder.start();
    setMicState(true);
    let remaining = VOICE_MAX_MS / 1000;
    document.getElementById('rec-countdown').textContent = remaining + 's';
    recordingCountdownTimer = setInterval(() => {
      remaining -= 1;
      document.getElementById('rec-countdown').textContent = Math.max(remaining,0) + 's';
      if(remaining <= 0) clearInterval(recordingCountdownTimer);
    }, 1000);
    recordingTimer = setTimeout(() => {
      if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, VOICE_MAX_MS);
  }catch(e){
    alert('Microphone access denied or unavailable.');
  }
}
function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ================== MEMBER MODAL (shared by DM + Block) ================== */
async function openMemberModal(mode){
  if(!currentRoom) return;
  const members = await getActiveMembers(currentRoom.id);
  const others = members.filter(n => n !== currentNick);

  const modal = document.getElementById('member-modal');
  const title = document.getElementById('member-modal-title');
  const list = document.getElementById('member-modal-list');
  list.innerHTML = '';

  if(mode === 'dm'){
    title.textContent = 'Start a private chat with…';
    const eligible = others.filter(n => !isHiddenFromMe(n));
    if(eligible.length === 0){
      list.innerHTML = '<p class="hint">No other members available right now.</p>';
    }
    eligible.forEach(n => {
      const item = document.createElement('button');
      item.className = 'member-modal-item';
      item.innerHTML = `<span style="color:${nickColor(n)}; font-weight:600;">${escapeHtml(n)}</span>`;
      item.onclick = () => { closeMemberModal(); openPrivateChat(n); };
      list.appendChild(item);
    });
  } else if(mode === 'block'){
    title.textContent = `Block a member (max ${MAX_BLOCKS})`;
    const myBlocks = blocksMap[currentNick] || [];
    const blockedSection = document.createElement('div');
    blockedSection.innerHTML = '<p class="hint" style="margin-top:0;">Currently blocked:</p>';
    if(myBlocks.length === 0){
      blockedSection.innerHTML += '<p class="hint">None.</p>';
    } else {
      myBlocks.forEach(n => {
        const row = document.createElement('div');
        row.className = 'member-modal-item blocked-row';
        row.innerHTML = `<span>${escapeHtml(n)}</span>`;
        const unblockBtn = document.createElement('button');
        unblockBtn.className = 'save-btn small-btn';
        unblockBtn.textContent = 'Unblock';
        unblockBtn.onclick = async () => { await unblockMember(n); openMemberModal('block'); };
        row.appendChild(unblockBtn);
        blockedSection.appendChild(row);
      });
    }
    list.appendChild(blockedSection);

    const divider = document.createElement('p');
    divider.className = 'hint';
    divider.style.marginTop = '14px';
    divider.textContent = myBlocks.length >= MAX_BLOCKS ? 'Block limit reached.' : 'Available members:';
    list.appendChild(divider);

    others.filter(n => !myBlocks.includes(n)).forEach(n => {
      const item = document.createElement('div');
      item.className = 'member-modal-item';
      item.innerHTML = `<span style="color:${nickColor(n)}; font-weight:600;">${escapeHtml(n)}</span>`;
      const blockBtn = document.createElement('button');
      blockBtn.className = 'danger-btn small-btn';
      blockBtn.textContent = 'Block';
      blockBtn.disabled = myBlocks.length >= MAX_BLOCKS;
      blockBtn.onclick = async () => { await blockMember(n); openMemberModal('block'); };
      item.appendChild(blockBtn);
      list.appendChild(item);
    });
  }

  modal.classList.remove('hidden');
}
function closeMemberModal(){
  document.getElementById('member-modal').classList.add('hidden');
}
async function blockMember(targetNick){
  const all = await getDocData('config', 'blocks', {});
  const mine = all[currentNick] || [];
  if(mine.length >= MAX_BLOCKS || mine.includes(targetNick)) return;
  all[currentNick] = [...mine, targetNick];
  await setDocData('config', 'blocks', all);
}
async function unblockMember(targetNick){
  const all = await getDocData('config', 'blocks', {});
  all[currentNick] = (all[currentNick] || []).filter(n => n !== targetNick);
  await setDocData('config', 'blocks', all);
}

/* ================== PRIVATE CHAT ================== */
function makePairId(roomId, a, b){
  const sorted = [a, b].sort();
  return `${roomId}__${sorted[0]}__${sorted[1]}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

async function openPrivateChat(partnerNick){
  currentPrivatePartner = partnerNick;
  currentPrivatePairId = makePairId(currentRoom.id, currentNick, partnerNick);

  const existing = await getDocData('privatechats', currentPrivatePairId, null);
  if(!existing){
    await setDocData('privatechats', currentPrivatePairId, {
      roomId: currentRoom.id,
      roomName: currentRoom.name,
      participants: [currentNick, partnerNick].sort(),
      createdAt: Date.now()
    });
  }

  document.getElementById('view-room').classList.add('hidden');
  document.getElementById('view-private').classList.remove('hidden');
  document.getElementById('private-title').textContent = `Private chat with ${partnerNick}`;
  document.getElementById('private-messages-pane').innerHTML = '';

  const msgsRef = collection(db, 'privatechats', currentPrivatePairId, 'messages');
  await addDoc(msgsRef, {system:true, text:`${currentNick} opened a private chat.`, ts:Date.now()});

  listenPrivateMessages();
}

function listenPrivateMessages(){
  const msgsRef = collection(db, 'privatechats', currentPrivatePairId, 'messages');
  const q = query(msgsRef, orderBy('ts', 'desc'), limit(200));
  if(unsubPrivateMessages) unsubPrivateMessages();
  unsubPrivateMessages = onSnapshot(q, (snap) => {
    const pane = document.getElementById('private-messages-pane');
    pane.innerHTML = '';
    snap.docs.forEach(d => {
      const m = d.data();
      const row = document.createElement('div');
      if(m.system){
        row.className = 'msg-system';
        row.textContent = m.text;
      } else {
        row.className = 'msg-row';
        const nickEl = document.createElement('div');
        nickEl.className = 'msg-nick';
        nickEl.style.color = m.color || nickColor(m.nick);
        nickEl.textContent = m.nick;
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = m.text;
        row.appendChild(nickEl);
        row.appendChild(bubble);
      }
      pane.appendChild(row);
    });
  });
}

async function sendPrivateMessage(){
  const input = document.getElementById('private-msg-input');
  const text = input.value.trim();
  if(!text || !currentPrivatePairId) return;
  const msgsRef = collection(db, 'privatechats', currentPrivatePairId, 'messages');
  await addDoc(msgsRef, {nick:currentNick, color:nickColor(currentNick), text, ts:Date.now()});
  input.value = '';
}

function backToMainChat(){
  if(unsubPrivateMessages) unsubPrivateMessages();
  currentPrivatePairId = null;
  currentPrivatePartner = null;
  document.getElementById('view-private').classList.add('hidden');
  document.getElementById('view-room').classList.remove('hidden');
}

/* ================== ADMIN ================== */
async function openAdmin(){
  const pass = prompt('Enter admin password:');
  if(pass !== ADMIN_PASSWORD){
    if(pass !== null) alert('Incorrect password.');
    return;
  }
  document.getElementById('view-landing').classList.add('hidden');
  document.getElementById('view-admin').classList.remove('hidden');
  await renderAdmin();
}
function closeAdmin(){
  document.getElementById('view-admin').classList.add('hidden');
  document.getElementById('view-landing').classList.remove('hidden');
  renderLanding();
}
function escapeHtml(str){
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function getRecentNicks(roomId){
  try{
    const msgsRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(msgsRef, orderBy('ts', 'desc'), limit(50));
    const snap = await getDocs(q);
    return [...new Set(snap.docs.map(d => d.data().nick).filter(Boolean))].slice(0, 15);
  }catch(e){ return []; }
}
async function clearRoomMessages(roomId){
  const msgsRef = collection(db, 'rooms', roomId, 'messages');
  const snap = await getDocs(msgsRef);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
async function getAllMessages(roomId){
  const msgsRef = collection(db, 'rooms', roomId, 'messages');
  const q = query(msgsRef, orderBy('ts', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}
async function getAllPrivateChats(){
  try{
    const snap = await getDocs(collection(db, 'privatechats'));
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
  }catch(e){ return []; }
}
async function getPrivateMessages(pairId){
  const msgsRef = collection(db, 'privatechats', pairId, 'messages');
  const q = query(msgsRef, orderBy('ts', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}
function formatLogLine(m){
  const time = new Date(m.ts).toISOString().replace('T',' ').slice(0,19);
  if(m.system) return `[${time}] *** ${m.text}`;
  if(m.type === 'voice') return `[${time}] ${m.nick}: [voice message]`;
  return `[${time}] ${m.nick}: ${m.text}`;
}
function downloadTextFile(filename, content){
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function downloadAllHistory(rooms){
  let out = `Good old FreeChat — full chat history export\nGenerated: ${new Date().toISOString()}\n\n`;
  for(const room of rooms){
    out += `\n========== ${room.name} (room) ==========\n`;
    const msgs = await getAllMessages(room.id);
    if(msgs.length === 0) out += '(no messages)\n';
    msgs.forEach(m => { out += formatLogLine(m) + '\n'; });
  }
  const privates = await getAllPrivateChats();
  for(const pc of privates){
    out += `\n========== PRIVATE: ${pc.participants.join(' & ')} (in ${pc.roomName}) ==========\n`;
    const msgs = await getPrivateMessages(pc.id);
    if(msgs.length === 0) out += '(no messages)\n';
    msgs.forEach(m => { out += formatLogLine(m) + '\n'; });
  }
  downloadTextFile(`freechat-history-${Date.now()}.txt`, out);
}
async function renderGlobalStats(rooms){
  const statsBox = document.getElementById('global-stats');
  statsBox.innerHTML = '<span class="hint">Loading stats…</span>';
  let totalMsgs = 0, totalOnline = 0;
  for(const r of rooms){
    const msnap = await getDocs(collection(db, 'rooms', r.id, 'messages'));
    totalMsgs += msnap.size;
    totalOnline += await getActiveCount(r.id);
  }
  const privates = await getAllPrivateChats();
  statsBox.innerHTML = `
    <div class="stat-pill">💬 ${totalMsgs} room messages</div>
    <div class="stat-pill">🟢 ${totalOnline} online now</div>
    <div class="stat-pill">🏠 ${rooms.length} rooms</div>
    <div class="stat-pill">🔒 ${privates.length} private chats</div>
  `;
}
async function renderChatLogs(rooms){
  const container = document.getElementById('chat-logs-container');
  container.innerHTML = '';
  for(const room of rooms){
    const wrap = document.createElement('div');
    wrap.className = 'log-room-block';
    const head = document.createElement('div');
    head.className = 'log-room-head';
    head.innerHTML = `<strong>${escapeHtml(room.name)} (room)</strong>`;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'save-btn small-btn';
    toggleBtn.textContent = 'View log';
    const logBox = document.createElement('div');
    logBox.className = 'log-box hidden';
    toggleBtn.onclick = async () => {
      if(!logBox.classList.contains('hidden')){
        logBox.classList.add('hidden'); toggleBtn.textContent = 'View log'; return;
      }
      logBox.innerHTML = 'Loading…';
      logBox.classList.remove('hidden');
      toggleBtn.textContent = 'Hide log';
      const msgs = await getAllMessages(room.id);
      logBox.innerHTML = msgs.length === 0
        ? '<span class="hint">No messages yet.</span>'
        : msgs.map(m => `<div class="log-line">${escapeHtml(formatLogLine(m))}</div>`).join('');
    };
    head.appendChild(toggleBtn);
    wrap.appendChild(head);
    wrap.appendChild(logBox);
    container.appendChild(wrap);
  }

  const privates = await getAllPrivateChats();
  const pHead = document.createElement('h3');
  pHead.style.marginTop = '20px';
  pHead.textContent = 'Private chats';
  container.appendChild(pHead);
  if(privates.length === 0){
    const none = document.createElement('p');
    none.className = 'hint';
    none.textContent = 'No private chats have been started yet.';
    container.appendChild(none);
  }
  privates.forEach(pc => {
    const wrap = document.createElement('div');
    wrap.className = 'log-room-block';
    const head = document.createElement('div');
    head.className = 'log-room-head';
    head.innerHTML = `<strong>${escapeHtml(pc.participants.join(' ↔ '))}</strong> <small class="hint">(${escapeHtml(pc.roomName)})</small>`;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'save-btn small-btn';
    toggleBtn.textContent = 'View log';
    const logBox = document.createElement('div');
    logBox.className = 'log-box hidden';
    toggleBtn.onclick = async () => {
      if(!logBox.classList.contains('hidden')){
        logBox.classList.add('hidden'); toggleBtn.textContent = 'View log'; return;
      }
      logBox.innerHTML = 'Loading…';
      logBox.classList.remove('hidden');
      toggleBtn.textContent = 'Hide log';
      const msgs = await getPrivateMessages(pc.id);
      logBox.innerHTML = msgs.length === 0
        ? '<span class="hint">No messages yet.</span>'
        : msgs.map(m => `<div class="log-line">${escapeHtml(formatLogLine(m))}</div>`).join('');
    };
    head.appendChild(toggleBtn);
    wrap.appendChild(head);
    wrap.appendChild(logBox);
    container.appendChild(wrap);
  });
}
async function renderAdmin(){
  const {rooms, settings, banned} = await ensureConfig();
  document.getElementById('moderation-toggle').checked = !!settings.moderationOn;
  document.getElementById('keywords-input').value = (settings.keywords || []).join(', ');
  document.getElementById('autologout-toggle').checked = settings.autoLogoutOn !== false;

  renderGlobalStats(rooms);
  renderChatLogs(rooms);
  document.getElementById('download-all-history').onclick = () => downloadAllHistory(rooms);

  const container = document.getElementById('rooms-admin-container');
  container.innerHTML = '';

  for(const room of rooms){
    const activeCount = await getActiveCount(room.id);
    const card = document.createElement('div');
    card.className = 'card admin-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'admin-room-title-row';
    titleRow.innerHTML = `<h2>${escapeHtml(room.name)}</h2><span class="online-badge">🟢 ${activeCount} online</span>`;
    card.appendChild(titleRow);

    const controlRow = document.createElement('div');
    controlRow.className = 'admin-control-row';
    controlRow.innerHTML = `
      <label class="switch small">
        <input type="checkbox" data-lock-room="${room.id}" ${room.locked ? 'checked' : ''}>
        <span class="slider-round"></span>
      </label>
      <span class="switch-label">Close room (prevent new joins)</span>
    `;
    card.appendChild(controlRow);

    const capRow = document.createElement('div');
    capRow.className = 'admin-control-row';
    capRow.innerHTML = `
      <span class="switch-label">Max participants:</span>
      <input type="number" min="0" class="cap-input" data-cap-room="${room.id}" value="${room.maxParticipants || 0}" style="width:80px;">
      <small class="hint">(0 = unlimited)</small>
      <button class="save-btn small-btn" data-savecap-room="${room.id}">Save</button>
    `;
    card.appendChild(capRow);

    const block1 = document.createElement('div');
    block1.className = 'room-admin-block';
    block1.innerHTML = `<h3>Allowed members <small class="hint">(empty = open to everyone)</small></h3>`;
    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    (room.allowedNicks || []).forEach(n => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${escapeHtml(n)} <button data-room="${room.id}" data-nick="${escapeHtml(n)}">✕</button>`;
      tagList.appendChild(tag);
    });
    block1.appendChild(tagList);
    const addRow = document.createElement('div');
    addRow.className = 'admin-inline-row';
    const addInput = document.createElement('input');
    addInput.placeholder = 'add allowed nickname';
    addInput.className = 'inline-input';
    const addBtn = document.createElement('button');
    addBtn.className = 'save-btn small-btn';
    addBtn.textContent = 'Add';
    addBtn.onclick = async () => {
      const val = addInput.value.trim();
      if(!val) return;
      const cfg = await getDocData('config', 'rooms', {list: DEFAULT_ROOMS});
      const rm = cfg.list.find(x => x.id === room.id);
      rm.allowedNicks = rm.allowedNicks || [];
      if(!rm.allowedNicks.includes(val)) rm.allowedNicks.push(val);
      await setDocData('config', 'rooms', cfg);
      renderAdmin();
    };
    addRow.appendChild(addInput); addRow.appendChild(addBtn);
    block1.appendChild(addRow);
    card.appendChild(block1);

    const block2 = document.createElement('div');
    block2.className = 'room-admin-block';
    block2.innerHTML = `<h3>Removed members</h3>`;
    const bannedList = document.createElement('div');
    bannedList.className = 'tag-list banned-list';
    (banned[room.id] || []).forEach(n => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${escapeHtml(n)} <button data-unban-room="${room.id}" data-unban-nick="${escapeHtml(n)}">✕</button>`;
      bannedList.appendChild(tag);
    });
    if((banned[room.id] || []).length === 0) bannedList.innerHTML = '<small class="hint">No removed members.</small>';
    block2.appendChild(bannedList);
    card.appendChild(block2);

    const block3 = document.createElement('div');
    block3.className = 'room-admin-block';
    block3.innerHTML = `<h3>Kick a member</h3>`;
    const kickList = document.createElement('div');
    kickList.className = 'user-kick-list';
    const recentNicks = await getRecentNicks(room.id);
    recentNicks.forEach(n => {
      const chip = document.createElement('span');
      chip.className = 'kick-chip';
      chip.innerHTML = `${escapeHtml(n)} <button data-kick-room="${room.id}" data-kick-nick="${escapeHtml(n)}">Kick</button>`;
      kickList.appendChild(chip);
    });
    if(recentNicks.length === 0){
      const none = document.createElement('small');
      none.className = 'hint'; none.textContent = 'No recent members.';
      block3.appendChild(none);
    }
    block3.appendChild(kickList);
    card.appendChild(block3);

    const block4 = document.createElement('div');
    block4.className = 'room-admin-block danger-zone';
    block4.innerHTML = `<h3>Danger zone</h3>`;
    const clearBtn = document.createElement('button');
    clearBtn.className = 'danger-btn';
    clearBtn.textContent = 'Clear chat history';
    clearBtn.onclick = async () => {
      if(!confirm(`Delete all messages in "${room.name}"? This cannot be undone.`)) return;
      await clearRoomMessages(room.id);
      alert('Chat history cleared.');
      renderAdmin();
    };
    block4.appendChild(clearBtn);
    card.appendChild(block4);

    container.appendChild(card);
  }

  container.querySelectorAll('input[data-lock-room]').forEach(input => {
    input.onchange = async () => {
      const roomId = input.getAttribute('data-lock-room');
      const cfg = await getDocData('config', 'rooms', {list: DEFAULT_ROOMS});
      const rm = cfg.list.find(x => x.id === roomId);
      rm.locked = input.checked;
      await setDocData('config', 'rooms', cfg);
      if(input.checked){
        const msgsRef = collection(db, 'rooms', roomId, 'messages');
        await addDoc(msgsRef, {system:true, text:'This room has been closed by an admin.', ts:Date.now()});
      }
    };
  });
  container.querySelectorAll('button[data-savecap-room]').forEach(btn => {
    btn.onclick = async () => {
      const roomId = btn.getAttribute('data-savecap-room');
      const input = container.querySelector(`input[data-cap-room="${roomId}"]`);
      const val = Math.max(0, parseInt(input.value, 10) || 0);
      const cfg = await getDocData('config', 'rooms', {list: DEFAULT_ROOMS});
      const rm = cfg.list.find(x => x.id === roomId);
      rm.maxParticipants = val;
      await setDocData('config', 'rooms', cfg);
      alert('Capacity saved.');
    };
  });
  container.querySelectorAll('button[data-room]').forEach(btn => {
    btn.onclick = async () => {
      const roomId = btn.getAttribute('data-room');
      const nick = btn.getAttribute('data-nick');
      const cfg = await getDocData('config', 'rooms', {list: DEFAULT_ROOMS});
      const rm = cfg.list.find(x => x.id === roomId);
      rm.allowedNicks = (rm.allowedNicks || []).filter(n => n !== nick);
      await setDocData('config', 'rooms', cfg);
      renderAdmin();
    };
  });
  container.querySelectorAll('button[data-unban-room]').forEach(btn => {
    btn.onclick = async () => {
      const roomId = btn.getAttribute('data-unban-room');
      const nick = btn.getAttribute('data-unban-nick');
      const b2 = await getDocData('config', 'banned', {});
      b2[roomId] = (b2[roomId] || []).filter(n => n !== nick);
      await setDocData('config', 'banned', b2);
      renderAdmin();
    };
  });
  container.querySelectorAll('button[data-kick-room]').forEach(btn => {
    btn.onclick = async () => {
      const roomId = btn.getAttribute('data-kick-room');
      const nick = btn.getAttribute('data-kick-nick');
      const b2 = await getDocData('config', 'banned', {});
      b2[roomId] = b2[roomId] || [];
      if(!b2[roomId].includes(nick)) b2[roomId].push(nick);
      await setDocData('config', 'banned', b2);
      try{ await deleteDoc(doc(db, 'rooms', roomId, 'presence', nick)); }catch(e){}
      const msgsRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(msgsRef, {system:true, text:`${nick} was removed by an admin.`, ts:Date.now()});
      renderAdmin();
    };
  });
}
async function saveModeration(){
  const on = document.getElementById('moderation-toggle').checked;
  const kwRaw = document.getElementById('keywords-input').value;
  const keywords = kwRaw.split(',').map(s => s.trim()).filter(Boolean);
  const current = await getDocData('config', 'settings', {autoLogoutOn:true});
  await setDocData('config', 'settings', {...current, moderationOn:on, keywords});
  alert('Moderation settings saved.');
}
async function saveAutoLogout(){
  const on = document.getElementById('autologout-toggle').checked;
  const current = await getDocData('config', 'settings', {moderationOn:false, keywords:[]});
  await setDocData('config', 'settings', {...current, autoLogoutOn:on});
  alert('Session settings saved.');
}
async function refreshAdminStats(){
  const {rooms} = await ensureConfig();
  renderGlobalStats(rooms);
}

/* ================== EVENTS ================== */
document.getElementById('open-admin').onclick = openAdmin;
document.getElementById('close-admin').onclick = closeAdmin;
document.getElementById('save-moderation').onclick = saveModeration;
document.getElementById('save-autologout').onclick = saveAutoLogout;
document.getElementById('refresh-stats').onclick = refreshAdminStats;
document.getElementById('leave-room-btn').onclick = () => leaveRoom(false);
document.getElementById('topic-btn').onclick = sendRandomTopic;
document.getElementById('sound-toggle-btn').onclick = toggleSound;
document.getElementById('dm-btn').onclick = () => openMemberModal('dm');
document.getElementById('block-btn').onclick = () => openMemberModal('block');
document.getElementById('member-modal-close').onclick = closeMemberModal;
document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('emoji-btn').onclick = toggleEmojiPanel;
document.getElementById('mic-btn').onclick = toggleRecording;
document.getElementById('msg-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') sendMessage();
});
document.getElementById('nick-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') e.preventDefault();
});
document.getElementById('private-back-btn').onclick = backToMainChat;
document.getElementById('private-send-btn').onclick = sendPrivateMessage;
document.getElementById('private-msg-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') sendPrivateMessage();
});

/* ================== INIT ================== */
buildEmojiPanel();
updateSoundBtn();
renderLanding();
