const scene = document.querySelector('a-scene');
const status = document.getElementById('status');
const start = document.getElementById('start');
const retry = document.getElementById('retry');

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
  status.textContent = 'Δεν ήταν δυνατή η εκκίνηση AR. Ελέγξτε την άδεια κάμερας στις ρυθμίσεις του προγράμματος περιήγησης και πατήστε «Επαναφόρτωση και νέα δοκιμή». Μπορείτε επίσης να δείτε τις φωτογραφίες χωρίς κάμερα.';
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
