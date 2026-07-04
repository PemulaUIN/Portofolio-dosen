// ========================================================
// GANTI DUA NILAI INI dengan punya kamu dari Supabase:
// Settings -> API -> Project URL & anon public key
// ========================================================
const SUPABASE_URL = "https://ihkftmiucpttbrawddub.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Srgrliy-MvWA2JnGp7Q8jw_xJBY8DP1";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let pendingLink = null;

function initials(text){
  return text.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ===================== TAUTAN ===================== */
async function renderLinks(){
  const grid = document.getElementById('linkGrid');
  const { data, error } = await sb.from('tautan').select('*').order('id');

  if(error || !data || data.length === 0){
    grid.innerHTML = `<div class="empty-note">Belum ada tautan. Tambahkan lewat Panel Pemilik di bawah.</div>`;
    return;
  }

  grid.innerHTML = data.map(l => `
    <div class="link-card" onclick='requestOpenLink(${JSON.stringify(l)})'>
      <div class="link-icon">${initials(l.title)}</div>
      <h3>${l.title}</h3>
      <p>${l.keterangan || ''}</p>
      <div class="link-meta">
        <span class="views">${l.views} dilihat</span>
        <span class="go">buka -></span>
      </div>
    </div>
  `).join('');
}

/* ===================== PENGUNJUNG (cuma nama) ===================== */
async function renderVisitors(){
  const list = document.getElementById('visitorList');
  const oneDayAgo = new Date(Date.now() - 24*60*60*1000).toISOString();

  const { data, error } = await sb.from('pengunjung')
    .select('*')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(8);

  if(error || !data || data.length === 0){
    list.innerHTML = `<div class="empty-note">Belum ada riwayat. Klik salah satu tautan di atas.</div>`;
    return;
  }

  list.innerHTML = data.map(v => `
    <div class="v-row">
      <div class="v-avatar">${initials(v.nama)}</div>
      <div class="v-name">${v.nama}</div>
      <div class="v-link">${v.link || '-'}</div>
      <div class="v-time">${new Date(v.created_at + 'Z').toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Jakarta'})}</div>
    </div>
  `).join('');
}

function requestOpenLink(link){
  pendingLink = link;
  document.getElementById('guestModal').style.display = 'flex';
}

async function submitGuestForm(e){
  e.preventDefault();
  const nama = document.getElementById('guestName').value.trim();
  if(!nama) return false;

  await sb.from('pengunjung').insert({ nama, link: pendingLink.title });
  await sb.from('tautan').update({ views: pendingLink.views + 1 }).eq('id', pendingLink.id);

  document.getElementById('guestModal').style.display = 'none';
  document.getElementById('guestName').value = '';

  renderLinks();
  renderVisitors();

  if(pendingLink.url && pendingLink.url !== '#'){
    window.open(pendingLink.url, '_blank');
  }
  return false;
}

/* ===================== LOGIN OWNER ===================== */
function toggleLoginBox(){
  const box = document.getElementById('loginModal');
  box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}

async function doLogin(e){
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){
    document.getElementById('loginError').textContent = 'Email atau password salah.';
    console.log('Detail error login:', error);
    return false;
  }

  document.getElementById('loginModal').style.display = 'none';
  setLoggedInUI(true);
  return false;
}

async function doLogout(){
  await sb.auth.signOut();
  setLoggedInUI(false);
}

function setLoggedInUI(isLoggedIn){
  const btn = document.getElementById('loginToggleBtn');
  document.getElementById('ownerPanel').style.display = isLoggedIn ? 'block' : 'none';
  btn.textContent = isLoggedIn ? 'Keluar' : 'Masuk';
  btn.onclick = isLoggedIn ? doLogout : toggleLoginBox;
}

async function checkLoginStatus(){
  const { data } = await sb.auth.getSession();
  if(data.session) setLoggedInUI(true);
}

/* ===================== PANEL PEMILIK: tambah tautan ===================== */
function toggleOwnerForm(){
  const form = document.getElementById('ownerForm');
  const chev = document.getElementById('chevron');
  form.classList.toggle('open');
  chev.style.transform = form.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
}

async function addLink(e){
  e.preventDefault();
  const title = document.getElementById('inTitle').value.trim();
  const url = document.getElementById('inUrl').value.trim();
  const keterangan = document.getElementById('inDesc').value.trim();
  if(!title || !url) return false;

  const { error } = await sb.from('tautan').insert({ title, url, keterangan, views: 0 });
  if(error){
    alert('Gagal menambah tautan. Pastikan kamu sudah login.');
    console.log('Detail error tambah tautan:', error);
    return false;
  }

  document.getElementById('inTitle').value = '';
  document.getElementById('inUrl').value = '';
  document.getElementById('inDesc').value = '';
  renderLinks();
  return false;
}

/* ===================== MENU MOBILE ===================== */
function toggleNav(){
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('navToggle').classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#navLinks a').forEach(a => {
    a.addEventListener('click', () => {
      document.getElementById('navLinks').classList.remove('open');
      document.getElementById('navToggle').classList.remove('open');
    });
  });
});

/* ===================== ACCORDION "TENTANG" ===================== */
function toggleAbout(headEl){
  const currentCard = headEl.closest('.about-card');
  const isOpen = currentCard.classList.contains('open');
  document.querySelectorAll('.about-card').forEach(card => card.classList.remove('open'));
  if(!isOpen) currentCard.classList.add('open');
}

/* ===================== FOTO PROFIL ===================== */
const photoUrl = "";

function renderPhoto(){
  const img = document.getElementById('profilePhoto');
  const placeholder = document.getElementById('avatarPlaceholder');
  if(!img || !placeholder) return;
  if(photoUrl){
    img.src = photoUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

/* ===================== INIT ===================== */
renderLinks();
renderVisitors();
renderPhoto();
checkLoginStatus();