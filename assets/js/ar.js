const scene = document.querySelector('a-scene');
const status = document.getElementById('status');
const start = document.getElementById('start');
const retry = document.getElementById('retry');
const photos = Array.from(document.querySelectorAll('#photos img'));
const selectedPhoto = document.getElementById('selected-photo');
const photoBackground = document.getElementById('photo-background');
const previousPhoto = document.getElementById('previous-photo');
const nextPhoto = document.getElementById('next-photo');
const photoCaptionSource = document.getElementById('photo-caption-source');
const photoLoadStatus = document.getElementById('photo-load-status');
let selectedIndex = 0;
let photoRequest = 0;

function setPhotoVisible(visible) {
  selectedPhoto.setAttribute('visible', visible);
  photoBackground.setAttribute('visible', visible);
}

function revealPhoto() {
  const photo = photos[selectedIndex];
  const ready = selectedPhoto.getObject3D('mesh')?.material.map?.image === photo &&
    photo.complete && photo.naturalWidth > 0;
  setPhotoVisible(ready);
  if (ready) photoLoadStatus.textContent = '';
}

async function showPhoto(index) {
  if (!photos.length) return;
  const request = ++photoRequest;
  selectedIndex = Math.max(0, Math.min(index, photos.length - 1));
  const photo = photos[selectedIndex];
  setPhotoVisible(false);
  photoLoadStatus.textContent = 'Φόρτωση φωτογραφίας…';
  document.getElementById('photo-counter').textContent = `Φωτογραφία ${selectedIndex + 1} / ${photos.length}`;
  document.getElementById('photo-caption').textContent = photo.alt;
  photoCaptionSource.hidden = !photo.dataset.captionSource;
  if (photo.dataset.captionSource) photoCaptionSource.href = photo.dataset.captionSource;
  else photoCaptionSource.removeAttribute('href');
  previousPhoto.disabled = selectedIndex === 0;
  nextPhoto.disabled = selectedIndex === photos.length - 1;
  let timeout;
  try {
    await Promise.race([
      photo.decode(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Photo timeout')), 15000); })
    ]);
    if (request !== photoRequest) return;
    const ratio = photo.naturalWidth / photo.naturalHeight;
    const width = Math.min(0.9, 0.65 * ratio);
    const height = width / ratio;
    selectedPhoto.setAttribute('width', width);
    selectedPhoto.setAttribute('height', height);
    photoBackground.setAttribute('width', width + 0.04);
    photoBackground.setAttribute('height', height + 0.04);
    selectedPhoto.setAttribute('src', '#' + photo.id);
    const textureDeadline = performance.now() + 5000;
    while (request === photoRequest && selectedPhoto.getObject3D('mesh')?.material.map?.image !== photo) {
      if (performance.now() > textureDeadline) throw new Error('Texture timeout');
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    if (request === photoRequest) revealPhoto();
  } catch {
    if (request !== photoRequest) return;
    photoLoadStatus.textContent = 'Η φωτογραφία δεν φορτώθηκε. Επιλέξτε άλλη φωτογραφία με τα βέλη.';
  } finally {
    clearTimeout(timeout);
  }
}

previousPhoto.addEventListener('click', () => showPhoto(selectedIndex - 1));
nextPhoto.addEventListener('click', () => showPhoto(selectedIndex + 1));
if (scene.hasLoaded) showPhoto(0);
else scene.addEventListener('loaded', () => showPhoto(0), {once: true});

function releaseCamera() {
  const system = scene.systems?.['mindar-image-system'];
  system?.controller?.stopProcessVideo();
  system?.video?.srcObject?.getTracks().forEach(track => track.stop());
}

function fail() {
  releaseCamera();
  scene.systems?.['mindar-image-system']?.ui?.hideScanning();
  document.body.classList.remove('active');
  document.getElementById('viewer').hidden = true;
  status.textContent = 'Δεν ήταν δυνατή η εκκίνηση AR. Ελέγξτε την άδεια κάμερας στις ρυθμίσεις του προγράμματος περιήγησης και πατήστε «Επαναφόρτωση και νέα δοκιμή». Μπορείτε επίσης να δείτε τις φωτογραφίες στη σελίδα του σημείου ενδιαφέροντος.';
  start.disabled = true;
  retry.hidden = false;
  status.focus();
}

start.addEventListener('click', () => {
  if (!window.MINDAR || !scene.hasLoaded) {
    status.textContent = 'Περιμένετε να φορτωθεί η εφαρμογή και δοκιμάστε ξανά.';
    status.focus();
    return;
  }
  start.disabled = true;
  document.getElementById('viewer').hidden = false;
  document.body.classList.add('active');
  scene.resize();
  status.textContent = 'Επιτρέψτε την κάμερα και περιμένετε την εκκίνηση…';
  try {
    Promise.resolve(scene.systems['mindar-image-system'].start()).catch(fail);
  } catch {
    fail();
  }
});

scene.addEventListener('arReady', () => {
  if (!document.body.classList.contains('active')) { releaseCamera(); return; }
  status.textContent = 'Στρέψτε την κάμερα στην εικόνα-στόχο.';
});
scene.addEventListener('arError', fail);
retry.addEventListener('click', () => location.reload());
document.getElementById('close').addEventListener('click', () => { releaseCamera(); location.reload(); });
window.addEventListener('pagehide', releaseCamera);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && document.body.classList.contains('active')) {
    releaseCamera();
    location.reload();
  }
});
