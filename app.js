import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ================== ROOM DEFINITIONS ================== */
const DEFAULT_ROOMS = [
  {id:"echo",  name:"Echo",  color1:"#dbeafe", color2:"#bfdbfe", text:"#1e3a8a"},
  {id:"bloom", name:"Bloom", color1:"#fce7f3", color2:"#fbcfe0", text:"#9d174d"},
  {id:"drift", name:"Drift", color1:"#dcfce7", color2:"#bbf7d0", text:"#14532d"},
  {id:"haven", name:"Haven", color1:"#ede9fe", color2:"#ddd6fe", text:"#4c1d95"},
  {id:"lumen", name:"Lumen", color1:"#fef3c7", color2:"#fde68a", text:"#78350f"}
];
const ADMIN_PASSWORD = "olejomalba2026";

let currentNick = null;
let currentRoom = null;
let unsubMessages = null;
let unsubBanned = null;

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

/* ================== LANDING ================== */
async function renderLanding(){
  const {rooms} = await ensureConfig();
  const grid = document.getElementById('room-grid');
  grid.innerHTML = '';
  rooms.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'room-tile';
    btn.style.background = `linear-gradient(150deg, ${r.color1}, ${r.color2})`;
    btn.style.color = r.text;
    btn.textContent = r.name;
    btn.onclick = () => tryJoinRoom(r.id);
    grid.appendChild(btn);
  });
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

  if(room.allowedNicks && room.allowedNicks.length > 0 && !room.allowedNicks.includes(nick)){
    errEl.textContent = 'You do not have access to this room.';
    return;
  }
  if(banned[roomId] && banned[roomId].includes(nick)){
    errEl.textContent = 'You have been removed from this room.';
    return;
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

  await postSystemMessage(`${currentNick} joined the room.`);
  listenMessages();
  listenBanned();
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
        bubble.textContent = applyModeration(m.text, settings);
        row.appendChild(nickEl);
        row.appendChild(bubble);
      }
      pane.appendChild(row);
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
}

async function leaveRoom(silent){
  if(!silent && currentRoom) await postSystemMessage(`${currentNick} left the room.`);
  if(unsubMessages) unsubMessages();
  if(unsubBanned) unsubBanned();
  currentRoom = null;
  document.getElementById('view-room').classList.add('hidden');
  document.getElementById('view-landing').classList.remove('hidden');
  document.getElementById('landing-error').textContent = '';
  renderLanding();
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
  return new Promise((resolve) => {
    const msgsRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(msgsRef, orderBy('ts', 'desc'), limit(50));
    onSnapshot(q, (snap) => {
      const nicks = [...new Set(snap.docs.map(d => d.data().nick).filter(Boolean))].slice(0, 15);
      resolve(nicks);
    }, () => resolve([]));
  });
}

async function renderAdmin(){
  const {rooms, settings, banned} = await ensureConfig();
  document.getElementById('moderation-toggle').checked = !!settings.moderationOn;
  document.getElementById('keywords-input').value = (settings.keywords || []).join(', ');

  const container = document.getElementById('rooms-admin-container');
  container.innerHTML = '';

  for(const room of rooms){
    const card = document.createElement('div');
    card.className = 'card admin-card';

    const title = document.createElement('h2');
    title.textContent = room.name;
    card.appendChild(title);

    const block1 = document.createElement('div');
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
    addRow.style.display = 'flex';
    addRow.style.gap = '8px';
    addRow.style.marginTop = '8px';
    const addInput = document.createElement('input');
    addInput.placeholder = 'add allowed nickname';
    addInput.style.flex = '1';
    addInput.style.padding = '9px 12px';
    addInput.style.borderRadius = '10px';
    addInput.style.border = '1.5px solid #e3def6';
    const addBtn = document.createElement('button');
    addBtn.className = 'save-btn';
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

    container.appendChild(card);
  }

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

/* ================== EVENTS ================== */
document.getElementById('open-admin').onclick = openAdmin;
document.getElementById('close-admin').onclick = closeAdmin;
document.getElementById('save-moderation').onclick = saveModeration;
document.getElementById('leave-room-btn').onclick = () => leaveRoom(false);
document.getElementById('send-btn').onclick = sendMessage;
document.getElementById('msg-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') sendMessage();
});
document.getElementById('nick-input').addEventListener('keydown', e => {
  if(e.key === 'Enter') e.preventDefault();
});

/* ================== INIT ================== */
renderLanding();
