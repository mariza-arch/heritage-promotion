---
layout: default
title: "Σημεία ενδιαφέροντος"
---

<h1 class="places-heading">{{ page.title | escape }}</h1>

<div class="cards-grid">
  {% assign places = site.pois | sort: "title" %}
  {% for poi in places %}
  <article class="card" data-wikidata="{{ poi.wikidatum | escape }}">
    <a class="card-link" href="{{ poi.url | relative_url }}">
      <img class="card-image" alt="" loading="lazy" hidden>
      <div class="card-body">
        <h2 class="card-title">{{ poi.title | escape }}</h2>
        <p class="card-description">{{ poi.content | strip_html | normalize_whitespace | truncatewords: 25 | escape }}</p>
      </div>
    </a>
  </article>
  {% endfor %}
</div>

<script>
  (async function () {
    const cards = Array.from(
      document.querySelectorAll(".card[data-wikidata]")
    );

    const ids = [...new Set(
      cards.map(card => card.dataset.wikidata.trim())
        .filter(id => /^Q\d+$/.test(id))
    )];

    for (let start = 0; start < ids.length; start += 10) {
      const batch = ids.slice(start, start + 50);

      const params = new URLSearchParams({
        action: "wbgetentities",
        ids: batch.join("|"),
        props: "descriptions|claims",
        languages: "el|en",
        format: "json",
        origin: "*"
      });

      try {
        const response = await fetch(
          "https://www.wikidata.org/w/api.php?" + params
        );

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.info);
        }

        cards.forEach(card => {
          const id = card.dataset.wikidata.trim();
          if (!batch.includes(id)) return;

          const entity = data.entities?.[id];
          if (!entity) return;

          const description =
            entity.descriptions?.el?.value ||
            entity.descriptions?.en?.value;

          if (description) {
            card.querySelector(".card-description").textContent =
              description.charAt(0).toUpperCase() + description.slice(1);
          }

          const filename =
            entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

          if (filename) {
            const image = card.querySelector(".card-image");

            image.onerror = () => {
              image.hidden = true;
            };
            
            image.hidden = false;
            image.src =
              "https://commons.wikimedia.org/wiki/Special:FilePath/" +
              encodeURIComponent(filename) +
              "?width=800";
          }
        });
      } catch (error) {
        console.error("Could not load Wikidata cards:", error);
      }
    }
  })();
</script>
