
// ===== Download Event Listeners =====
// Listen for download progress updates
window.addEventListener('download-progress', (event) => {
    const data = event.detail;

    if (data.type === 'version-install' || data.type === 'java-download') {
        // Update current downloading version
        currentDownloadingVersion = data.version;

        // Update progress bar
        window.updateInstallProgress(
            data.version,
            data.percentage || 0,
            data.task || 'Downloading...',
            data
        );
    }
});

// Listen for download completion
window.addEventListener('download-complete', (event) => {
    const data = event.detail;
    console.log('[Event] Download complete:', data);

    if (window.onDownloadComplete && data.type !== 'java-download' && !data.isBackgroundUpdate) {
        window.onDownloadComplete(data.version);
    } else if (typeof loadVersions === 'function' && data.type !== 'java-download') {
        // Silently refresh versions list for background updates
        loadVersions();
    }

    if (typeof resetGlobalDownloadState === 'function') {
        resetGlobalDownloadState();
    } else {
        const globalPopup = document.getElementById('globalDownloadPopup');
        if (globalPopup) {
            globalPopup.classList.remove('visible');
        }
    }

    currentDownloadingVersion = null;
});

// Listen for download cancelled
window.addEventListener('download-cancelled', (event) => {
    const data = event.detail;
    console.log('[Event] Download cancelled:', data);

    currentDownloadingVersion = null;

    if (typeof closeDownloadProgress === 'function') {
        closeDownloadProgress();
    }

    if (typeof resetGlobalDownloadState === 'function') {
        resetGlobalDownloadState();
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
