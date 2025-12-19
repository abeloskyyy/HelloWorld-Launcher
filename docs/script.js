document.addEventListener('DOMContentLoaded', () => {
    // === GitHub API Integration ===
    const repoOwner = 'abeloskyyy';
    const repoName = 'HelloWorld-Launcher';
    const heroBtn = document.getElementById('heroDownloadBtn');
    const navBtn = document.getElementById('navDownloadBtn');

    async function getLatestRelease() {
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            // Find the browser_download_url for the .exe or .jar
            // If no specific asset is found, fall back to html_url
            const asset = data.assets.find(a => a.name.endsWith('.exe') || a.name.endsWith('.jar')) || data.assets[0];
            const downloadUrl = asset ? asset.browser_download_url : data.html_url;
            const tagName = data.tag_name; // e.g., "v1.2.0"

            if (heroBtn) {
                heroBtn.href = downloadUrl;
                heroBtn.innerHTML = `<i class="bi bi-windows"></i> Descargar ${tagName}<div class="btn-shine"></div>`;
            }

            if (navBtn) {
                navBtn.href = downloadUrl;
                // Keeping the text simple for the nav button
            }

            // Update the badge text as well if it exists
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = `${tagName} Ya Disponible`;

        } catch (error) {
            console.error('Error fetching release:', error);
            // Fallback
            const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;
            if (heroBtn) heroBtn.href = fallbackUrl;
            if (navBtn) navBtn.href = fallbackUrl;
        }
    }

    getLatestRelease();


    // === Carousel Logic ===
    const track = document.getElementById('carouselTrack');
    const slides = Array.from(track.children);
    const nextButton = document.getElementById('nextBtn');
    const prevButton = document.getElementById('prevBtn');
    const nav = document.getElementById('carouselNav');

    // Create indicators
    slides.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.classList.add('carousel-indicator');
        if (index === 0) indicator.classList.add('current-slide');
        nav.appendChild(indicator);
        indicator.addEventListener('click', () => {
            moveToSlide(index);
        });
    });

    const indicators = Array.from(nav.children);
    let currentSlideIndex = 0;

    function moveToSlide(targetIndex) {
        // Loop around
        if (targetIndex < 0) targetIndex = slides.length - 1;
        if (targetIndex >= slides.length) targetIndex = 0;

        // Update visuals
        slides[currentSlideIndex].classList.remove('current-slide');
        indicators[currentSlideIndex].classList.remove('current-slide');

        slides[targetIndex].classList.add('current-slide');
        indicators[targetIndex].classList.add('current-slide');

        currentSlideIndex = targetIndex;
    }

    nextButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex + 1);
    });

    prevButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex - 1);
    });

    // Auto-advance
    let autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);

    // Pause on hover
    const carouselContainer = document.querySelector('.carousel-container');
    carouselContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
    carouselContainer.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);
    });


    // === Scroll Effect for Navbar ===
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 16, 0.9)';
            navbar.style.padding = '1rem 0';
        } else {
            navbar.style.background = 'rgba(5, 5, 16, 0.7)';
            navbar.style.padding = '1.5rem 0';
        }
    });
});
