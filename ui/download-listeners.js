// ===== Download Event Listeners =====
// Track active background downloads separately
window.activeBackgroundDownloads = window.activeBackgroundDownloads || new Set();

// Listen for download progress updates
window.addEventListener('download-progress', (event) => {
    const data = event.detail;

    if (data.type === 'version-install' || data.type === 'java-download') {
        // Update current downloading version
        currentDownloadingVersion = data.version;

        // Track background downloads
        if (data.isBackgroundUpdate) {
            window.activeBackgroundDownloads.add(data.version);
        }

        // Route to appropriate viewer based on download type
        if (data.isBackgroundUpdate) {
            // Background downloads only update the mini floating viewer
            window.updateBackgroundDownloadProgress(
                data.version,
                data.percentage || 0,
                data.task || 'Downloading...',
                data
            );
        } else {
            // Manual downloads only update the modal progress viewer
            window.updateInstallProgress(
                data.version,
                data.percentage || 0,
                data.task || 'Downloading...',
                data
            );
        }
    }
});

// Listen for download completion
window.addEventListener('download-complete', (event) => {
    const data = event.detail;
    console.log('[Event] Download complete:', data);

    // Remove from background downloads tracking
    if (data.version && window.activeBackgroundDownloads) {
        window.activeBackgroundDownloads.delete(data.version);
    }

    // Handle manual downloads
    if (!data.isBackgroundUpdate) {
        if (window.onDownloadComplete && data.type !== 'java-download') {
            window.onDownloadComplete(data.version);
        }
    } else {
        // Handle background download completion
        if (typeof loadVersions === 'function' && data.type !== 'java-download') {
            // Silently refresh versions list for background updates
            loadVersions();
        }

        // Hide global popup if no more background downloads
        const globalPopup = document.getElementById('globalDownloadPopup');
        if (globalPopup && window.activeBackgroundDownloads && window.activeBackgroundDownloads.size === 0) {
            globalPopup.classList.remove('visible');
        }
    }

    // Reset global state only if no downloads remain
    if (window.activeBackgroundDownloads && window.activeBackgroundDownloads.size === 0) {
        if (typeof resetGlobalDownloadState === 'function') {
            resetGlobalDownloadState();
        }
    }

    currentDownloadingVersion = null;
});

// Listen for download cancelled
window.addEventListener('download-cancelled', (event) => {
    const data = event.detail;
    console.log('[Event] Download cancelled:', data);

    // Remove from background downloads tracking
    if (data.version && window.activeBackgroundDownloads) {
        window.activeBackgroundDownloads.delete(data.version);
    }

    currentDownloadingVersion = null;

    // Only close modal progress for manual downloads
    if (!data.isBackgroundUpdate && typeof closeDownloadProgress === 'function') {
        closeDownloadProgress();
    }

    // Hide global popup if no more background downloads
    if (window.activeBackgroundDownloads && window.activeBackgroundDownloads.size === 0) {
        if (typeof resetGlobalDownloadState === 'function') {
            resetGlobalDownloadState();
        } else {
            const globalPopup = document.getElementById('globalDownloadPopup');
            if (globalPopup) {
                globalPopup.classList.remove('visible');
            }
        }
    }
});

console.log('[Init] Download event listeners registered');

// Added listener for reload profiles instruction from background update or any source
window.addEventListener('reload-profiles', (event) => {
    console.log('[Event] Reloading profiles');
    if (typeof loadProfiles === 'function') {
        loadProfiles();
    }
    if (typeof loadOptions === 'function') {
        loadOptions();
    }
    if (typeof loadModdableProfiles === 'function') {
        loadModdableProfiles();
    }
});
