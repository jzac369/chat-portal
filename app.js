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

const PRESENCE_TTL = 30000; // ms — presence doc considered "active" if updated within this window
const HEARTBEAT_INTERVAL = 15000;
const VOICE_MAX_MS = 60000;     // max recording length
const VOICE_LIFETIME_MS = 180000; // voice notes disappear after this long

const EMOJI_LIST = ['😀','😂','😍','😎','🤔','😢','😡','👍','👎','🙏','🎉','🔥','❤️','✨','😴','🤝','👏','😮','🥳','😅'];

let currentNick = null;
let currentRoom = null;
let unsubMessages = null;
let unsubBanned = null;
let unsubRoomConfig = null;
let heartbeatTimer = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;

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
  // backfill new fields / new rooms added after initial setup
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
    settings = {moderationOn:false, keywords:[]};
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

/* ================== COLOR HASH (member name colors) ================== */
const MEMBER_PALETTE = ['#7c3aed','#db2777','#0891b2','#059669','#d97706','#dc2626','#4338ca','#0d9488'];
function nickColor(nick){
  let hash = 0;
  for(let i=0;i<nick.length;i++){ hash = nick.charCodeAt(i) + ((hash<<5)-hash); }
  return MEMBER_PALETTE[Math.abs(hash) % MEMBER_PALETTE.length];
}

/* ================== PRESENCE ================== */
async function getActiveCount(roomId){
  try{
    const snap = await getDocs(collection(db, 'rooms', roomId, 'presence'));
    const now = Date.now();
    return snap.docs.filter(d => (now - (d.data().ts || 0)) < PRESENCE_TTL).length;
  }catch(e){ console.error(e); return 0; }
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

  if(room.locked){
    errEl.textContent = 'This room is currently closed by an admin.';
    return;
  }
  if(room.allowedNicks && room.allowedNicks.length > 0 && !room.allowedNicks.includes(nick)){
    errEl.textContent = 'You do not have access to this room.';
    return;
  }
  if(banned[roomId] && banned[roomId].includes(nick)){
    errEl.textContent = 'You have been removed from this room.';
    return;
  }
  if(room.maxParticipants > 0){
    const count = await getActiveCount(roomId);
    if(count >= room.maxParticipants){
      errEl.textContent = 'This room is full. Please try again later.';
      return;
    }
  }

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

  await postSystemMessage(`${currentNick} joined the room.`);
  await joinPresence();
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
  listenMessages();
  listenBanned();
  listenRoomLockout();
}

function renderMessageRow(m, docRef){
  const row = document.createElement('div');
  if(m.system){
    row.className = 'msg-system';
    row.textContent = m.text;
    return row;
  }
  row.className = 'msg-row';
  const nickEl = document.createElement('div');
  nickEl.className = 'msg-nick';
  nickEl.style.color = m.color || nickColor(m.nick);
  nickEl.textContent = m.nick;
  row.appendChild(nickEl);

  if(m.type === 'voice'){
    if(Date.now() > (m.expiresAt || 0)){
      if(docRef) deleteDoc(docRef).catch(()=>{});
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

async function leaveRoom(silent){
  if(!silent && currentRoom) await postSystemMessage(`${currentNick} left the room.`);
  await leavePresence();
  if(heartbeatTimer) clearInterval(heartbeatTimer);
  if(unsubMessages) unsubMessages();
  if(unsubBanned) unsubBanned();
  if(unsubRoomConfig) unsubRoomConfig();
  stopRecordingIfActive();
  currentRoom = null;
  document.getElementById('view-room').classList.add('hidden');
  document.getElementById('view-landing').classList.remove('hidden');
  document.getElementById('landing-error').textContent = '';
  renderLanding();
}
window.addEventListener('beforeunload', () => { if(currentRoom) leavePresence(); });

/* ================== EMOJI PICKER ================== */
function toggleEmojiPanel(){
  const panel = document.getElementById('emoji-panel');
  panel.classList.toggle('hidden');
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
  if(mediaRecorder && mediaRecorder.state !== 'inactive'){
    mediaRecorder.stop();
  }
  if(recordingTimer) clearTimeout(recordingTimer);
  setMicState(false);
}
function setMicState(recording){
  const micBtn = document.getElementById('mic-btn');
  micBtn.classList.toggle('recording', recording);
  micBtn.textContent = recording ? '⏹️' : '🎤';
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
    };
    mediaRecorder.start();
    setMicState(true);
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
  let out = `Mosaic — full chat history export\nGenerated: ${new Date().toISOString()}\n\n`;
  for(const room of rooms){
    out += `\n========== ${room.name} ==========\n`;
    const msgs = await getAllMessages(room.id);
    if(msgs.length === 0) out += '(no messages)\n';
    msgs.forEach(m => { out += formatLogLine(m) + '\n'; });
  }
  downloadTextFile(`mosaic-chat-history-${Date.now()}.txt`, out);
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
  statsBox.innerHTML = `
    <div class="stat-pill">💬 ${totalMsgs} total messages</div>
    <div class="stat-pill">🟢 ${totalOnline} online now</div>
    <div class="stat-pill">🏠 ${rooms.length} rooms</div>
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
    head.innerHTML = `<strong>${escapeHtml(room.name)}</strong>`;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'save-btn small-btn';
    toggleBtn.textContent = 'View log';
    const logBox = document.createElement('div');
    logBox.className = 'log-box hidden';
    toggleBtn.onclick = async () => {
      if(!logBox.classList.contains('hidden')){
        logBox.classList.add('hidden');
        toggleBtn.textContent = 'View log';
        return;
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
}

async function renderAdmin(){
  const {rooms, settings, banned} = await ensureConfig();
  document.getElementById('moderation-toggle').checked = !!settings.moderationOn;
  document.getElementById('keywords-input').value = (settings.keywords || []).join(', ');

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
    titleRow.innerHTML = `
      <h2>${escapeHtml(room.name)}</h2>
      <span class="online-badge">🟢 ${activeCount} online</span>
    `;
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
    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
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
    if((banned[room.id] || []).length === 0){
      bannedList.innerHTML = '<small class="hint">No removed members.</small>';
    }
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
      none.className = 'hint';
      none.textContent = 'No recent members.';
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
  await setDocData('config', 'settings', {moderationOn:on, keywords});
  alert('Moderation settings saved.');
}

async function refreshAdminStats(){
  const {rooms} = await ensureConfig();
  renderGlobalStats(rooms);
}

/* ================== EVENTS ================== */
document.getElementById('open-admin').onclick = openAdmin;
document.getElementById('close-admin').onclick = closeAdmin;
document.getElementById('save-moderation').onclick = saveModeration;
document.getElementById('refresh-stats').onclick = refreshAdminStats;
document.getElementById('leave-room-btn').onclick = () => leaveRoom(false);
document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('emoji-btn').onclick = toggleEmojiPanel;
document.getElementById('mic-btn').onclick = toggleRecording;
document.getElementById('msg-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') sendMessage();
});
document.getElementById('nick-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') e.preventDefault();
});

/* ================== INIT ================== */
buildEmojiPanel();
renderLanding();
