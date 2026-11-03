/* Greek summaries and fallback facts are rendered by Jekyll; Wikidata enriches them. */
(async function () {
  const cards = Array.from(document.querySelectorAll('.place-card[data-wikidata]'));
  const ids = [...new Set(cards.map(card => card.dataset.wikidata.trim()))]
    .filter(id => /^Q\d+$/.test(id));
  if (!ids.length) return;

  async function getEntities(entityIds, props) {
    const entities = {};
    for (let start = 0; start < entityIds.length; start += 50) {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityIds.slice(start, start + 50).join('|'),
        props,
        languages: 'el',
        format: 'json',
        origin: '*'
      });
      const response = await fetch('https://www.wikidata.org/w/api.php?' + params, {
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('Wikidata HTTP ' + response.status);
      const data = await response.json();
      if (data.error || !data.entities) throw new Error('Invalid Wikidata response');
      Object.assign(entities, data.entities);
    }
    return entities;
  }

  function values(entity, property, currentOnly = false) {
    const statements = (entity.claims?.[property] || []).filter(statement =>
      statement.rank !== 'deprecated' &&
      statement.mainsnak?.snaktype === 'value' &&
      statement.mainsnak.datavalue &&
      (!currentOnly || !statement.qualifiers?.P582)
    );
    const preferred = statements.filter(statement => statement.rank === 'preferred');
    return (preferred.length ? preferred : statements).map(s => s.mainsnak.datavalue.value);
  }

  function itemIds(entity, property, currentOnly = false) {
    return values(entity, property, currentOnly).map(value => value.id)
      .filter(id => /^Q\d+$/.test(id));
  }

  let entities;
  try {
    entities = await getEntities(ids, 'claims');
  } catch (error) {
    console.warn('Card enrichment unavailable; using local descriptions and facts.', error);
    return;
  }

  for (const card of cards) {
    const entity = entities[card.dataset.wikidata.trim()];
    if (!entity || entity.missing !== undefined) continue;
    const filename = values(entity, 'P18')[0];
    if (typeof filename !== 'string') continue;
    const image = card.querySelector('.card-image');
    image.onerror = () => { image.hidden = true; };
    image.hidden = false;
    image.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(filename) + '?width=800';
  }

  const relatedIds = [...new Set(Object.values(entities).flatMap(entity =>
    ['P276', 'P131', 'P31', 'P84'].flatMap(property => itemIds(entity, property, true))
  ))];
  if (!relatedIds.length) return;

  let related;
  try {
    related = await getEntities(relatedIds, 'labels');
  } catch (error) {
    console.warn('Wikidata labels unavailable; using local card facts.', error);
    return;
  }

  const typeLabels = {
    Q486972: 'Πόλη',
    Q1662089: 'Βιομηχανικό μουσείο',
    Q26958726: 'Ορυκτολογικό μουσείο'
  };
  function label(id) {
    return related[id]?.labels?.el?.value || '';
  }
  function firstLabel(entityIds) {
    return entityIds.map(label).find(Boolean);
  }
  function setFact(card, field, value) {
    if (!value) return;
    const target = card.querySelector('[data-field="' + field + '"]');
    target.textContent =
      value.charAt(0).toUpperCase() + value.slice(1);
  }

  for (const card of cards) {
    const entity = entities[card.dataset.wikidata.trim()];
    if (!entity || entity.missing !== undefined) continue;
    const localLocation = card.querySelector('[data-field="location"]').textContent.trim();
    const wikidataLocation = firstLabel(itemIds(entity, 'P276', true));
    const location = wikidataLocation && !localLocation.includes(wikidataLocation)
      ? [wikidataLocation, localLocation].filter(Boolean).join(' · ')
      : localLocation || firstLabel(itemIds(entity, 'P131', true));
    const types = [...new Set(itemIds(entity, 'P31').map(id => typeLabels[id] || label(id))
      .filter(Boolean))].slice(0, 2);
    const architect = firstLabel(itemIds(entity, 'P84'));
    setFact(card, 'location', location);
    setFact(card, 'type', types.join(' · '));
    if (architect) {
      setFact(card, 'architect', architect);
      card.querySelector('[data-architect]').hidden = false;
    }
  }
})();
