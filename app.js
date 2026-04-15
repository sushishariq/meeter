const TAGS = ['Coffee','Books','Music','Sports','Gaming','Coding','Movies','Cycling','Art','Photography','Food','Stargazing','Chess','Dance','Debate','Anime','Travel','Yoga','Poetry','Finance'];

let currentUser = null;
let selectedTags = [];
let selectedMeetType = null;

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// -------------- UI State -------------

function switchTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.toggle('active', content.id === `tab-${tabName}`));

  if (tabName === 'mymeets') fetchMyMeets();
  if (tabName === 'leaderboard') fetchLeaderboard();
  
  if(currentUser) {
    document.getElementById('credits-display').textContent = currentUser.credits.toFixed(1);
  }
}

function renderTags() {
  const container = document.getElementById('tags-container');
  container.innerHTML = '';
  TAGS.forEach((tag) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `tag-pill ${selectedTags.includes(tag) ? 'selected' : ''}`;
    pill.textContent = tag;
    pill.addEventListener('click', () => toggleTag(tag, pill));
    container.appendChild(pill);
  });
}

function toggleTag(tag, element) {
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter(t => t !== tag);
    element.classList.remove('selected');
    return;
  }
  if (selectedTags.length >= 2) {
    showToast('Max 2 interests allowed.', 'error');
    return;
  }
  selectedTags.push(tag);
  element.classList.add('selected');
}

function selectMeetType(type) {
  selectedMeetType = type;
  document.getElementById('opt-solo').classList.toggle('selected', type === 'solo');
  document.getElementById('opt-squad').classList.toggle('selected', type === 'squad');
}

function resetSelection() {
  selectedTags = [];
  selectedMeetType = null;
  renderTags();
  document.getElementById('opt-solo').classList.remove('selected');
  document.getElementById('opt-squad').classList.remove('selected');
}

// -------------- APIs -------------

async function fetchMyMeets() {
  try {
    const res = await fetch('/api/meets');
    if (!res.ok) return showToast('Failed to load meets.', 'error');
    const data = await res.json();
    renderMyMeetsList(data.meets);
  } catch(e) {
    console.error(e);
  }
}

async function fetchLeaderboard() {
  try {
    const meRes = await fetch('/api/user/me');
    if(meRes.ok) currentUser = (await meRes.json()).user;
    
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Your Credits</div><div class="stat-value accent">${currentUser.credits.toFixed(1)}</div></div>
      <div class="stat-card"><div class="stat-label">Meets Created</div><div class="stat-value">${currentUser.meetsCreated || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Meets Completed</div><div class="stat-value">${currentUser.meetsCompleted || 0}</div></div>
    `;

    const lbRes = await fetch('/api/user/leaderboard');
    if (!lbRes.ok) return;
    const { leaderboard } = await lbRes.json();
    
    document.getElementById('lb-list').innerHTML = leaderboard.map((entry, idx) => `
      <div class="lb-row">
        <span class="lb-rank">${idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':`${idx+1}.`}</span>
        <div class="lb-name">${entry.nickname}<span>${entry.gender} · ${entry.age}</span></div>
        <span class="lb-credits">${entry.credits.toFixed(1)} ✦</span>
      </div>
    `).join('');
  } catch(e) {
    console.error(e);
  }
}

async function submitMeetRequest() {
  const errEl = document.getElementById('home-error');
  if (!selectedMeetType) return errEl.textContent = 'Pick a meet type first.';
  if (selectedTags.length === 0) return errEl.textContent = 'Pick at least one interest.';
  
  errEl.textContent = '';
  document.getElementById('find-btn').disabled = true;

  try {
    const res = await fetch('/api/meets/request', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ type: selectedMeetType, tags: selectedTags })
    });
    const data = await res.json();
    document.getElementById('find-btn').disabled = false;
    
    if(!res.ok) {
       return showToast(data.error || 'Failed to submit', 'error');
    }
    
    const rep = await fetch('/api/user/me');
    currentUser = (await rep.json()).user;
    document.getElementById('credits-display').textContent = currentUser.credits.toFixed(1);

    if (data.status === 'matched') {
       spawnConfetti();
       showMatchModal(data.meet);
    } else {
       showToast('Request submitted! Waiting for a match...', 'success');
       switchTab('mymeets');
    }
    resetSelection();
  } catch(e) {
    document.getElementById('find-btn').disabled = false;
    showToast('Network error', 'error');
  }
}

async function confirmAttendance(meetId, result) {
  try {
    const res = await fetch(`/api/meets/${meetId}/confirm`, {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ result })
    });
    const data = await res.json();
    if(res.ok) {
      if(data.reward) spawnConfetti();
      showToast(data.message, 'success');
      
      const meRes = await fetch('/api/user/me');
      if(meRes.ok) {
        currentUser = (await meRes.json()).user;
        document.getElementById('credits-display').textContent = currentUser.credits.toFixed(1);
      }
      fetchMyMeets();
    } else {
      showToast(data.error || 'Error confirming', 'error');
    }
  } catch(e) {
    showToast('Network issue', 'error');
  }
}

async function handleProfileComplete(e) {
  e.preventDefault();
  const nickname = document.getElementById('su-nick').value.trim();
  const gender = document.getElementById('su-gender').value;
  const age = document.getElementById('su-age').value;
  const errEl = document.getElementById('su-error');

  if (!nickname || !gender || !age) {
    errEl.textContent = 'All fields are required.';
    return;
  }
  
  try {
    const res = await fetch('/auth/complete-profile', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nickname, gender, age })
    });
    const data = await res.json();
    if(res.ok) {
       window.location.href = '/';
    } else {
       errEl.textContent = data.error || 'Failed to complete profile';
    }
  } catch(err) {
    errEl.textContent = 'Network error.';
  }
}

async function handleLogout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

function loadApp() {
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  document.getElementById('user-nickname').textContent = currentUser.nickname;
  document.getElementById('user-avatar').textContent = currentUser.nickname.slice(0, 2).toUpperCase();
  document.getElementById('credits-display').textContent = currentUser.credits.toFixed(1);

  renderTags();
  switchTab('home');
  // clear URL params if they exist to keep it clean
  window.history.replaceState({}, document.title, "/");
}

// -------------- Rendering Lists -------------

function renderMyMeetsList(meets) {
  const container = document.getElementById('meets-container');
  if (!meets || meets.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌙</div><p>No meets yet. Go find one!</p></div>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'meets-list';

  meets.forEach(meet => {
    const isPending = meet.status === 'pending';
    const waitMinutes = isPending ? Math.floor((Date.now() - new Date(meet.createdAt).getTime()) / 60000) : 0;
    
    const others = meet.nicknames.filter((_, idx) => meet.participants[idx] !== currentUser.email);
    const userConfirmation = meet.confirmations ? meet.confirmations[currentUser.email] : null;

    const item = document.createElement('div');
    item.className = 'meet-item';

    let headerHTML = `<div class="meet-item-header">
      <span class="meet-type-badge ${meet.type==='solo'?'badge-solo':(isPending?'badge-pending':'badge-squad')}">${meet.type==='solo'?'1-on-1':'Squad'}</span>
      ${isPending ? `<span class="waiting-chip"><span class="pulse">●</span> Matching... ${waitMinutes}m wait</span>` 
                  : `<span style="font-size:0.82rem;color:var(--text3);">${meet.date} · ${meet.time}</span>`}
    </div>`;

    item.innerHTML = headerHTML + `
      <div class="meet-venue">${isPending ? 'Waiting for a match' : meet.venue}</div>
      <div class="meet-meta">Interests: ${meet.tags.join(', ')}</div>
      ${isPending ? '' : `<div class="meet-people">${others.map(n => `<span class="person-chip">👤 ${n}</span>`).join('')}</div>`}
    `;

    if (!isPending) {
       if (userConfirmation) {
         const confirmedP = document.createElement('span');
         confirmedP.className = 'confirmed-label';
         confirmedP.innerHTML = `✓ You confirmed attendance`;
         item.appendChild(confirmedP);
       } else if (meet.status === 'matched') {
         const confirmRow = document.createElement('div');
         confirmRow.className = 'confirm-row';
         confirmRow.innerHTML = `
           <span style="font-size:0.82rem;color:var(--text2);align-self:center;">Did everyone show up?</span>
           <button type="button" class="btn-sm btn-green">✓ Yes</button>
           <button type="button" class="btn-sm btn-red">✗ No</button>
         `;
         confirmRow.querySelector('.btn-green').onclick = () => confirmAttendance(meet._id, 'showed');
         confirmRow.querySelector('.btn-red').onclick = () => confirmAttendance(meet._id, 'noshow');
         item.appendChild(confirmRow);
       }
    }
    list.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

// -------------- Modals -------------
function showMatchModal(meet) {
  const others = meet.nicknames.filter((_, idx) => meet.participants[idx] !== currentUser.email);
  const subtitle = meet.type === 'solo' ? `You're meeting ${others[0]}!` : 'You are joining a squad!';
  
  document.getElementById('match-modal-subtitle').textContent = subtitle;
  const details = [
    ['With', others.join(', ')],
    ['Venue', meet.venue],
    ['Date', meet.date],
    ['Time', meet.time],
    ['Vibe', meet.tags.join(', ')],
  ];
  document.getElementById('match-modal-details').innerHTML = details.map(([label, val]) => 
    `<div class="modal-detail-row"><span class="modal-detail-label">${label}</span><span class="modal-detail-value">${val}</span></div>`
  ).join('');

  document.getElementById('match-modal').classList.add('open');
}

function spawnConfetti() {
  const colors = ['#b48ef4', '#7c5cbf', '#6dd9a3', '#f0c96a', '#5b9ef4', '#f06f6f'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `left: ${Math.random()*100}vw; top: -20px; background: ${colors[Math.floor(Math.random()*colors.length)]}; border-radius: ${Math.random()>0.5?'50%':'2px'}; animation-duration: ${0.8+Math.random()*1.5}s; animation-delay: ${Math.random()*0.5}s;`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

// -------------- Lifecycles -------------

function setupEventListeners() {
  document.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.getElementById('opt-solo').addEventListener('click', () => selectMeetType('solo'));
  document.getElementById('opt-squad').addEventListener('click', () => selectMeetType('squad'));
  if (document.getElementById('logout-button')) document.getElementById('logout-button').addEventListener('click', handleLogout);
  if (document.getElementById('find-btn')) document.getElementById('find-btn').addEventListener('click', submitMeetRequest);
  if (document.getElementById('close-modal-button')) document.getElementById('close-modal-button').addEventListener('click', () => document.getElementById('match-modal').classList.remove('open'));
  if (document.getElementById('modal-confirm-button')) document.getElementById('modal-confirm-button').addEventListener('click', () => document.getElementById('match-modal').classList.remove('open'));
  if (document.getElementById('complete-profile-form')) document.getElementById('complete-profile-form').addEventListener('submit', handleProfileComplete);

  // Theme Toggle Logic
  const themeBtn = document.getElementById('theme-toggle-btn');
  const root = document.documentElement;
  if (localStorage.getItem('theme') === 'light') {
    root.setAttribute('data-theme', 'light');
    if (themeBtn) themeBtn.textContent = '🌙';
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      root.setAttribute('data-theme', isLight ? 'dark' : 'light');
      localStorage.setItem('theme', isLight ? 'dark' : 'light');
      themeBtn.textContent = isLight ? '☀️' : '🌙';
    });
  }
}

async function init() {
  setupEventListeners();
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('error') === 'domain_invalid') {
    showToast('Login Failed: Only @kgpian.iitkgp.ac.in emails allowed!', 'error');
  }
  
  if (params.get('signup') === 'true') {
     document.getElementById('google-login-box').classList.add('hidden');
     document.getElementById('complete-profile-form').classList.remove('hidden');
     return;
  }
  
  try {
    const res = await fetch('/api/user/me');
    if (!res.ok) throw new Error('Unauthed');
    const data = await res.json();
    currentUser = data.user;
    loadApp();
  } catch(e) {
    document.getElementById('screen-app').classList.remove('active');
    document.getElementById('screen-auth').classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
