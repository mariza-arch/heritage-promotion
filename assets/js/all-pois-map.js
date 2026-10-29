(async function () {
  const status = document.getElementById('map-status');
  const pois = JSON.parse(document.getElementById('map-pois-data').textContent);

  try {
    const map = L.map('all-pois-map', {
      scrollWheelZoom: false,
      maxZoom: 19
    }).setView([39.1, 23.4], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    const markers = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50
    }).addTo(map);

    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: pois.map(poi => poi.wikidatum).filter(Boolean).join('|'),
      props: 'claims',
      format: 'json',
      origin: '*'
    });
    const response = await fetch('https://www.wikidata.org/w/api.php?' + params, {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Wikidata request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error.info);

    pois.forEach(poi => {
      const claims = data.entities?.[poi.wikidatum]?.claims;
      const coords = claims?.P625
        ?.find(claim => claim.rank !== 'deprecated')?.mainsnak?.datavalue?.value;
      if (!Number.isFinite(coords?.latitude) || !Number.isFinite(coords?.longitude)) return;

      const popup = document.createElement('div');
      popup.className = 'map-popup';
      const filename = claims.P18?.[0]?.mainsnak?.datavalue?.value;
      if (filename) {
        const image = document.createElement('img');
        image.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
          + encodeURIComponent(filename) + '?width=220';
        image.alt = '';
        image.onerror = () => image.remove();
        popup.appendChild(image);
      }
      const link = document.createElement('a');
      link.href = poi.url;
      link.textContent = poi.title;
      popup.appendChild(link);
      markers.addLayer(L.marker([coords.latitude, coords.longitude], {
        title: poi.title
      }).bindPopup(popup));
    });

    const count = markers.getLayers().length;
    status.textContent = `${count} από ${pois.length} σημεία στον χάρτη.`;
    if (count) map.fitBounds(markers.getBounds(), { padding: [24, 24], maxZoom: 12 });
  } catch (error) {
    status.textContent = 'Δεν ήταν δυνατή η φόρτωση του χάρτη. Δοκιμάστε να ανανεώσετε τη σελίδα.';
    console.error(error);
  }
})();
