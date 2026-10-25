import React, { useEffect } from 'react';

export const InitialLoader: React.FC = () => {
  useEffect(() => {
    let tips = [
      "HelloWorld Launcher allows you to open multiple game instances at the same time without conflicts.",
      "Did you know you can share your installations and modpacks with the community in the Workshop?"
    ];

    let currentTipIndex = Math.floor(Math.random() * tips.length);
    const tipEl = document.getElementById('loaderTipContent');
    const containerEl = document.getElementById('loaderTipsContainer');

    const updateTipsFromLang = () => {
      const win = window as any;
      if (win.translations && win.currentLanguage && win.translations[win.currentLanguage]) {
        const locTips = win.translations[win.currentLanguage].loading_tips;
        if (locTips && locTips.length > 0) {
          tips = locTips;
          if (
            tipEl &&
            (tipEl.textContent ===
              "HelloWorld Launcher allows you to open multiple game instances at the same time without conflicts." ||
              tipEl.textContent ===
                "Did you know you can share your installations and modpacks with the community in the Workshop?")
          ) {
            currentTipIndex = Math.floor(Math.random() * tips.length);
            tipEl.textContent = tips[currentTipIndex];
          }
        }
      }
    };

    (window as any).updateTipsFromLang = updateTipsFromLang;

    const showTip = () => {
      if (!tipEl || !containerEl || containerEl.classList.contains('hidden') || containerEl.style.display === 'none') return;
      containerEl.style.opacity = '0';
      setTimeout(() => {
        if (!tipEl || !containerEl || containerEl.classList.contains('hidden') || containerEl.style.display === 'none') return;
        updateTipsFromLang();
        currentTipIndex = (currentTipIndex + 1) % tips.length;
        tipEl.textContent = tips[currentTipIndex];
        containerEl.style.opacity = '1';
      }, 400);
    };

    if (tipEl && containerEl) {
      tipEl.textContent = tips[currentTipIndex];
      containerEl.style.opacity = '1';

      const intervalId = setInterval(() => {
        const loader = document.getElementById('initialLoader');
        if (!loader || loader.classList.contains('hidden') || loader.style.display === 'none') {
          clearInterval(intervalId);
          return;
        }
        showTip();
      }, 4500);

      return () => clearInterval(intervalId);
    }
  }, []);

  return (
    <div id="initialLoader" className="loader-container">
      <div className="cube-spinner">
        <div className="face-back"></div>
        <div className="face-right"></div>
        <div className="face-left"></div>
        <div className="face-top"></div>
        <div className="face-bottom"></div>
        <div className="face-front"></div>
      </div>
      <div className="loader-status-container">
        <div id="loaderStatusText" className="loader-status-text" data-i18n="loader.checking_local">
          Checking local storage...
        </div>
        <div className="loader-progress-bar-bg">
          <div id="loaderProgressBar" className="loader-progress-bar-fill" style={{ width: '15%' }}></div>
        </div>
        <div id="loaderPercentage" className="loader-percentage">
          15%
        </div>
      </div>
      {/* Launcher Tips Container */}
      <div id="loaderTipsContainer" className="loader-tips-container" style={{ opacity: 0 }}>
        <p id="loaderTipText" className="loader-tip-text">
          <span className="loader-tip-highlight">
            <i className="fas fa-lightbulb"></i> <span data-i18n="global.tip_prefix">Tip:</span>
          </span>{' '}
          <span id="loaderTipContent" data-i18n="global.loading_tips">
            Loading tips...
          </span>
        </p>
      </div>
    </div>
  );
};

export default InitialLoader;
