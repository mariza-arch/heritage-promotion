console.log("Fetch: ", wikidatum);

function get_wikidatum(id){
    console.log('Getting from wikidata entity: ', id);
    // WikiMedia API based:
    let url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&format=json&languages=en|el&origin=*`;
    // WikiData URI based:
    // let url = `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;
    console.log('API endpoint:', url);
    var jqxhr = $.getJSON( url, function(data) {
          //console.log( "Success; entities returned: ", Object.keys(data).length );

          let description = get_json_value(['entities',id,'descriptions','el','value'], data);
          if (description)
            $('#wikidata_descr').text( get_first_upper(description) );

          const officialWebsite = get_official_website(data.entities?.[id]);
          if (officialWebsite) {
            $('#poi-official-website')
              .attr('href', officialWebsite)
              .prop('hidden', false);
          }

          const sitelinks = get_json_value(['entities',id,'sitelinks'], data) || {};
          const wikiLanguage = sitelinks.elwiki ? 'el' : 'en';
          const wikiTitle = (sitelinks.elwiki || sitelinks.enwiki)?.title;
          if (wikiTitle) {
            $('#wikidata_href')
              .attr('href', `https://${wikiLanguage}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`)
              .prop('hidden', false);
            $('#poi-sources').prop('hidden', false);
          }


          let latlong = get_json_value(['entities',id,'claims','P625', 0,'mainsnak', 'datavalue', 'value'], data);
          if (latlong) {
              $('#poi-directions')
                .attr('href', `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latlong.latitude},${latlong.longitude}`)}`)
                .prop('hidden', false);
              //$('#wikidata_location').text(JSON.stringify(value) );
              console.log('Create map');
              var map = L.map('map', {fullscreenControl: { pseudoFullscreen: true } }).setView([latlong.latitude, latlong.longitude], 13);
              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(map);
              var marker = L.marker([latlong.latitude, latlong.longitude]).addTo(map);
              marker.bindPopup(wikiTitle || '').openPopup();
          }

          let image = get_json_value(['entities',id,'claims','P18', 0,'mainsnak', 'datavalue', 'value'], data);
          if (image)
            get_thumbnail(image, 960);

        })
        .fail(function( jqxhr, textStatus, error ) {
            console.log( "Error getting wikidata. ", textStatus, error );
        });
}

function get_official_website(entity) {
    const candidates = (entity?.claims?.P856 || [])
      .filter(statement => statement.rank !== 'deprecated' && !statement.qualifiers?.P582)
      .map(statement => {
          const value = statement.mainsnak?.datavalue?.value;
          if (typeof value !== 'string') return null;
          try {
              const url = new URL(value);
              if (!['http:', 'https:'].includes(url.protocol)) return null;
              return {
                  url: url.href,
                  preferred: statement.rank === 'preferred',
                  greek: statement.qualifiers?.P407?.some(snak => snak.datavalue?.value?.id === 'Q9129') || false
              };
          } catch {
              return null;
          }
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.preferred) - Number(a.preferred) || Number(b.greek) - Number(a.greek));
    return candidates[0]?.url || null;
}

function get_thumbnail(photoname, size){
    photoname = photoname.replaceAll(' ', '_');
    console.log('Getting '+size+'px thumb of: ', photoname);
    // Commons imageinfo API: returns a ready-made thumbnail url for the requested width
    let title = encodeURIComponent('File:'+photoname);
    let url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url|user&iiurlwidth=${size}&format=json&origin=*`;
    var jqxhr = $.getJSON( url, function(data) {
        // Response is keyed by page id, which is not known in advance
        let pages = get_json_value(['query','pages'], data);
        let page = pages ? Object.values(pages)[0] : null;
        let info = page ? get_json_value(['imageinfo', 0], page) : null;
        if ( !info )
            return;

        let credit = info.user;
        // console.log('Photo credit: ', credit);

        // Fall back to the original image if no thumbnail is available
        let imgurl = info.thumburl || info.url;
        if ( imgurl ){
            console.log(imgurl);
            $('#wikidata_img').attr('src', imgurl);
        }
    })
    .fail(function() {
        console.log( "error" );
    });


}

function get_first_upper(value){
    if (typeof value === 'string' || value instanceof String)
        value = value.charAt(0).toUpperCase() + value.slice(1);
    return value;
}

function get_json_value(json_key, data){
    try{
        while ( json_key.length>1 ){
            data = data[ json_key[0]]
            json_key = json_key.slice(1);
        }
        return data[json_key[0]];
    } catch(err){
        console.error(err, json_key, JSON.stringify(data));
    }
    return null; //on error
}

get_wikidatum(wikidatum);
