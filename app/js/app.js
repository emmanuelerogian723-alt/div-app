/* ============ DIV — AI Learning App ============
   Powered by S.T.E.W API (https://stew-agent.onrender.com)
=================================================== */
const STEW_API = 'https://stew-agent.onrender.com';
const $ = id => document.getElementById(id);

/* ---------- Subjects ---------- */
const SUBJECTS = [
  ['Mathematics','➗'],['English Language','📖'],['Physics','🔬'],['Chemistry','⚗️'],
  ['Biology','🌿'],['Economics','📈'],['Government','🏛️'],['Literature','📚'],
  ['Geography','🗺️'],['History','⏳'],['Agricultural Science','🌾'],['Computer Science','💻'],
  ['Further Mathematics','📐'],['Commerce','🛒'],['Financial Accounting','🧾'],
  ['Civic Education','🤝'],['CRS','✝️'],['IRS','☪️'],['French','🇫🇷']
];
const SUB_EMOJI = Object.fromEntries(SUBJECTS);

/* ---------- State ---------- */
let profile = JSON.parse(localStorage.getItem('div_profile') || 'null');
let progress = JSON.parse(localStorage.getItem('div_progress') || 'null') || {
  xp: 0, streak: 0, lastDay: '', todayXP: 0, questions: 0, tests: 0, assignments: 0,
  subjects: {}, badges: []
};
let settings = JSON.parse(localStorage.getItem('div_settings') || 'null') || { voice: true };
const save = () => {
  localStorage.setItem('div_profile', JSON.stringify(profile));
  localStorage.setItem('div_progress', JSON.stringify(progress));
  localStorage.setItem('div_settings', JSON.stringify(settings));
};

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

/* ---------- S.T.E.W API ---------- */
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
    if (e.name === 'AbortError') return "⏳ I'm taking too long — the S.T.E.W server might be waking up. Please try again in a moment!";
    return "😕 Connection hiccup. Check your internet and try again.";
  } finally { clearTimeout(timer); }
}
function studentContext() {
  if (!profile) return '';
  if (profile.level === 'university')
    return `[You are tutoring ${profile.name}, a university student of ${profile.uni}. Their subjects: ${profile.subjects.join(', ')}.] `;
  return `[You are tutoring ${profile.name}, a ${profile.class} secondary school student${profile.secSchool ? ' at ' + profile.secSchool : ''}. Their subjects: ${profile.subjects.join(', ')}.] `;
}
async function wakeServer() {
  fetch(`${STEW_API}/heartbeat`).catch(() => {});
}

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
  const map = { assignments: 'screen-assignments' };
  const el = $(map[screen] || `screen-${screen}`);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.go === screen));
  if (screen === 'home') renderHome();
  if (screen === 'tests') renderTestSubjects();
  if (screen === 'assignments') renderAssignSubjects();
  if (screen === 'progress') renderProgressUI();
  if (screen === 'profile') renderProfile();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});

/* ---------- Onboarding ---------- */
let obLevel = null, obClass = null, obSubjects = [];
function renderObSubjects() {
  $('ob-subjects').innerHTML = SUBJECTS.map(([name, emoji]) =>
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
  const bars = { 1: 20, 2: 40, '3u': 60, '3s': 60, 4: 80, 5: 95 };
  $('ob-bar').style.width = (bars[step] || 20) + '%';
}
function finishOnboarding() {
  profile = {
    name: $('student-name').value.trim() || 'Student',
    level: obLevel,
    class: obLevel === 'secondary' ? obClass : null,
    secSchool: obLevel === 'secondary' ? ($('sec-school').value.trim() || null) : null,
    uni: obLevel === 'university' ? $('uni-name').value.trim() : null,
    matric: obLevel === 'university' ? $('matric-no').value.trim() : null,
    subjects: obSubjects
  };
  save();
  $('screen-onboarding').classList.add('hidden');
  $('app-main').classList.remove('hidden');
  addXP(10);
  toast('🌟 Welcome to DIV, ' + profile.name + '!');
  go('home');
}
function initOnboarding() {
  renderObSubjects();
  $('ob-bar').style.width = '20%';
  document.querySelectorAll('.ob-next').forEach(btn => btn.addEventListener('click', () => {
    const goto = btn.dataset.goto;
    if (goto === 'finish') { finishOnboarding(); return; }
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
    setTimeout(() => obGo(obLevel === 'university' ? '3u' : '3s'), 300);
  }));
  document.querySelectorAll('[data-class]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-class]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    obClass = btn.dataset.class;
    const cont = document.querySelector('.ob-step[data-step="3s"] .btn-chunky');
    if (cont) cont.disabled = false;
  }));
  // Continue button on the secondary step
  const secCont = document.createElement('button');
  secCont.className = 'btn-chunky btn-primary';
  secCont.textContent = 'Continue →';
  secCont.disabled = true;
  secCont.addEventListener('click', () => obGo('4'));
  document.querySelector('.ob-step[data-step="3s"]').appendChild(secCont);
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

/* ---------- Tutor Chat ---------- */
let voiceOut = settings.voice;
function addMsg(role, text) {
  const wrap = $('chat-messages');
  wrap.querySelector('.msg-welcome')?.remove();
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}
function speak(text) {
  if (!voiceOut || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[⚠️✅❌🔊🎙️📝📚🏆🌟💬😀😊🙂🔥⚡]/g, '').slice(0, 600));
  u.rate = 1.02; u.pitch = 1.05;
  const voices = speechSynthesis.getVoices();
  const pref = voices.find(v => /Google UK English Female|Samantha|Google US English/i.test(v.name));
  if (pref) u.voice = pref;
  speechSynthesis.speak(u);
}
async function sendChat(text) {
  if (!text.trim()) return;
  addMsg('user', text);
  $('chat-input').value = '';
  $('typing-row').classList.remove('hidden');
  $('chat-status').textContent = 'Thinking...';
  progress.questions += 1; addXP(5);
  try {
    const reply = await stewChat(studentContext() + text, 'div_' + (profile.name || 'student'));
    $('typing-row').classList.add('hidden');
    addMsg('bot', reply);
    speak(reply);
    $('chat-status').textContent = 'Online — always ready';
  } catch (e) {
    $('typing-row').classList.add('hidden');
    addMsg('bot', "😕 I couldn't reach the AI. Try again!");
  }
}
/* Voice input */
let recog = null, recognizing = false;
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('mic-btn').style.display = 'none'; return; }
  recog = new SR();
  recog.lang = 'en-NG'; recog.interimResults = false; recog.maxAlternatives = 1;
  recog.onstart = () => { recognizing = true; $('mic-btn').classList.add('rec'); $('recording-badge').classList.remove('hidden'); };
  recog.onend = () => { recognizing = false; $('mic-btn').classList.remove('rec'); $('recording-badge').classList.add('hidden'); };
  recog.onresult = e => {
    const text = e.results[0][0].transcript;
    $('chat-input').value = text;
    setTimeout(() => sendChat(text), 300);
  };
  recog.onerror = () => { recognizing = false; toast('Voice not available — type instead'); };
  $('mic-btn').addEventListener('click', () => recognizing ? recog.stop() : recog.start());
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
    opts[q.answer ?? 0].classList.add('correct');
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
      <p>I had trouble building that quiz. Please try again.</p>
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
  $('assign-question').innerHTML = '<p><b>📝 DIV is writing your assignment...</b></p>';
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
    <div class="xp-earned">+${15 + (score ? score * 2 : 0)} XP ⚡</div>`;
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
}
$('set-voice').addEventListener('change', e => { settings.voice = e.target.checked; voiceOut = e.target.checked; save(); });
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

/* ---------- Quiz quit ---------- */
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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (profile) {
    $('screen-onboarding').classList.add('hidden');
    $('app-main').classList.remove('hidden');
    go('home');
  } else {
    initOnboarding();
  }
  initVoice();
})();
