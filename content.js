// content.js

let pipWindow = null;
let originalParent = null;
let originalNextSibling = null;
let placeholder = null;

// Inspector State
let isPickerActive = false;
let hoveredElement = null;
let highlighter = null;

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle-pip') {
        // If PiP is open, close it.
        if (pipWindow) {
            pipWindow.close();
            return;
        }
        // If picker is active, turn it off.
        if (isPickerActive) {
            disablePickerMode();
            showToast('PiP Picker Disabled');
            return;
        }
        // Otherwise, start the picker to let user select element.
        enablePickerMode();
        showToast('PiP Picker Active: Click any element');
    }
});

function enablePickerMode() {
    isPickerActive = true;
    document.body.style.cursor = 'crosshair';

    // Create or reset highlighter
    if (!highlighter) {
        highlighter = document.createElement('div');
        highlighter.classList.add('pip-highlighter');
        // Add a label badge
        const badge = document.createElement('span');
        badge.classList.add('pip-highlighter-badge');
        badge.innerText = 'Float This';
        highlighter.appendChild(badge);
        document.body.appendChild(highlighter);
    }
    highlighter.style.display = 'block';

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
}

function disablePickerMode() {
    isPickerActive = false;
    document.body.style.cursor = '';
    if (highlighter) {
        highlighter.style.display = 'none';
    }
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
}

function handleMouseMove(e) {
    if (!isPickerActive) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === highlighter || highlighter.contains(target)) return;

    hoveredElement = getSmartTarget(target);
    highlightElement(hoveredElement);
}

function handleClick(e) {
    if (!isPickerActive) return;
    e.preventDefault();
    e.stopPropagation();

    if (hoveredElement) {
        disablePickerMode();
        openPiP(hoveredElement);
    }
}

function handleKeyDown(e) {
    if (!isPickerActive) return;
    if (e.key === 'Escape') {
        disablePickerMode();
    }
}

function highlightElement(element) {
    if (!element || !highlighter) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    highlighter.style.top = `${rect.top + scrollTop}px`;
    highlighter.style.left = `${rect.left + scrollLeft}px`;
    highlighter.style.width = `${rect.width}px`;
    highlighter.style.height = `${rect.height}px`;
}

function getSmartTarget(element) {
    // Heuristic 1: If it's a video, try to find its "Player Container" to keep subtitles/controls
    if (element.tagName === 'VIDEO') {
        // YouTube specific
        const ytContainer = element.closest('.html5-video-player');
        if (ytContainer) return ytContainer;

        // Generic: Check parent. If parent has similar aspect ratio and contains other UI elements, take it.
        const parent = element.parentElement;
        if (parent) {
            const vidRect = element.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();

            // If parent is roughly same size (within 10%)
            const widthDiff = Math.abs(vidRect.width - parentRect.width);
            const heightDiff = Math.abs(vidRect.height - parentRect.height);

            if (widthDiff < vidRect.width * 0.1 && heightDiff < vidRect.height * 0.1) {
                return parent;
            }
        }
        return element;
    }

    // Heuristic 2: If it's a subtitle/caption element, find the player
    if (element.classList.contains('ytp-caption-segment') || element.classList.contains('caption-window')) {
        const ytContainer = element.closest('.html5-video-player');
        if (ytContainer) return ytContainer;
    }

    return element;
}

async function openPiP(targetElement) {
    // 1. DRM Check
    if (isDRMProtected(targetElement)) {
        const video = targetElement.tagName === 'VIDEO' ? targetElement : targetElement.querySelector('video');
        if (video) {
            if (confirm('DRM Content Detected (e.g., Netflix, Hulu). Document PiP may show a black screen. Use Native PiP instead?')) {
                try {
                    await video.requestPictureInPicture();
                    return;
                } catch (e) {
                    console.error('Native PiP failed:', e);
                }
            }
        }
    }

    // 2. Open the Document PiP Window
    try {
        const width = Math.min(targetElement.clientWidth || 640, 1200);
        const height = Math.min(targetElement.clientHeight || 360, 800);

        pipWindow = await documentPictureInPicture.requestWindow({
            width: Math.max(width, 300),
            height: Math.max(height, 200),
        });
    } catch (err) {
        console.error('Failed to open PiP window:', err);
        return;
    }

    // 3. Teleportation Setup
    originalParent = targetElement.parentNode;
    originalNextSibling = targetElement.nextSibling;

    // Create Placeholder
    placeholder = document.createElement('div');
    placeholder.style.width = `${targetElement.clientWidth}px`;
    placeholder.style.height = `${targetElement.clientHeight}px`;
    placeholder.style.background = '#1a1a1a';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.color = '#888';
    placeholder.innerText = 'Playing in Picture-in-Picture';
    placeholder.classList.add('pip-placeholder');

    // 4. Style Syncing
    copyStylesToWindow(pipWindow);

    // 5. The Move
    originalParent.insertBefore(placeholder, targetElement);
    pipWindow.document.body.append(targetElement);
    pipWindow.document.body.classList.add('pip-mode');

    // 6. Inject Custom Controls (if video)
    const video = targetElement.tagName === 'VIDEO' ? targetElement : targetElement.querySelector('video');
    if (video) {
        injectControls(pipWindow, video);
    }

    // 7. Cleanup on Close
    pipWindow.addEventListener('pagehide', () => {
        restoreElement(targetElement);
    });
}

function isDRMProtected(element) {
    // Check URL
    const drmSites = ['netflix.com', 'hulu.com', 'disneyplus.com', 'hbomax.com', 'primevideo.com'];
    if (drmSites.some(site => window.location.hostname.includes(site))) {
        return true;
    }

    // Check MediaKeys
    const video = element.tagName === 'VIDEO' ? element : element.querySelector('video');
    if (video && video.mediaKeys) {
        return true;
    }

    return false;
}

function injectControls(win, videoElement) {
    const container = win.document.createElement('div');
    container.classList.add('pip-controls');

    // Play/Pause Button
    const playBtn = win.document.createElement('button');
    playBtn.innerText = videoElement.paused ? '▶' : '⏸';
    playBtn.onclick = () => {
        if (videoElement.paused) {
            videoElement.play();
            playBtn.innerText = '⏸';
        } else {
            videoElement.pause();
            playBtn.innerText = '▶';
        }
    };

    // Sync button state with video events
    videoElement.addEventListener('play', () => playBtn.innerText = '⏸');
    videoElement.addEventListener('pause', () => playBtn.innerText = '▶');

    // Return Button
    const returnBtn = win.document.createElement('button');
    returnBtn.innerText = 'Return to Tab';
    returnBtn.onclick = () => win.close();

    container.appendChild(playBtn);
    container.appendChild(returnBtn);
    win.document.body.appendChild(container);
}

function restoreElement(element) {
    if (!originalParent) return;

    if (originalNextSibling) {
        originalParent.insertBefore(element, originalNextSibling);
    } else {
        originalParent.append(element);
    }

    if (placeholder) {
        placeholder.remove();
    }

    pipWindow = null;
    originalParent = null;
    originalNextSibling = null;
    placeholder = null;
}

function copyStylesToWindow(targetWindow) {
    [...document.styleSheets].forEach((styleSheet) => {
        try {
            if (styleSheet.href) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = styleSheet.type;
                link.media = styleSheet.media;
                link.href = styleSheet.href;
                targetWindow.document.head.appendChild(link);
            } else if (styleSheet.cssRules) {
                const style = document.createElement('style');
                [...styleSheet.cssRules].forEach((rule) => {
                    style.appendChild(document.createTextNode(rule.cssText));
                });
                targetWindow.document.head.appendChild(style);
            }
        } catch (e) {
            // console.warn('CORS issue with stylesheet:', e);
        }
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.classList.add('pip-toast');
    toast.innerText = message;
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
