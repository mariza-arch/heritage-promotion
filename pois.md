---
layout: default
title: "Σημεία ενδιαφέροντος"
---

<h1 class="places-heading">{{ page.title | escape }}</h1>

<div class="cards-grid">
  {% assign places = site.pois | sort: "title" %}
  {% for poi in places %}
  <article class="card place-card" data-wikidata="{{ poi.wikidatum | escape }}">
    <a class="card-link" href="{{ poi.url | relative_url }}">
      <div class="card-media"><img class="card-image" alt="" loading="lazy" hidden></div>
      <div class="card-body">
        <h2 class="card-title">{{ poi.title | escape }}</h2>
        <p class="card-description">{{ poi.card_description | default: poi.excerpt | strip_html | normalize_whitespace | escape }}</p>
        <dl class="facts-list card-facts">
          <div><dt>Τοποθεσία</dt><dd data-field="location">{{ poi.card_location | escape }}</dd></div>
          <div><dt>Τύπος</dt><dd data-field="type">{{ poi.card_type | escape }}</dd></div>
        </dl>
      </div>
    </a>
    <p class="card-source"><a href="https://www.wikidata.org/wiki/{{ poi.wikidatum | escape }}" target="_blank" rel="noopener" aria-label="Wikidata: {{ poi.title | escape }} (νέα καρτέλα)">Wikidata ↗</a></p>
  </article>
  {% endfor %}
</div>

<script src="{{ "/assets/js/poi-cards.js" | relative_url }}" defer></script>
