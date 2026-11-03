---
layout: default
load_leaflet: true
load_markercluster: true
---

<section class="home-intro" markdown="1">

# Ελληνική Βιομηχανική Κληρονομιά

<p class="home-lead">Ανακαλύψτε την Ελλάδα μέσα από τη βιομηχανική της ιστορία.</p>

Εξερευνήστε παλιά εργοστάσια, μύλους και μεταλλευτικές εγκαταστάσεις. Γνωρίστε τους ανθρώπους, τις τεχνολογίες και τις ιστορίες που διαμόρφωσαν την παραγωγή και την καθημερινή ζωή κάθε τόπου.

<div class="home-explore">
  <a class="button button-primary" href="{{ '/pois.html' | relative_url }}">Εξερευνήστε τα σημεία →</a>
  <a class="button button-outline" href="{{ '/about/' | relative_url }}">Σχετικά με την ιστοσελίδα</a>
</div>

</section>

## Ανακαλύψτε τους τόπους στον χάρτη

Επιλέξτε έναν δείκτη για να γνωρίσετε τον τόπο και την ιστορία του. Οι αριθμοί ομαδοποιούν κοντινά σημεία· επιλέξτε τους για μεγέθυνση.

<div class="surface-panel home-map-panel">
  {% include all-pois-map.html %}

  <div class="home-map-footer">
    <p>Περιηγηθείτε στους τόπους με φωτογραφίες και σύντομες περιγραφές.</p>
    <a class="button button-outline" href="{{ '/pois.html' | relative_url }}">Δείτε όλα τα σημεία σε λίστα →</a>
  </div>
</div>
