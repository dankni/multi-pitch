let overlayElement = null;
let closeButtonElement = null;

function getLightboxOverlay() {
    if (!overlayElement) {
        overlayElement = document.getElementById('lightbox-overlay');
        if (!overlayElement) {
            overlayElement = document.createElement('div');
            overlayElement.id = 'lightbox-overlay';
            overlayElement.className = 'overlay';
            overlayElement.setAttribute('style', 'display:none;');
            overlayElement.setAttribute('tabindex', '-1');
            document.body.appendChild(overlayElement);
        }
    }
    return overlayElement;
}

function getLightboxCloseButton() {
    if (!closeButtonElement) {
        closeButtonElement = document.getElementById('lightbox-close');
        if (!closeButtonElement) {
            closeButtonElement = document.createElement('button');
            closeButtonElement.type = 'button';
            closeButtonElement.id = 'lightbox-close';
            closeButtonElement.className = 'close';
            closeButtonElement.setAttribute('aria-label', 'Close lightbox');
            closeButtonElement.setAttribute('style', 'display:none;');
            closeButtonElement.addEventListener('click', hideLightBox);
            document.body.appendChild(closeButtonElement);
        }
    }
    return closeButtonElement;
}

function getImageSource(img) {
    return img.getAttribute('data-src') || img.getAttribute('src') || img.src || '';
}

function buildGalleryItems() {
    const items = [];
    const seen = new Set();
    const images = Array.from(document.querySelectorAll('img.blog-img, [onclick*="openLightBox("] img'));

    images.forEach((img) => {
        const src = getImageSource(img);
        const alt = img.alt || '';

        if (!src || seen.has(src)) {
            return;
        }

        seen.add(src);
        items.push({ src, alt });
    });

    return items;
}

let currentGallery = [];
let currentIndex = 0;

function showImage(index) {
    const item = currentGallery[index];
    const overlay = getLightboxOverlay();
    if (!item) {
        overlay.innerHTML = '<p class="modal-caption">Image not available</p>';
        return;
    }

    overlay.innerHTML = `
        <button id="prevBtn" class="lightbox-nav" ${index === 0 ? 'disabled' : ''}>&lt;</button>
        <img src="${item.src}" alt="${item.alt}" id="modalStart" tabindex="0" style="max-width:90vw;max-height:90vh;display:block;margin:0 auto;" />
        <button id="nextBtn" class="lightbox-nav" ${index === currentGallery.length - 1 ? 'disabled' : ''}>&gt;</button>
        <p class="modal-caption">Photo: ${item.alt || 'Image'}</p>
    `;

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigate(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigate(1));
    }

    document.getElementById('modalStart')?.focus();
}

function navigate(direction) {
    currentIndex += direction;
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    if (currentIndex >= currentGallery.length) {
        currentIndex = currentGallery.length - 1;
    }
    showImage(currentIndex);
}

function handleKeydown(event) {
    if (event.code === 'ArrowLeft') {
        navigate(-1);
    } else if (event.code === 'ArrowRight') {
        navigate(1);
    } else if (event.code === 'Escape') {
        hideLightBox();
    }
}

function openLightBox(img, alt) {
    currentGallery = buildGalleryItems();
    if (!currentGallery.length) {
        currentGallery = [{ src: img, alt: alt || '' }];
    }

    const targetIndex = currentGallery.findIndex((item) => item.src === img);
    currentIndex = targetIndex === -1 ? 0 : targetIndex;

    const overlay = getLightboxOverlay();
    const closeBtn = getLightboxCloseButton();

    overlay.setAttribute('style', 'display:block;');
    closeBtn.setAttribute('style', 'display:block;');
    document.getElementById('bdy')?.setAttribute('style', 'overflow:hidden');

    document.addEventListener('keydown', handleKeydown);
    showImage(currentIndex);
}

function hideLightBox() {
    const overlay = getLightboxOverlay();
    const closeBtn = getLightboxCloseButton();

    overlay.setAttribute('style', 'display:none;');
    closeBtn.setAttribute('style', 'display:none;');
    document.getElementById('bdy')?.setAttribute('style', '');
    document.removeEventListener('keydown', handleKeydown);
}

window.openLightBox = openLightBox;
window.hideLightBox = hideLightBox;
export { openLightBox, hideLightBox };
