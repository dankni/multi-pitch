let overlayElement = null;
let closeButtonElement = null;
let triggerElement = null; // element that opened the lightbox, focus returns to it on close

function getLightboxOverlay() {
    if (!overlayElement) {
        overlayElement = document.getElementById('lightbox-overlay');
        if (!overlayElement) {
            overlayElement = document.createElement('div');
            overlayElement.id = 'lightbox-overlay';
            overlayElement.setAttribute('style', 'display:none;');
            overlayElement.setAttribute('tabindex', '-1');
            overlayElement.setAttribute('role', 'dialog');
            overlayElement.setAttribute('aria-modal', 'true');
            overlayElement.setAttribute('aria-label', 'Image viewer');
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
            closeButtonElement.setAttribute('aria-label', 'Close image viewer');
            closeButtonElement.setAttribute('style', 'display:none;');
            closeButtonElement.addEventListener('click', hideLightBox);
            // inside the dialog so it is part of the modal for assistive tech
            getLightboxOverlay().appendChild(closeButtonElement);
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

function showImage(index, focusTarget) {
    const item = currentGallery[index];
    const overlay = getLightboxOverlay();
    if (!item) {
        overlay.innerHTML = '<p class="modal-caption">Image not available</p>';
        return;
    }

    // the caption carries the description, so the enlarged image is decorative
    overlay.innerHTML = `
        <button id="prevBtn" class="lightbox-nav" aria-label="Previous image" ${index === 0 ? 'style="display:none;"' : ''}>&lt;</button>
        <img src="${item.src}" alt="" id="modalStart" tabindex="-1" class="lightbox-img" />
        <button id="nextBtn" class="lightbox-nav" aria-label="Next image" ${index === currentGallery.length - 1 ? 'style="display:none;"' : ''}>&gt;</button>
        <p class="modal-caption">Photo: ${item.alt || 'Image'}</p>
    `;
    getLightboxCloseButton(); // re-attach the close button after innerHTML wipe
    overlay.appendChild(closeButtonElement);

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigate(-1, 'prevBtn'));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigate(1, 'nextBtn'));
    }

    // keep focus on the control the user activated; fall back to the dialog itself
    const target = (focusTarget && document.getElementById(focusTarget)) || overlay;
    target.focus();
}

function navigate(direction, focusTarget) {
    currentIndex += direction;
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    if (currentIndex >= currentGallery.length) {
        currentIndex = currentGallery.length - 1;
    }
    showImage(currentIndex, focusTarget);
}

function trapFocus(event) {
    const overlay = getLightboxOverlay();
    const focusable = Array.from(overlay.querySelectorAll('button')).filter((el) => el.offsetParent !== null);
    if (!focusable.length) {
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    } else if (!overlay.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
    }
}

function handleKeydown(event) {
    if (event.code === 'ArrowLeft') {
        navigate(-1);
    } else if (event.code === 'ArrowRight') {
        navigate(1);
    } else if (event.code === 'Escape') {
        hideLightBox();
    } else if (event.code === 'Tab') {
        trapFocus(event);
    }
}

function openLightBox(img, alt) {
    currentGallery = buildGalleryItems();
    if (!currentGallery.length) {
        currentGallery = [{ src: img, alt: alt || '' }];
    }

    const targetIndex = currentGallery.findIndex((item) => item.src === img);
    currentIndex = targetIndex === -1 ? 0 : targetIndex;

    if (!overlayElement || overlayElement.style.display === 'none' || !overlayElement.style.display) {
        triggerElement = document.activeElement; // only on first open, not re-entrant calls
    }

    const overlay = getLightboxOverlay();
    const closeBtn = getLightboxCloseButton();

    overlay.setAttribute('style', 'display:flex;');
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

    if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus();
        triggerElement = null;
    }
}

// Blog content authors plain <img onclick="openLightBox(...)"> tags; make
// those images keyboard-operable without editing every content.html
function enhanceLightboxTriggers() {
    const triggers = document.querySelectorAll('[onclick*="openLightBox("]');
    triggers.forEach((el) => {
        if (!el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
        }
        if (!el.hasAttribute('role')) {
            el.setAttribute('role', 'button');
        }
        if (!el.hasAttribute('aria-label')) {
            const alt = el.alt || el.querySelector('img')?.alt || 'image';
            el.setAttribute('aria-label', 'View larger image: ' + alt);
        }
        if (!el.dataset.lightboxKeys && !el.hasAttribute('onkeydown')) {
            el.dataset.lightboxKeys = 'true';
            el.addEventListener('keydown', (event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                    event.preventDefault();
                    el.click();
                }
            });
        }
    });
}

if (typeof window !== 'undefined') {
    window.openLightBox = openLightBox;
    window.hideLightBox = hideLightBox;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceLightboxTriggers);
    } else {
        enhanceLightboxTriggers();
    }
}

export { openLightBox, hideLightBox };
