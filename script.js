// ========================================================
// Konfigurasi Supabase
// ========================================================
const SUPABASE_URL = "https://ihkftmiucpttbrawddub.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Srgrliy-MvWA2JnGp7Q8jw_xJBY8DP1";

// URL foto profil dosen (dari Supabase Storage)
const photoUrl = "https://ihkftmiucpttbrawddub.supabase.co/storage/v1/object/sign/foto-profil/poto%20dosen.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yOWE4MDI3ZS0zOTNjLTRhNzktODFhNi1hYzBlOTY1MjBlODIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJmb3RvLXByb2ZpbC9wb3RvIGRvc2VuLmpwZWciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzMzAyMTIzLCJleHAiOjE4MTQ4MzgxMjN9.tSZh_QsNIX2XNtsBEAwzY2pC5mj14-hocRbBslsB-gI";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let pendingLink = null;
let photos = [];
let currentSlide = 0;
let autoplayTimer = null;
let lightboxIndex = 0;
const AUTOPLAY_MS = 4000;

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
  await sb.rpc('increment_views', { link_id: pendingLink.id });

  document.getElementById('guestModal').style.display = 'none';
  document.getElementById('guestName').value = '';

  renderLinks();
  renderVisitors();

  if(pendingLink.url && pendingLink.url !== '#'){
    window.open(pendingLink.url, '_blank');
  }
  return false;
}

/* ===================== GALERI FOTO (slider) ===================== */
async function renderPhotos(){
  const { data, error } = await sb.from('foto').select('*').order('urutan', { ascending: true }).order('id');
  photos = (!error && data) ? data : [];
  buildSlider();
}

function buildSlider(){
  const track = document.getElementById('sliderTrack');
  const dotsWrap = document.getElementById('sliderDots');
  if(!track || !dotsWrap) return;

  if(!photos.length){
    track.innerHTML = `<div class="empty-note" style="flex:0 0 100%;"> Tambahkan Poto lewat Panel Pemilik di bawah.</div>`;
    dotsWrap.innerHTML = '';
    stopAutoplay();
    return;
  }

  track.innerHTML = photos.map((p, i) => `
    <div class="slide" onclick="openLightbox(${i})">
      <img src="${p.url}" alt="${(p.keterangan || 'Foto galeri').replace(/"/g,'&quot;')}" loading="lazy">
      ${p.keterangan ? `<div class="slide-caption">${p.keterangan}</div>` : ''}
    </div>
  `).join('');

  dotsWrap.innerHTML = photos.map((_, i) =>
    `<span class="dot-ind" onclick="goToSlide(${i})"></span>`
  ).join('');

  currentSlide = 0;
  updateSliderPosition();
  startAutoplay();
}

function updateSliderPosition(){
  const track = document.getElementById('sliderTrack');
  if(!track) return;
  track.style.transform = `translateX(-${currentSlide * 100}%)`;
  document.querySelectorAll('.dot-ind').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}

function goToSlide(i, keepAutoplay){
  if(!photos.length) return;
  currentSlide = (i + photos.length) % photos.length;
  updateSliderPosition();
  if(!keepAutoplay) startAutoplay();
}

function nextSlide(){ goToSlide(currentSlide + 1); }
function prevSlide(){ goToSlide(currentSlide - 1); }

function startAutoplay(){
  stopAutoplay();
  if(photos.length > 1){
    autoplayTimer = setInterval(() => goToSlide(currentSlide + 1, true), AUTOPLAY_MS);
  }
}
function stopAutoplay(){
  if(autoplayTimer){ clearInterval(autoplayTimer); autoplayTimer = null; }
}

/* ===== Lightbox (tampilan fullscreen saat foto diklik) ===== */
function openLightbox(i){
  if(!photos.length) return;
  lightboxIndex = i;
  updateLightboxContent();
  document.getElementById('lightboxModal').style.display = 'flex';
  stopAutoplay();
}

function closeLightbox(){
  document.getElementById('lightboxModal').style.display = 'none';
  startAutoplay();
}

function updateLightboxContent(){
  const p = photos[lightboxIndex];
  document.getElementById('lightboxImg').src = p.url;
  document.getElementById('lightboxImg').alt = p.keterangan || 'Foto galeri';
  document.getElementById('lightboxCaption').textContent = p.keterangan || '';
}

function lightboxNext(){
  lightboxIndex = (lightboxIndex + 1) % photos.length;
  updateLightboxContent();
}
function lightboxPrev(){
  lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length;
  updateLightboxContent();
}

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('lightboxModal');
  if(!modal || modal.style.display === 'none') return;
  if(e.key === 'Escape') closeLightbox();
  if(e.key === 'ArrowRight') lightboxNext();
  if(e.key === 'ArrowLeft') lightboxPrev();
});

function toggleOwnerPhotoForm(){
  const form = document.getElementById('ownerPhotoForm');
  const chev = document.getElementById('chevronPhoto');
  form.classList.toggle('open');
  chev.style.transform = form.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
}

const PHOTO_BUCKET = 'foto-galeri';

async function addPhoto(e){
  e.preventDefault();
  const fileInput = document.getElementById('inPhotoFile');
  const urlInput = document.getElementById('inPhotoUrl');
  const keterangan = document.getElementById('inPhotoDesc').value.trim();
  const statusEl = document.getElementById('photoUploadStatus');
  const btn = document.getElementById('addPhotoBtn');
  const file = fileInput.files[0];
  let url = urlInput.value.trim();

  if(!file && !url){
    alert('Pilih file JPG/PNG atau isi URL gambar dulu.');
    return false;
  }

  btn.disabled = true;

  if(file){
    const ext = file.name.split('.').pop();
    const path = `foto-${Date.now()}.${ext}`;
    statusEl.textContent = 'Mengunggah file...';

    const { error: uploadError } = await sb.storage.from(PHOTO_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

    if(uploadError){
      statusEl.textContent = '';
      btn.disabled = false;
      alert('Gagal upload file. Pastikan bucket "foto-galeri" sudah dibuat dan kamu sudah login.');
      console.log('Detail error upload foto:', uploadError);
      return false;
    }

    const { data: publicUrlData } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    url = publicUrlData.publicUrl;
  }

  statusEl.textContent = 'Menyimpan...';
  const { error } = await sb.from('foto').insert({ url, keterangan });

  statusEl.textContent = '';
  btn.disabled = false;

  if(error){
    alert('Gagal menambah foto. Pastikan kamu sudah login.');
    console.log('Detail error tambah foto:', error);
    return false;
  }

  fileInput.value = '';
  urlInput.value = '';
  document.getElementById('inPhotoDesc').value = '';
  renderPhotos();
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
  document.getElementById('ownerPhotoPanel').style.display = isLoggedIn ? 'block' : 'none';
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
renderPhotos();
checkLoginStatus();