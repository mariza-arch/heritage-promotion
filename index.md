---
layout: default
title: "Σημεία ενδιαφέροντος"
---

<style>
  .places-heading {
    margin: 30px 0;
    text-align: center;
  }

  .places-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    padding: 12px;
  }

  .place-card {
    overflow: hidden;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  .place-link {
    display: block;
    height: 100%;
    color: inherit;
    text-decoration: none;
  }

  .place-image {
    display: block;
    width: 100%;
    height: 225px;
    object-fit: cover;
    background: #eee;
  }

  .place-image[hidden] {
    display: none;
  }

  .place-body {
    padding: 18px;
  }

  .place-title {
    margin: 0 0 12px;
    color: #0f172a;
    font-size: 1.35rem;
    line-height: 1.4;
  }

  .place-description {
    margin: 0;
    color: #475569;
    font-size: 1rem;
    line-height: 1.6;
  }

  .place-link:focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: -3px;
  }

  @media (max-width: 600px) {
    .places-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<h1 class="places-heading">{{ page.title | escape }}</h1>

<div class="places-grid">
  {% assign places = site.pois | sort: "title" %}
  {% for poi in places %}
  <article class="place-card" data-wikidata="{{ poi.wikidatum | escape }}">
    <a class="place-link" href="{{ poi.url | relative_url }}">
      <img class="place-image" alt="" loading="lazy" hidden>
      <div class="place-body">
        <h2 class="place-title">{{ poi.title | escape }}</h2>
        <p class="place-description">{{ poi.content | strip_html | normalize_whitespace | truncatewords: 25 | escape }}</p>
      </div>
    </a>
  </article>
  {% endfor %}
</div>

<script>
  (async function () {
    const cards = Array.from(
      document.querySelectorAll(".place-card[data-wikidata]")
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
            card.querySelector(".place-description").textContent =
              description.charAt(0).toUpperCase() + description.slice(1);
          }

          const filename =
            entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

          if (filename) {
            const image = card.querySelector(".place-image");

            image.onload = () => {
              image.hidden = false;
            };

            image.onerror = () => {
              image.hidden = true;
            };

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
