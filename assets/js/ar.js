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
const photoCanvas = document.getElementById('photo-canvas');
const photoContext = photoCanvas.getContext('2d', {alpha: false});
const photoDisplay = document.getElementById('photo-display');
const resetZoom = document.getElementById('reset-photo-zoom');
const pinchPointers = new Map();
let photoZoom = 1;
let pinchDistance = 0;
let pinchStartZoom = 1;
let selectedIndex = 0;
let photoRequest = 0;

function setPhotoZoom(value) {
  photoZoom = Math.max(0.5, Math.min(3, value));
  photoDisplay.setAttribute('scale', {x: photoZoom, y: photoZoom, z: photoZoom});
  resetZoom.disabled = Math.abs(photoZoom - 1) < 0.001;
  resetZoom.textContent = `Επαναφορά zoom (${photoZoom.toLocaleString('el-GR', {maximumFractionDigits: 1})}×)`;
}

function pointerDistance() {
  const [a, b] = [...pinchPointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function enablePinchZoom() {
  const canvas = scene.canvas;
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || !document.body.classList.contains('active') ||
        !selectedPhoto.getAttribute('visible') || pinchPointers.size >= 2) return;
    pinchPointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    canvas.setPointerCapture(event.pointerId);
    if (pinchPointers.size === 2) {
      pinchDistance = pointerDistance();
      pinchStartZoom = photoZoom;
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (!pinchPointers.has(event.pointerId)) return;
    pinchPointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pinchPointers.size === 2 && pinchDistance > 0) {
      setPhotoZoom(pinchStartZoom * pointerDistance() / pinchDistance);
    }
  });
  const endPointer = event => {
    if (pinchPointers.delete(event.pointerId)) pinchDistance = 0;
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => canvas.addEventListener(name, endPointer));
}

resetZoom.addEventListener('click', () => {
  pinchPointers.clear();
  pinchDistance = 0;
  setPhotoZoom(1);
});

function setPhotoVisible(visible) {
  selectedPhoto.setAttribute('visible', visible);
  photoBackground.setAttribute('visible', visible);
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
    // Keep one canvas texture: replacing image sources can leave stale GPU contents.
    photoContext.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
    photoContext.fillStyle = '#fff';
    photoContext.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
    photoContext.drawImage(photo, 0, 0, photoCanvas.width, photoCanvas.height);
    const texture = selectedPhoto.getObject3D('mesh').material.map;
    texture.generateMipmaps = false;
    texture.minFilter = AFRAME.THREE.LinearFilter;
    texture.magFilter = AFRAME.THREE.LinearFilter;
    texture.needsUpdate = true;
    setPhotoVisible(true);
    photoLoadStatus.textContent = '';
  } catch {
    if (request !== photoRequest) return;
    photoLoadStatus.textContent = 'Η φωτογραφία δεν φορτώθηκε. Επιλέξτε άλλη φωτογραφία με τα βέλη.';
  } finally {
    clearTimeout(timeout);
  }
}

previousPhoto.addEventListener('click', () => showPhoto(selectedIndex - 1));
nextPhoto.addEventListener('click', () => showPhoto(selectedIndex + 1));
function initializePhotos() {
  showPhoto(0);
  enablePinchZoom();
}
if (scene.hasLoaded) initializePhotos();
else scene.addEventListener('loaded', initializePhotos, {once: true});

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
