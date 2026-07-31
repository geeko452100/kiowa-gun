document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('range-map');
    if (!mapEl) return;

    // No street address is published on the club's site yet — swap this for the
    // exact address (or "lat,lng") once it's available for a precise pin.
    const LOCATION_QUERY = '369 SW 50 Ave, Great Bend, KS 67530';
    const encodedQuery = encodeURIComponent(LOCATION_QUERY);

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.google.com/maps?q=${encodedQuery}&output=embed`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = '0';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.title = 'Map to Kiowa Gun Club';
    mapEl.appendChild(iframe);

    const directionsLink = document.getElementById('directions-link');
    if (directionsLink) {
        directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;
    }
});
