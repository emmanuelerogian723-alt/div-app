/* ============ DIV — AI Learning App v2 ============
   Made with S.T.E.W AI (https://stew-agent.onrender.com)
   Auth & sync: Firebase (project: ominiassist-ai)
=================================================== */
const STEW_API = 'https://stew-agent.onrender.com';
const FB = { apiKey: 'AIzaSyBRhBF6Nscqz53rMCF0ykAcMnWuRIrfgJw', projectId: 'ominiassist-ai' };
const $ = id => document.getElementById(id);

/* ---------- Subjects (level-aware) ---------- */
const SECONDARY_SUBJECTS = [
  ['Mathematics','➗'],['English Language','📖'],['Physics','🔬'],['Chemistry','⚗️'],
  ['Biology','🌿'],['Economics','📈'],['Government','🏛️'],['Literature','📚'],
  ['Geography','🗺️'],['History','⏳'],['Agricultural Science','🌾'],['Computer Science','💻'],
  ['Further Mathematics','📐'],['Commerce','🛒'],['Financial Accounting','🧾'],
  ['Civic Education','🤝'],['CRS','✝️'],['IRS','☪️'],['French','🇫🇷'],
  ['Technical Drawing','📏'],['Home Economics','🍳'],['Music','🎵'],['Yoruba','🗣️'],['Igbo','🗣️'],['Hausa','🗣️']
];
const UNI_SUBJECTS = [
  ['Mathematics','➗'],['English','📖'],['Statistics','📊'],['Physics','🔬'],['Chemistry','⚗️'],
  ['Biology','🌿'],['Geology','🪨'],['Biochemistry','🧬'],['Microbiology','🦠'],['Anatomy','🫀'],
  ['Physiology','💓'],['Nursing','🩺'],['Public Health','🏥'],['Medicine & Surgery','🩻'],
  ['Pharmacy','💊'],['Pharmacology','💉'],['Law','⚖️'],['Economics','📈'],['Accounting','🧾'],
  ['Banking & Finance','🏦'],['Business Administration','💼'],['Marketing','📣'],
  ['Entrepreneurship','🚀'],['Taxation','🧮'],['Auditing','🔍'],['Political Science','🏛️'],
  ['Psychology','🧠'],['Sociology','👥'],['Philosophy','🤔'],['Mass Communication','📰'],
  ['International Relations','🌍'],['Public Administration','📋'],['Criminology','🚔'],
  ['Computer Science','💻'],['Software Engineering','👨‍💻'],['Data Science','🤖'],
  ['Cyber Security','🔐'],['Information Technology','🖥️'],['Electrical Engineering','⚡'],
  ['Mechanical Engineering','⚙️'],['Civil Engineering','🏗️'],['Chemical Engineering','🧪'],
  ['Computer Engineering','🔌'],['Petroleum Engineering','🛢️'],['Food Science','🍎'],
  ['Agricultural Economics','🌾'],['Education','🎓'],['Linguistics','🗣️'],
  ['Theatre Arts','🎭'],['Fine Arts','🎨'],['Religious Studies','🙏']
];
const SUB_EMOJI = Object.fromEntries([...SECONDARY_SUBJECTS, ...UNI_SUBJECTS]);

/* ---------- State ---------- */
let profile = JSON.parse(localStorage.getItem('div_profile') || 'null');
let progress = JSON.parse(localStorage.getItem('div_progress') || 'null') || {
  xp: 0, streak: 0, lastDay: '', todayXP: 0, questions: 0, tests: 0, assignments: 0,
  subjects: {}, badges: []
};
let settings = JSON.parse(localStorage.getItem('div_settings') || 'null') || { voice: true, voiceURI: null, rate: 1.0 };
let authUser = JSON.parse(localStorage.getItem('div_auth') || 'null');
let library = JSON.parse(localStorage.getItem('div_library') || '[]');
let activeMaterial = null;

let saveTimer = null;
function save() {
  localStorage.setItem('div_profile', JSON.stringify(profile));
  localStorage.setItem('div_progress', JSON.stringify(progress));
  localStorage.setItem('div_settings', JSON.stringify(settings));
  scheduleSync();
}
function scheduleSync() {
  if (!authUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(syncUp, 2000);
}

/* ---------- Firebase Auth (REST) ---------- */
async function getIdToken() {
  if (!authUser) return null;
  if (Date.now() < (authUser.expiresAt || 0) - 60000) return authUser.idToken;
  try {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FB.apiKey}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: authUser.refreshToken })
    });
    const d = await r.json();
    if (d.id_token) {
      authUser = { uid: d.user_id, email: authUser.email, name: authUser.name,
        idToken: d.id_token, refreshToken: d.refresh_token, expiresAt: Date.now() + (+d.expires_in * 1000) };
      localStorage.setItem('div_auth', JSON.stringify(authUser));
      return d.id_token;
    }
  } catch (e) {}
  return authUser.idToken;
}
async function fbSignup(name, email, password) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB.apiKey}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  authUser = { uid: d.localId, email, name, idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (+d.expiresIn * 1000) };
  localStorage.setItem('div_auth', JSON.stringify(authUser));
  return authUser;
}
async function fbLogin(email, password) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB.apiKey}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  authUser = { uid: d.localId, email, name: d.displayName || '', idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (+d.expiresIn * 1000) };
  localStorage.setItem('div_auth', JSON.stringify(authUser));
  return authUser;
}
function fbLogout() {
  authUser = null; localStorage.removeItem('div_auth'); toast('Logged out');
}
/* Firestore sync: users/{uid} */
async function syncUp() {
  if (!authUser) return;
  const token = await getIdToken();
  try {
    await fetch(`https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/users/${authUser.uid}`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        profileJ: { stringValue: JSON.stringify(profile || {}) },
        progressJ: { stringValue: JSON.stringify(progress) },
        settingsJ: { stringValue: JSON.stringify(settings) },
        name: { stringValue: (profile && profile.name) || '' },
        email: { stringValue: authUser.email || '' }
      }})
    });
  } catch (e) {}
}
async function syncDown() {
  if (!authUser) return false;
  const token = await getIdToken();
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/users/${authUser.uid}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!r.ok) return false;
    const d = await r.json();
    const f = d.fields || {};
    if (f.profileJ) {
      const p = JSON.parse(f.profileJ.stringValue);
      if (p && p.subjects && p.subjects.length) profile = p;
    }
    if (f.progressJ) progress = JSON.parse(f.progressJ.stringValue);
    if (f.settingsJ) settings = JSON.parse(f.settingsJ.stringValue);
    localStorage.setItem('div_profile', JSON.stringify(profile));
    localStorage.setItem('div_progress', JSON.stringify(progress));
    localStorage.setItem('div_settings', JSON.stringify(settings));
    return !!(profile && profile.subjects);
  } catch (e) { return false; }
}

/* ---------- Streak / XP ---------- */
function today() { return new Date().toISOString().slice(0,10); }
function touchStreak() {
  const t = today();
  if (progress.lastDay !== t) {
    const yest = new Date(Date.now()-864e5).toISOString().slice(0,10);
    progress.streak = progress.lastDay === yest ? progress.streak + 1 : 1;
    progress.lastDay = t; progress.todayXP = 0;
    save();
  }
}
function addXP(n) {
  touchStreak();
  progress.xp += n; progress.todayXP += n;
  checkBadges();
  save(); renderProgressUI();
}
function checkBadges() {
  const earned = b => { if (!progress.badges.includes(b)) { progress.badges.push(b); toast('🏅 Badge earned: ' + b); } };
  if (progress.questions >= 10) earned('Curious Mind 💬');
  if (progress.tests >= 1) earned('Quiz Rookie 📝');
  if (progress.tests >= 10) earned('Quiz Master 🏆');
  if (progress.assignments >= 3) earned('Bookworm 📚');
  if (progress.streak >= 3) earned('On Fire 🔥');
  if (progress.xp >= 500) earned('Brain Diamond 💎');
}

/* ---------- S.T.E.W AI ---------- */
async function stewChat(message, userId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75000);
  try {
    const resp = await fetch(`${STEW_API}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: userId }), signal: ctrl.signal
    });
    const data = await resp.json();
    return (data.response || data.reply || '').trim() || "Hmm, I didn't catch that. Try again!";
  } catch (e) {
    if (e.name === 'AbortError') return "⏳ I'm taking too long — S.T.E.W AI is waking up. Try again in a moment!";
    return "😕 Connection hiccup. Check your internet and try again.";
  } finally { clearTimeout(timer); }
}
function studentContext() {
  if (!profile) return '';
  if (profile.level === 'university')
    return `[You are tutoring ${profile.name}, a university student of ${profile.uni}. Their subjects: ${profile.subjects.join(', ')}.] `;
  return `[You are tutoring ${profile.name}, a ${profile.class} secondary school student${profile.secSchool ? ' at ' + profile.secSchool : ''}. Their subjects: ${profile.subjects.join(', ')}.] `;
}
function wakeServer() { fetch(`${STEW_API}/heartbeat`).catch(() => {}); }

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('toast') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast' }));
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- Navigation ---------- */
function go(screen) {
  document.querySelectorAll('#app-main .screen').forEach(s => s.classList.remove('active'));
  const map = { assignments: 'screen-assignments', quiz: 'screen-quiz' };
  const el = $(map[screen] || `screen-${screen}`);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.go === screen));
  if (screen === 'home') renderHome();
  if (screen === 'tests') renderTestSubjects();
  if (screen === 'assignments') renderAssignSubjects();
  if (screen === 'progress') renderProgressUI();
  if (screen === 'profile') renderProfile();
  if (screen === 'library') renderLibrary();
  if (screen === 'live') startLive();
  if (screen !== 'live') endLive();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});

/* ---------- Onboarding ---------- */
let obLevel = null, obClass = null, obSubjects = [];
function subjectListFor(level) { return level === 'university' ? UNI_SUBJECTS : SECONDARY_SUBJECTS; }
function renderObSubjects() {
  const list = subjectListFor(obLevel || 'secondary');
  $('ob-subjects').innerHTML = list.map(([name, emoji]) =>
    `<button class="chip-select subject-chip" data-subject="${name}">
       <span class="chip-emoji">${emoji}</span>${name}</button>`).join('');
  $('ob-subjects').querySelectorAll('.chip-select').forEach(btn => btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    obSubjects = [...$('ob-subjects').querySelectorAll('.selected')].map(b => b.dataset.subject);
    $('ob-finish').disabled = obSubjects.length < 3;
  }));
}
function obGo(step) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  const el = document.querySelector(`.ob-step[data-step="${step}"]`);
  if (el) el.classList.add('active');
  const bars = { 1: 14, auth: 28, 2: 40, '3u': 60, '3s': 60, 4: 80, 5: 95 };
  $('ob-bar').style.width = (bars[step] || 20) + '%';
}
function finishOnboarding() {
  profile = {
    name: $('student-name').value.trim() || (authUser && authUser.name) || 'Student',
    level: obLevel,
    class: obLevel === 'secondary' ? obClass : null,
    secSchool: obLevel === 'secondary' ? ($('sec-school').value.trim() || null) : null,
    uni: obLevel === 'university' ? $('uni-name').value.trim() : null,
    matric: obLevel === 'university' ? $('matric-no').value.trim() : null,
    subjects: obSubjects
  };
  save();
  if (authUser) syncUp();
  $('screen-onboarding').classList.add('hidden');
  $('app-main').classList.remove('hidden');
  addXP(10);
  toast('🌟 Welcome to DIV, ' + profile.name + '!');
  go('home');
}
function initOnboarding() {
  renderObSubjects();
  obGo('1');
  document.querySelectorAll('.ob-next').forEach(btn => btn.addEventListener('click', () => {
    const goto = btn.dataset.goto;
    if (goto === 'finish') { finishOnboarding(); return; }
    if (goto === 'auth') { openAuth('signup', 'onboard'); return; }
    if (goto === '4' && obLevel === 'university') {
      if (!$('uni-name').value.trim()) { toast('Please enter your university name'); return; }
      if (!$('matric-no').value.trim()) { toast('Please enter your matric or reg number'); return; }
    }
    if (goto === '5' && !$('student-name').value.trim()) { toast('Tell me your name 😊'); return; }
    obGo(goto);
  }));
  document.querySelectorAll('.level-card').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.level-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    obLevel = btn.dataset.level;
    renderObSubjects();
    setTimeout(() => obGo(obLevel === 'university' ? '3u' : '3s'), 300);
  }));
  document.querySelectorAll('[data-class]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-class]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    obClass = btn.dataset.class;
    const cont = document.querySelector('.ob-step[data-step="3s"] .btn-chunky');
    if (cont) cont.disabled = false;
  }));
  const secCont = document.createElement('button');
  secCont.className = 'btn-chunky btn-primary';
  secCont.textContent = 'Continue →';
  secCont.disabled = true;
  secCont.addEventListener('click', () => obGo('4'));
  document.querySelector('.ob-step[data-step="3s"]').appendChild(secCont);
}

/* ---------- Auth UI (signup / login) ---------- */
let authMode = 'signup'; let authFrom = 'onboard';
function openAuth(mode, from) {
  authMode = mode || 'signup'; authFrom = from || 'onboard';
  $('screen-auth').classList.add('active');
  renderAuth();
}
function closeAuth() { $('screen-auth').classList.remove('active'); }
function renderAuth() {
  $('auth-title').textContent = authMode === 'signup' ? 'Create your free account ✨' : 'Welcome back! 👋';
  $('auth-sub').textContent = authMode === 'signup'
    ? 'Save your progress and sync across devices.'
    : 'Log in to pick up where you left off.';
  $('auth-name-row').classList.toggle('hidden', authMode !== 'signup');
  $('auth-btn').textContent = authMode === 'signup' ? 'Create Account' : 'Log In';
  $('auth-switch-line').innerHTML = authMode === 'signup'
    ? 'Already have an account? <b id="auth-switch">Log in</b>'
    : 'New here? <b id="auth-switch">Create account</b>';
  $('auth-switch').addEventListener('click', () => { authMode = authMode === 'signup' ? 'login' : 'signup'; renderAuth(); });
}
async function submitAuth() {
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const name = $('auth-name').value.trim();
  const btn = $('auth-btn');
  if (!email || !password) { toast('Enter your email and password'); return; }
  if (authMode === 'signup' && password.length < 6) { toast('Password must be at least 6 characters'); return; }
  if (authMode === 'signup' && !name) { toast('Enter your name 😊'); return; }
  const authErr = $('auth-error'); authErr.textContent = '';
  btn.disabled = true; btn.textContent = 'Connecting… ⏳';
  try {
    if (authMode === 'signup') {
      let ok = false, exists = false;
      try {
        await fbSignup(name, email, password); ok = true;
      } catch (err) {
        if ((err.message || '').includes('EMAIL_EXISTS')) exists = true; else throw err;
      }
      if (exists) {
        btn.textContent = 'Signing you in…';
        try { await fbLogin(email, password); ok = true; }
        catch (err2) {
          authMode = 'login'; renderAuth();
          $('auth-error').textContent = 'That email already has an account. Enter your password to log in.';
          toast('You already have an account — logging in instead');
          btn.disabled = false; btn.textContent = 'Log In';
          return;
        }
      }
      if (!ok) throw new Error('could not create account');
      btn.disabled = false; $('auth-btn').textContent = 'Create Account';
      closeAuth(); toast(exists ? '👋 Welcome back, ' + name + '!' : '🎉 Account created! Hi ' + name + '!');
      if (profile && profile.subjects) syncUp();
      if (authFrom === 'onboard') { obGo('2'); }
      else { go('profile'); }
    } else {
      await fbLogin(email, password);
      const restored = await syncDown();
      btn.disabled = false; $('auth-btn').textContent = 'Log In';
      closeAuth(); toast('👋 Welcome back!');
      if (restored && profile && profile.subjects) {
        $('screen-onboarding').classList.add('hidden');
        $('app-main').classList.remove('hidden');
        go('home');
      } else if (authFrom === 'onboard') {
        obGo('2');
      } else { go('profile'); }
    }
  } catch (e) {
    btn.disabled = false; $('auth-btn').textContent = authMode === 'signup' ? 'Create Account' : 'Log In';
    let msg = (e.message || '').replace(/_/g, ' ').toLowerCase();
    if (msg.includes('fetch') || msg.includes('network')) msg = 'network problem — check your internet and try again';
    if (msg.includes('password')) msg = 'wrong email or password';
    $('auth-error').textContent = msg.charAt(0).toUpperCase() + msg.slice(1) + '.';
    toast('Signup failed: ' + msg);
  }
}

/* ---------- Home ---------- */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function renderHome() {
  touchStreak();
  $('stat-streak').textContent = progress.streak;
  $('stat-xp').textContent = progress.xp;
  $('home-greeting').textContent = greeting() + '!';
  $('home-name').textContent = `Ready to learn, ${profile.name}?`;
  const goal = Math.min(100, Math.round(progress.todayXP / 50 * 100));
  $('goal-ring').style.background = `conic-gradient(var(--purple) ${goal * 3.6}deg, var(--purple-light) 0deg)`;
  $('goal-text').textContent = goal + '%';
  $('goal-earned').textContent = `${progress.todayXP}/50`;
  $('home-subjects').innerHTML = profile.subjects.map(s =>
    `<div class="subject-card"><span class="sub-emoji">${SUB_EMOJI[s] || '📘'}</span>${s}</div>`).join('');
}

/* ---------- Voice: natural speech ---------- */
let voices = [];
let voiceOut = settings.voice;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const all = speechSynthesis.getVoices();
  voices = all.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 600);
}
function pickNaturalVoice() {
  const prefs = [
    /natural/i, /neural/i, /premium/i, /enhanced/i,
    /google us english/i, /samantha/i, /aria/i, /jenny/i, /ava/i,
    /google uk english female/i, /zira/i
  ];
  for (const p of prefs) { const v = voices.find(x => p.test(x.name)); if (v) return v; }
  return voices.find(v => /google/i.test(v.name)) || voices[0] || null;
}
function chosenVoice() {
  if (settings.voiceURI) {
    const v = voices.find(x => x.voiceURI === settings.voiceURI);
    if (v) return v;
  }
  return pickNaturalVoice();
}
const stripEmoji = t => t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '');
function speak(text) {
  if (!voiceOut) return;
  const clean = stripEmoji(text).slice(0, 600);
  if (window.DivNative) { try { window.DivNative.speak(clean); return; } catch (e) {} }
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const v = chosenVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = settings.rate || 1.0; u.pitch = 1.05;
  speechSynthesis.speak(u);
}

/* Voice picker */
function openVoicePicker() {
  $('voice-modal').classList.add('active');
  renderVoiceList();
}
function renderVoiceList() {
  const list = $('voice-list');
  if (window.DivNative) {
    list.innerHTML = `<div class="voice-row selected"><div><b>Android System Voice</b><small>Natural TTS engine on your phone</small></div><span>✓</span></div>`;
  } else {
    if (!voices.length) { list.innerHTML = '<p class="voice-empty">No system voices found yet — open the app again in a moment.</p>'; return; }
    const current = settings.voiceURI || (pickNaturalVoice() || {}).voiceURI;
    list.innerHTML = voices.map(v =>
      `<div class="voice-row ${v.voiceURI === current ? 'selected' : ''}" data-vuri="${v.voiceURI}">
         <div><b>${v.name}</b><small>${v.lang}</small></div>
         <div class="voice-actions">
           <button class="voice-prev" data-prev="${v.voiceURI}">▶</button>
           ${v.voiceURI === current ? '<span>✓</span>' : ''}
         </div>
       </div>`).join('');
    list.querySelectorAll('.voice-prev').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const v = voices.find(x => x.voiceURI === b.dataset.prev);
      if (v && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Hi! I'm DIV, your AI teacher. This is how I sound.");
        u.voice = v; u.rate = settings.rate || 1.0; u.pitch = 1.05;
        speechSynthesis.speak(u);
      }
    }));
    list.querySelectorAll('.voice-row').forEach(r => r.addEventListener('click', () => {
      settings.voiceURI = r.dataset.vuri; save();
      renderVoiceList();
      toast('✅ Voice selected');
    }));
  }
}

/* ---------- Tutor Chat ---------- */
function addMsg(role, text) {
  const wrap = $('chat-messages');
  wrap.querySelector('.msg-welcome')?.remove();
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}
async function sendChat(text) {
  if (!text.trim()) return;
  addMsg('user', text);
  $('chat-input').value = '';
  $('typing-row').classList.remove('hidden');
  $('chat-status').textContent = 'Thinking...';
  progress.questions += 1; addXP(5);
  try {
    let ctx = studentContext();
    if (activeMaterial) ctx += `[The student uploaded study material "${activeMaterial.name}" (${activeMaterial.words} words). Its content: "${activeMaterial.text.slice(0, 8000)}". Base your answer on this material.] `;
    const reply = await stewChat(ctx + text, 'div_' + (profile.name || 'student'));
    $('typing-row').classList.add('hidden');
    addMsg('bot', reply);
    speak(reply);
    $('chat-status').textContent = 'Online — always ready';
  } catch (e) {
    $('typing-row').classList.add('hidden');
    addMsg('bot', "😕 I couldn't reach the AI. Try again!");
  }
}
/* Voice input (web + native bridge) */
let recog = null, recognizing = false;
function startVoiceInput() {
  if (window.DivNative) { try { window.DivNative.startListening(); $('recording-badge').classList.remove('hidden'); } catch (e) {} return; }
  if (!recog) { toast('Voice input not supported here — type instead'); return; }
  if (recognizing) { recog.stop(); return; }
  try { recog.start(); } catch (e) {}
}
window.__div_onNativeSpeech = t => {
  $('recording-badge').classList.add('hidden');
  if (!t) return;
  if (liveActive) { liveSend(t); return; }
  $('chat-input').value = t; setTimeout(() => sendChat(t), 300);
};
window.__div_onNativeSpeechEnd = () => $('recording-badge').classList.add('hidden');
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (window.DivNative) return; // native bridge handles it
  if (!SR) { $('mic-btn').style.display = 'none'; return; }
  recog = new SR();
  recog.lang = 'en-NG'; recog.interimResults = false; recog.maxAlternatives = 1;
  recog.onstart = () => { recognizing = true; $('mic-btn').classList.add('rec'); $('recording-badge').classList.remove('hidden'); };
  recog.onend = () => { recognizing = false; $('mic-btn').classList.remove('rec'); $('recording-badge').classList.add('hidden'); };
  recog.onresult = e => {
    const text = e.results[0][0].transcript;
    if (liveActive) { liveSend(text); return; }
    $('chat-input').value = text;
    setTimeout(() => sendChat(text), 300);
  };
  recog.onerror = () => { recognizing = false; toast('Voice not available — type instead'); };
}

/* ---------- Study Library (S.T.E.W OCR + AI identification) ---------- */
const LIB_EXT_EMOJI = { pdf: '📕', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', bmp: '🖼️', gif: '🖼️' };
function libExt(name) { const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }

async function uploadMaterial(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) { toast('File too big — max 15MB'); return; }
  const ext = libExt(file.name);
  if (!LIB_EXT_EMOJI[ext]) { toast('Please upload a PDF or image file'); return; }

  const card = $('upload-card'), prog = $('lib-progress'), fill = $('lib-progress-fill'), txt = $('lib-progress-text');
  card.classList.add('hidden'); prog.classList.remove('hidden');
  const step = (p, m) => { fill.style.width = p + '%'; txt.textContent = m; };

  try {
    // Step 1 — OCR: extract the text with S.T.E.W OCR engine
    step(15, '📤 Uploading to S.T.E.W AI...');
    const fd = new FormData();
    fd.append('file', file); fd.append('lang', 'eng'); fd.append('include_confidence', 'false');
    const r1 = await fetch(STEW_API + '/api/ocr', { method: 'POST', body: fd });
    const d1 = await r1.json();
    if (!d1.success) throw new Error(d1.detail || 'OCR failed');
    const text = (d1.text || '').trim();
    if (!text) { throw new Error('No readable text found — try a clearer photo or scan'); }
    step(55, '📖 S.T.E.W AI is reading ' + (d1.page_count > 1 ? d1.page_count + ' pages...' : 'your material...'));

    // Step 2 — AI identification: what is this material about?
    const fd2 = new FormData();
    fd2.append('file', file); fd2.append('task', 'analyze'); fd2.append('lang', 'eng');
    const r2 = await fetch(STEW_API + '/api/ocr/analyze', { method: 'POST', body: fd2 });
    const d2 = await r2.json();
    step(85, '🧠 Identifying the subject...');

    const analysis = ((d2.analysis || d2.result || d2.answer || '') + '').trim();
    // First sentence of the analysis = the identified topic
    const topic = analysis.replace(/[*#>\n]/g, ' ').split(/(?<=[.!?])\s+/)[0] || (text.slice(0, 60) + '...');
    const material = {
      id: Date.now(), name: file.name, ext: ext,
      words: d1.word_count || text.split(/\s+/).length,
      pages: d1.page_count || 1,
      confidence: Math.round(d1.avg_confidence || 0),
      topic: topic.slice(0, 140),
      analysis: analysis.slice(0, 1200),
      text: text.slice(0, 12000),
      date: new Date().toISOString()
    };
    library.unshift(material);
    localStorage.setItem('div_library', JSON.stringify(library));
    step(100, '✅ Added to your library!');
    addXP(15);
    toast('📚 "' + material.name + '" added to your library!');
    setTimeout(() => { prog.classList.add('hidden'); card.classList.remove('hidden'); renderLibrary(); }, 900);
  } catch (e) {
    prog.classList.add('hidden'); card.classList.remove('hidden');
    toast('😕 ' + (e.message || "Couldn't read that file — try again"));
  }
}
$('lib-file').addEventListener('change', e => { uploadMaterial(e.target.files[0]); e.target.value = ''; });

function deleteMaterial(id) {
  if (!confirm('Remove this material from your library?')) return;
  library = library.filter(m => m.id !== id);
  if (activeMaterial && activeMaterial.id === id) clearMaterial();
  localStorage.setItem('div_library', JSON.stringify(library));
  renderLibrary(); toast('🗑 Removed');
}

function askAboutMaterial(id) {
  const m = library.find(x => x.id === id); if (!m) return;
  activeMaterial = m;
  go('tutor');
  $('mat-chip').classList.remove('hidden');
  $('mat-chip-name').textContent = m.name;
  $('chat-input').placeholder = 'Ask DIV anything about this material...';
  $('chat-status').textContent = 'Reading your material — ask away!';
  toast('📖 Now ask DIV anything about "' + m.name + '"');
}
function clearMaterial() {
  activeMaterial = null;
  $('mat-chip').classList.add('hidden');
  $('chat-input').placeholder = 'Ask me anything...';
}

function renderLibrary() {
  const list = $('lib-list'), empty = $('lib-empty'), count = $('lib-count'), homeCount = $('lib-count-home');
  if (homeCount) homeCount.textContent = library.length ? library.length + (library.length === 1 ? ' material' : ' materials') + ' uploaded' : 'Upload your books & PDFs';
  count.textContent = library.length ? library.length : '';
  list.innerHTML = library.map(m => `
    <div class="material-card">
      <div class="material-head">
        <span class="material-emoji">${LIB_EXT_EMOJI[m.ext] || '📘'}</span>
        <div class="material-info">
          <b>${(m.name || 'Material').replace(/[<>]/g, '')}</b>
          <small>${m.topic}</small>
        </div>
        <button class="material-del" onclick="deleteMaterial(${m.id})" title="Remove">✕</button>
      </div>
      <div class="material-meta">
        <span>📄 ${m.pages} pg</span><span>🔤 ${m.words} words</span><span>🎯 ${m.confidence}% read</span>
      </div>
      <div class="material-actions">
        <button class="btn-ask-div" onclick="askAboutMaterial(${m.id})">🤖 Ask DIV about this</button>
      </div>
    </div>`).join('');
  empty.classList.toggle('hidden', library.length > 0);
}

/* ---------- Tests / Quiz ---------- */
let quiz = null;
function renderTestSubjects() {
  $('tests-subjects').innerHTML = profile.subjects.map(s =>
    `<button class="subject-card" data-quiz="${s}"><span class="sub-emoji">${SUB_EMOJI[s] || '📘'}</span>${s}</button>`).join('');
  $('tests-subjects').querySelectorAll('[data-quiz]').forEach(b =>
    b.addEventListener('click', () => startQuiz(b.dataset.quiz)));
}
function studentLevelLabel() {
  return profile.level === 'university' ? `university student of ${profile.uni}` : `${profile.class} secondary school student`;
}
async function startQuiz(subject) {
  go('quiz');
  $('quiz-loading').classList.remove('hidden');
  $('quiz-loading').querySelector('p').textContent = 'S.T.E.W AI is writing your quiz...';
  $('quiz-body').classList.add('hidden');
  $('quiz-result').classList.add('hidden');
  $('quiz-bar').style.width = '0%';
  const prompt = `Generate a 5-question multiple choice quiz for a ${studentLevelLabel()} on the subject "${subject}". Use clear questions with 4 options each. Vary difficulty (2 easy, 2 medium, 1 hard). Reply with ONLY valid JSON, no markdown, no extra text, exactly in this format: {"questions":[{"q":"question","options":["A","B","C","D"],"answer":0,"explain":"short explanation"}]} where "answer" is the 0-based index of the correct option.`;
  const raw = await stewChat(prompt, 'div_quiz');
  let questions = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      questions = parsed.questions && parsed.questions.filter(q => q.q && Array.isArray(q.options) && q.options.length === 4);
    }
  } catch (e) {}
  if (!questions || questions.length < 3) {
    showQuizResult(null, subject);
    return;
  }
  quiz = { subject, questions, idx: 0, score: 0 };
  $('quiz-loading').classList.add('hidden');
  $('quiz-body').classList.remove('hidden');
  renderQuizQuestion();
}
function renderQuizQuestion() {
  const q = quiz.questions[quiz.idx];
  const total = quiz.questions.length;
  $('quiz-bar').style.width = ((quiz.idx) / total * 100) + '%';
  $('quiz-count').textContent = `${quiz.idx + 1}/${total}`;
  $('quiz-question').textContent = q.q;
  const letters = ['A','B','C','D'];
  $('quiz-options').innerHTML = q.options.map((opt, i) =>
    `<button class="quiz-opt" data-i="${i}"><span class="opt-letter">${letters[i]}</span><span>${opt}</span></button>`).join('');
  $('quiz-options').querySelectorAll('.quiz-opt').forEach(btn =>
    btn.addEventListener('click', () => answerQuiz(parseInt(btn.dataset.i), btn)));
}
function answerQuiz(i, btn) {
  const q = quiz.questions[quiz.idx];
  const opts = $('quiz-options').querySelectorAll('.quiz-opt');
  opts.forEach(o => o.disabled = true);
  const letters = ['A','B','C','D'];
  const ans = typeof q.answer === 'string' ? letters.indexOf(q.answer.toUpperCase()) : (q.answer ?? 0);
  const correct = ans === i;
  if (correct) {
    btn.classList.add('correct');
    quiz.score += 10;
    if (navigator.vibrate) navigator.vibrate(40);
  } else {
    btn.classList.add('wrong');
    opts[ans].classList.add('correct');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  }
  const explain = document.createElement('div');
  explain.className = 'quiz-explain';
  explain.innerHTML = (correct ? '<b>✅ Correct!</b> ' : '<b>❌ Not quite.</b> ') + (q.explain || '');
  $('quiz-body').appendChild(explain);
  setTimeout(() => {
    explain.remove();
    quiz.idx += 1;
    if (quiz.idx >= quiz.questions.length) showQuizResult(quiz, quiz.subject);
    else renderQuizQuestion();
  }, correct ? 1400 : 2600);
}
function showQuizResult(q, subject) {
  $('quiz-body').classList.add('hidden');
  $('quiz-loading').classList.add('hidden');
  const res = $('quiz-result');
  res.classList.remove('hidden');
  $('quiz-bar').style.width = '100%';
  if (!q) {
    res.innerHTML = `<img src="img/mascot-small.png" class="float"><h2>Oops!</h2>
      <p>S.T.E.W AI had trouble building that quiz. Please try again.</p>
      <button class="btn-chunky btn-primary" onclick="go('tests')">Back to Tests</button>`;
    return;
  }
  progress.tests += 1;
  const pct = Math.round(quiz.score / (q.questions.length * 10) * 100);
  const bonus = pct === 100 ? 25 : 0;
  if (pct === 100) { if (!progress.badges.includes('Sharp Shooter 🎯')) { progress.badges.push('Sharp Shooter 🎯'); toast('🏅 Sharp Shooter badge earned!'); } }
  const subjData = progress.subjects[subject] || { tests: 0, total: 0 };
  subjData.tests += 1; subjData.total += pct;
  progress.subjects[subject] = subjData;
  addXP(quiz.score + bonus);
  const msg = pct === 100 ? 'PERFECT! You\'re a genius! 🤩' : pct >= 60 ? 'Great job! Keep it up! 🎉' : 'Keep practicing — you\'ll get it! 💪';
  res.innerHTML = `
    <img src="img/mascot.png" class="float">
    <h2>${pct === 100 ? 'Outstanding!' : pct >= 60 ? 'Well done!' : 'Nice try!'}</h2>
    <div class="score-line">${quiz.score} / ${q.questions.length * 10} (${pct}%)</div>
    <p>${msg}</p>
    ${bonus ? '<div class="xp-earned">+' + bonus + ' bonus XP 🎯</div>' : ''}
    <div class="xp-earned">+${quiz.score} XP ⚡</div>
    <p class="stew-credit">✨ Quiz made with S.T.E.W AI</p>
    <button class="btn-chunky btn-primary" onclick="startQuiz('${subject}')">Take Another</button>
    <button class="btn-chunky btn-teal" onclick="go('tests')">Choose Subject</button>`;
}

/* ---------- Assignments ---------- */
function renderAssignSubjects() {
  $('assign-subjects').innerHTML = profile.subjects.map(s =>
    `<button class="subject-card" data-assign="${s}"><span class="sub-emoji">${SUB_EMOJI[s] || '📘'}</span>${s}</button>`).join('');
  $('assign-subjects').querySelectorAll('[data-assign]').forEach(b =>
    b.addEventListener('click', () => startAssignment(b.dataset.assign)));
  $('assign-body').classList.add('hidden');
  $('assign-grade').classList.add('hidden');
}
async function startAssignment(subject) {
  $('assign-subjects').classList.add('hidden');
  $('assign-body').classList.remove('hidden');
  $('assign-grade').classList.add('hidden');
  $('assign-question').innerHTML = '<p><b>📝 S.T.E.W AI is writing your assignment...</b></p>';
  $('assign-answer').value = '';
  const prompt = `Give one clear, educational written assignment question for a ${studentLevelLabel()} on the subject "${subject}". It should require a short written answer of 1-3 paragraphs. Reply with ONLY the assignment question text, no numbering, no extra commentary.`;
  const q = await stewChat(prompt, 'div_assign');
  $('assign-question').innerHTML = `<b>📚 ${subject} Assignment</b><br><br>${q}`;
  $('assign-submit').onclick = submitAssignment;
  $('assign-submit').dataset.subject = subject;
  $('assign-submit').dataset.question = q;
}
async function submitAssignment() {
  const btn = $('assign-submit');
  const answer = $('assign-answer').value.trim();
  if (answer.length < 20) { toast('Write a bit more before submitting ✍️'); return; }
  btn.disabled = true; btn.textContent = 'Grading...';
  const subject = btn.dataset.subject, question = btn.dataset.question;
  const prompt = `You are grading this assignment. Subject: ${subject}. Level: ${studentLevelLabel()}.\n\nAssignment question: ${question}\n\nStudent's answer: ${answer}\n\nGrade it out of 10 and give friendly, encouraging feedback with 2-3 specific improvement tips. Reply in this format:\nSCORE: X/10\nFEEDBACK: your feedback here`;
  const result = await stewChat(prompt, 'div_grade');
  const scoreMatch = result.match(/(\d+)\s*\/\s*10/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
  progress.assignments += 1;
  addXP(15 + (score ? score * 2 : 0));
  $('assign-grade').classList.remove('hidden');
  $('assign-grade').innerHTML = `
    <h3>📊 Your Grade</h3>
    <div class="assign-score">${score !== null ? score + '/10' : 'Graded'}</div>
    <p>${result.replace(/SCORE:.*\n?/i, '').replace(/FEEDBACK:/i, '')}</p>
    <div class="xp-earned">+${15 + (score ? score * 2 : 0)} XP ⚡</div>
    <p class="stew-credit">✨ Graded by S.T.E.W AI</p>`;
  btn.disabled = false; btn.textContent = 'Submit for Grading';
  $('assign-grade').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- Progress ---------- */
const BADGES = ['First Steps 🌟','Curious Mind 💬','Quiz Rookie 📝','Sharp Shooter 🎯','On Fire 🔥','Bookworm 📚','Quiz Master 🏆','Brain Diamond 💎'];
function renderProgressUI() {
  $('prog-xp').textContent = progress.xp;
  $('prog-streak').textContent = progress.streak;
  $('prog-tests').textContent = progress.tests;
  $('badge-grid').innerHTML = BADGES.map(b => {
    const earned = progress.badges.includes(b) || (b === 'First Steps 🌟' && profile);
    return `<div class="badge ${earned ? 'earned' : ''}"><span class="badge-emoji">${b.split(' ').pop()}</span>${b.split(' ').slice(0, -1).join(' ')}</div>`;
  }).join('');
  const rows = Object.entries(progress.subjects).map(([s, d]) =>
    `<div class="score-row"><div><b>${SUB_EMOJI[s] || '📘'} ${s}</b><small>${d.tests} test${d.tests > 1 ? 's' : ''}</small></div>
     <span class="score-avg">${Math.round(d.total / d.tests)}%</span></div>`).join('');
  $('subject-scores').innerHTML = rows || '<p style="color:var(--ink-faint);font-weight:700">Take a test to see scores here 📝</p>';
}

/* ---------- Profile ---------- */
function renderProfile() {
  const p = profile;
  const pill = p.level === 'university' ? '🎓 University' : '🏫 ' + p.class;
  const detail = p.level === 'university' ? `${p.uni}<br>Matric/Reg: ${p.matric}` : (p.secSchool || 'Secondary student');
  $('profile-info').innerHTML = `<h3>${p.name}</h3><p>${detail}</p><span class="pill">${pill}</span>`;
  $('profile-subjects').innerHTML = p.subjects.map(s =>
    `<div class="chip-select selected">${SUB_EMOJI[s] || '📘'} ${s}</div>`).join('');
  $('set-voice').checked = settings.voice;
  $('set-rate').value = settings.rate || 1.0;
  $('rate-val').textContent = (settings.rate || 1.0).toFixed(1) + '×';
  if (authUser) {
    $('auth-card').innerHTML = `<div class="auth-line"><span class="auth-dot">✔</span> Signed in as <b>${authUser.email}</b></div>
      <button id="logout-btn" class="btn-chunky btn-danger-outline">Log Out</button>`;
    $('logout-btn').addEventListener('click', () => { fbLogout(); renderProfile(); });
  } else {
    $('auth-card').innerHTML = `<div class="auth-line"><span class="auth-dot">○</span> No account yet — your progress stays on this phone only.</div>
      <button id="signup-btn2" class="btn-chunky btn-teal">Create Account / Log In</button>`;
    $('signup-btn2').addEventListener('click', () => openAuth('signup', 'profile'));
  }
}

/* ---------- Settings wiring ---------- */
$('set-voice').addEventListener('change', e => {
  settings.voice = e.target.checked; voiceOut = e.target.checked; save();
  if (voiceOut) speak("Voice replies are on!");
});
$('set-rate').addEventListener('input', e => {
  settings.rate = parseFloat(e.target.value);
  $('rate-val').textContent = settings.rate.toFixed(1) + '×';
  if (window.DivNative) { try { window.DivNative.setRate(settings.rate); } catch (err) {} }
  save();
});
/* ---------- Auth wiring ---------- */
$('auth-btn').addEventListener('click', submitAuth);
$('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
$('auth-skip').addEventListener('click', () => {
  closeAuth();
  if (authFrom === 'onboard') obGo('2');
});

$('voice-pick-btn').addEventListener('click', openVoicePicker);
$('voice-modal-bg').addEventListener('click', closeVoiceModal);
$('voice-modal-close').addEventListener('click', closeVoiceModal);
function closeVoiceModal() { $('voice-modal').classList.remove('active'); }

$('clear-data').addEventListener('click', () => {
  if (confirm('Clear all your DIV data? This cannot be undone.')) {
    localStorage.clear(); location.reload();
  }
});

/* ---------- Chat wiring ---------- */
$('send-btn').addEventListener('click', () => sendChat($('chat-input').value));
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat($('chat-input').value); });
$('voice-toggle').addEventListener('click', () => {
  voiceOut = !voiceOut; settings.voice = voiceOut; save();
  $('voice-toggle').classList.toggle('on', voiceOut);
  $('voice-toggle').textContent = voiceOut ? '🔊' : '🔇';
  toast(voiceOut ? 'Voice replies on' : 'Voice replies off');
});
$('quiz-quit').addEventListener('click', () => go('tests'));

/* ---------- Install prompt ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('install-btn').classList.remove('hidden');
});
$('install-btn').addEventListener('click', async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
  else toast('Open browser menu → "Add to Home screen"');
});

/* ---------- Boot ---------- */
(function boot() {
  wakeServer();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  const splashDone = () => {
    $('splash').classList.add('hide');
    setTimeout(() => $('splash').classList.add('hidden'), 450);
    if (profile) {
      $('screen-onboarding').classList.add('hidden');
      $('app-main').classList.remove('hidden');
      go('home');
    } else {
      initOnboarding();
    }
    initVoice();
  };
  setTimeout(splashDone, 1500);
})();

/* ================= 3D ANIMATED MASCOT (Duolingo-style, everywhere) ================= */
function mascotSVG() {
  return `<div class="owl3d">
  <svg viewBox="0 0 200 215" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="206" rx="50" ry="8" fill="rgba(76,29,149,.25)"/>
    <ellipse cx="100" cy="150" rx="60" ry="57" fill="#8B5CF6"/>
    <ellipse cx="100" cy="163" rx="36" ry="33" fill="#EDE9FE"/>
    <ellipse class="wing-l" cx="44" cy="152" rx="15" ry="33" fill="#7C3AED" transform="rotate(12 44 152)"/>
    <ellipse class="wing-r" cx="156" cy="152" rx="15" ry="33" fill="#7C3AED" transform="rotate(-12 156 152)"/>
    <circle cx="100" cy="95" r="52" fill="#8B5CF6"/>
    <circle cx="100" cy="99" r="41" fill="#A78BFA"/>
    <g class="eye"><circle cx="82" cy="92" r="15" fill="#fff"/><circle cx="82" cy="94" r="7" fill="#312E81"/><circle cx="85" cy="90" r="2.4" fill="#fff"/></g>
    <g class="eye"><circle cx="118" cy="92" r="15" fill="#fff"/><circle cx="118" cy="94" r="7" fill="#312E81"/><circle cx="121" cy="90" r="2.4" fill="#fff"/></g>
    <circle cx="64" cy="110" r="7" fill="#F472B6" opacity=".5"/>
    <circle cx="136" cy="110" r="7" fill="#F472B6" opacity=".5"/>
    <path class="beak" d="M92 112 Q100 109 108 112 L100 125 Z" fill="#F59E0B"/>
    <ellipse class="mouth" cx="100" cy="118" rx="9" ry="5.5" fill="#92400E" style="display:none"/>
    <g class="hat">
      <path d="M62 63 L98 14 L140 60 Q100 48 62 63 Z" fill="#3B82F6"/>
      <ellipse cx="102" cy="62" rx="47" ry="10" fill="#2563EB"/>
      <path d="M98 14 L104 13 L102 22 Z" fill="#FDE68A"/>
      <circle cx="112" cy="40" r="4" fill="#FDE68A"/>
      <circle cx="90" cy="48" r="3" fill="#FDE68A"/>
    </g>
    <path d="M86 196 q-7 6 -12 5 M86 196 l0 9 M86 196 q7 6 12 5" stroke="#F59E0B" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M114 196 q-7 6 -12 5 M114 196 l0 9 M114 196 q7 6 12 5" stroke="#F59E0B" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg></div>`;
}
function setMascotState(id, state) {
  const wrap = $(id); if (!wrap) return;
  const owl = wrap.querySelector('.owl3d'); if (!owl) return;
  owl.classList.remove('talking', 'listening', 'thinking');
  if (state) owl.classList.add(state);
}
function initMascots() {
  ['mascot-home', 'mascot-chat', 'mascot-auth', 'mascot-live', 'mascot-live-big'].forEach(id => {
    const el = $(id);
    if (el && !el.querySelector('.owl3d')) el.innerHTML = mascotSVG();
  });
}
initMascots();

/* ================= LIVE TALK — VIDEO CALL WITH DIV ================= */
let liveActive = false, liveStream = null, liveScene = '', liveVisionTimer = null, liveBusy = false;

function liveCaption(html) { const c = $('live-caption'); c.innerHTML = html; c.scrollTop = c.scrollHeight; }

async function requestCameraAccess() {
  if (window.DivNative && window.DivNative.requestCamera) {
    return new Promise(res => {
      window.__div_onCameraPerm = ok => { window.__div_onCameraPerm = null; res(!!ok); };
      try { window.DivNative.requestCamera(); } catch (e) { res(false); }
      setTimeout(() => { if (window.__div_onCameraPerm) { window.__div_onCameraPerm = null; res(false); } }, 20000);
    });
  }
  return true; // web: getUserMedia will prompt itself
}

async function startLive() {
  if (liveActive) return;
  liveActive = true;
  initMascots();
  setMascotState('mascot-live', 'listening');
  setMascotState('mascot-live-big', 'listening');
  $('live-state').textContent = 'listening…';
  liveCaption('Tap the mic and talk to DIV — ask anything, show it anything!');
  try {
    const allowed = await requestCameraAccess();
    if (allowed && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      liveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
      $('live-video').srcObject = liveStream;
      $('live-offline').classList.add('hidden');
      $('live-vision-chip').classList.remove('hidden');
      // Silent scene awareness every 20s — DIV quietly keeps up with what it sees
      liveVisionTimer = setInterval(() => { if (!liveBusy) captureScene(false); }, 20000);
    }
  } catch (e) { /* audio-only call — fine */ }
  toast('📹 Live with DIV — say hi!');
}

function endLive() {
  if (!liveActive) return;
  liveActive = false;
  if (liveVisionTimer) { clearInterval(liveVisionTimer); liveVisionTimer = null; }
  if (liveStream) { liveStream.getTracks().forEach(t => t.stop()); liveStream = null; }
  $('live-video').srcObject = null;
  $('live-offline').classList.remove('hidden');
  $('live-vision-chip').classList.add('hidden');
  if (window.speechSynthesis) speechSynthesis.cancel();
}

async function captureScene(withQuestion) {
  if (!liveStream) { toast('Camera is off — DIV can\'t see 😅'); return ''; }
  const vid = $('live-video');
  try {
    const cv = document.createElement('canvas');
    const sc = Math.min(1, 480 / (vid.videoWidth || 480));
    cv.width = (vid.videoWidth || 480) * sc; cv.height = (vid.videoHeight || 640) * sc;
    cv.getContext('2d').drawImage(vid, 0, 0, cv.width, cv.height);
    const dataURL = cv.toDataURL('image/jpeg', 0.72);
    liveCaption(withQuestion ? '👁 <b>DIV:</b> Let me look…' : liveCaptionHTML());
    const r = await fetch(STEW_API + '/api/vision', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataURL,
        prompt: withQuestion
          ? 'You are DIV, a friendly AI tutor on a live video call with your student. ' + (typeof withQuestion === 'string' ? withQuestion : 'Describe what you see.') + ' Answer in 1-2 warm, short sentences as if speaking to the student directly.'
          : 'You are DIV on a live video call. Describe what you see in the camera frame in one short sentence (this is context only, no greeting).',
        detail: withQuestion ? 'detailed' : 'short'
      })
    });
    const d = await r.json();
    const desc = (d.description || '').trim();
    if (desc) {
      if (withQuestion) {
        liveCaption('👁 <b>DIV:</b> ' + desc);
        speakLive(desc);
      } else { liveScene = desc; }
    } else if (withQuestion) { liveCaption('👁 <b>DIV:</b> Hmm, I couldn\'t quite see that. Try again!'); }
    return desc;
  } catch (e) {
    if (withQuestion) liveCaption('👁 <b>DIV:</b> My eyes blinked — check your connection and try again.');
    return '';
  }
}
function liveCaptionHTML() { return $('live-caption').innerHTML; }

async function liveSend(text) {
  if (!text.trim() || liveBusy) return;
  liveBusy = true;
  $('live-mic-btn').classList.remove('rec');
  liveCaption('🗣 <b>You:</b> ' + text);
  setMascotState('mascot-live', 'thinking');
  $('live-state').textContent = 'thinking…';
  try {
    let scene = liveScene;
    // If they're asking about what DIV sees, look right now with their question
    if (liveStream && /(\bsee\b|\blook\b|\bshow|\bhold|\bwear|\bthis\b|\bthat\b|what am i|who am i)/i.test(text)) {
      scene = await captureScene(text);
    }
    let ctx = studentContext();
    if (scene) ctx += `[You are on a live video call with the student. You can see them through the camera. Current view: "${scene}". Speak naturally like a friendly tutor on a call — short warm replies.] `;
    const reply = await stewChat(ctx + text, 'div_' + (profile.name || 'student'));
    liveCaption('🦉 <b>DIV:</b> ' + reply);
    speakLive(reply);
  } catch (e) {
    liveCaption('🦉 <b>DIV:</b> Connection hiccup — try again in a second!');
  }
  liveBusy = false;
}

function speakLive(text) {
  setMascotState('mascot-live', 'talking');
  setMascotState('mascot-live-big', 'talking');
  $('live-state').textContent = 'talking…';
  const words = (text.split(/\s+/).length) || 5;
  const estMs = Math.min(30000, Math.max(1800, words * 380));
  speak(text);
  setTimeout(() => {
    if (liveActive) { setMascotState('mascot-live', 'listening'); setMascotState('mascot-live-big', 'listening'); $('live-state').textContent = 'listening…'; }
  }, estMs);
}

/* Live Talk wiring */
$('live-mic-btn').addEventListener('click', () => {
  const btn = $('live-mic-btn');
  if (btn.classList.contains('rec')) { btn.classList.remove('rec'); startVoiceInput(); return; }
  btn.classList.add('rec'); startVoiceInput();
  setTimeout(() => btn.classList.remove('rec'), 9000);
});
$('live-eye-btn').addEventListener('click', () => { if (!liveBusy) captureScene('What do you see right now? Describe it.'); });
$('live-end-btn').addEventListener('click', () => { endLive(); go('home'); toast('📞 Call ended'); });
