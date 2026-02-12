const modeRadios = document.querySelectorAll('input[name="mode"]');
const destinationFields = document.getElementById('destinationFields');
const vibeFields = document.getElementById('vibeFields');
const placeInput = document.getElementById('placeInput');
const placeIdInput = document.getElementById('placeId');
const placeResults = document.getElementById('placeResults');
const searchForm = document.getElementById('searchForm');
const resultsEl = document.getElementById('results');

modeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    destinationFields.classList.toggle('hidden', mode !== 'destination');
    vibeFields.classList.toggle('hidden', mode !== 'vibe');
  });
});

let placeTimer;
placeInput.addEventListener('input', () => {
  clearTimeout(placeTimer);
  placeTimer = setTimeout(async () => {
    const q = placeInput.value.trim();
    if (q.length < 2) {
      placeResults.innerHTML = '';
      return;
    }
    const response = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    placeResults.innerHTML = '';
    (data.data || []).forEach((place) => {
      const li = document.createElement('li');
      li.textContent = `${place.displayName} (${place.formattedAddress || ''})`;
      li.onclick = () => {
        placeInput.value = place.displayName;
        placeIdInput.value = place.placeId;
        placeResults.innerHTML = '';
      };
      placeResults.appendChild(li);
    });
  }, 250);
});

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultsEl.innerHTML = '<p>Searching hotels...</p>';

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const payload = {
    mode,
    placeId: placeIdInput.value,
    aiSearch: document.getElementById('vibeInput').value,
    checkin: document.getElementById('checkin').value,
    checkout: document.getElementById('checkout').value,
    guests: document.getElementById('guests').value
  };

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    resultsEl.innerHTML = `<p>${data.error || 'Search failed.'}</p>`;
    return;
  }

  if (!data.hotels.length) {
    resultsEl.innerHTML = '<p>No hotels found.</p>';
    return;
  }

  resultsEl.innerHTML = data.hotels
    .map((hotel) => {
      const offer = hotel.offer;
      return `
      <article class="card hotel-card">
        ${hotel.image ? `<img src="${hotel.image}" alt="${hotel.name}">` : ''}
        <h3>${hotel.name}</h3>
        <p>${hotel.address || ''}</p>
        ${hotel.rating ? `<p>Rating: ${hotel.rating}</p>` : ''}
        ${hotel.story ? `<p>${hotel.story}</p>` : ''}
        ${offer ? `<p><strong>From $${offer.amount} ${offer.currency}</strong> · ${offer.refundableTag} · ${offer.boardName}</p>` : '<p>No quick offer available</p>'}
        <a class="button" href="/hotel/${hotel.hotelId}?checkin=${payload.checkin}&checkout=${payload.checkout}&guests=${payload.guests}">View offers</a>
      </article>`;
    })
    .join('');
});
