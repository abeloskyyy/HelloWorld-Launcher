// === Main Script ===

// === Firebase Configuration ===
const firebaseConfig = {
    apiKey: "AIzaSyACXEDO5R48HrlxVCyz8fBGimEIVkY2QSM",
    authDomain: "helloworld-launcher.firebaseapp.com",
    databaseURL: "https://helloworld-launcher-default-rtdb.firebaseio.com",
    projectId: "helloworld-launcher",
    storageBucket: "helloworld-launcher.firebasestorage.app",
    messagingSenderId: "1088760222656",
    appId: "1:1088760222656:web:13aefa81bdecdfdf832e25"
};

// Global Firebase DB Reference
let db;

document.addEventListener('DOMContentLoaded', () => {
    // === Initialize Firebase ===
    if (window.firebaseModules) {
        try {
            const app = window.firebaseModules.initializeApp(firebaseConfig);
            db = window.firebaseModules.getDatabase(app);
            console.log('Firebase Initialized');
        } catch (e) {
            console.error('Firebase Init Error (Did you fill in the config?):', e);
        }
    }

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
                heroBtn.innerHTML = `<i class="bi bi-windows"></i> Download ${tagName}<div class="btn-shine"></div>`;
            }

            if (navBtn) {
                navBtn.href = downloadUrl;
                // Keeping the text simple for the nav button
            }

            // Update the badge text as well if it exists
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = `${tagName} Now Available`;

        } catch (error) {
            console.error('Error fetching release:', error);
            // Fallback
            const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;
            if (heroBtn) heroBtn.href = fallbackUrl;
            if (navBtn) navBtn.href = fallbackUrl;
        }
    }

    getLatestRelease();


    // === Fetch Statistics (Downloads & Stars) ===
    async function getRepoStats() {
        try {
            // 1. Get Stars & Reviews from Firebase (Realtime)
            if (db && window.firebaseModules) {
                const { ref, onValue } = window.firebaseModules;
                const reviewsRef = ref(db, 'reviews');

                onValue(reviewsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const reviews = Object.values(data);
                        const count = reviews.length;
                        const totalStars = reviews.reduce((acc, curr) => acc + parseInt(curr.rating), 0);
                        const average = (totalStars / count).toFixed(1);

                        // Update UI
                        const starCountEl = document.getElementById('starCount');
                        const reviewCountEl = document.getElementById('reviewCount');

                        if (starCountEl) starCountEl.textContent = average;
                        if (reviewCountEl) reviewCountEl.textContent = `(${count})`;
                    }
                });
            } else {
                // Fallback to GitHub Stars if Firebase not configured
                const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
                if (repoResponse.ok) {
                    const repoData = await repoResponse.json();
                    const starCount = repoData.stargazers_count;
                    if (starCount > 0) {
                        const reviewCountEl = document.getElementById('reviewCount');
                        if (reviewCountEl) reviewCountEl.textContent = `(${starCount})`;
                    }
                }
            }

            // 2. Get Total Downloads (GitHub Releases)
            const releasesResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`);
            if (releasesResponse.ok) {
                const releases = await releasesResponse.json();
                let totalDownloads = 0;
                releases.forEach(release => {
                    if (release.assets) {
                        release.assets.forEach(asset => {
                            totalDownloads += asset.download_count;
                        });
                    }
                });

                const downloadCountEl = document.getElementById('downloadCount');
                // Format number (e.g. 1.2k)
                if (downloadCountEl) {
                    if (totalDownloads > 1000) {
                        downloadCountEl.textContent = (totalDownloads / 1000).toFixed(1) + 'k+';
                    } else {
                        downloadCountEl.textContent = totalDownloads;
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    getRepoStats();


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

    // === 3D Cube Rotation with Inertia ===
    const cube = document.getElementById('blockCube');
    const heroVisual = document.querySelector('.hero-visual');
    if (cube && heroVisual) {
        // --- Configuration ---
        const friction = 0.95;       // Friction amount (0 to 1). Lower = more friction.
        const sensitivity = 0.5;    // Drag sensitivity.
        const autoSpinSpeed = 0.2;  // Speed of auto-rotation.
        const minRotationX = -90;   // Minimum vertical rotation (degrees)
        const maxRotationX = 90;    // Maximum vertical rotation (degrees)
        // ---------------------

        let isDragging = false;
        let startX, startY;
        let rotationX = -20;
        let rotationY = 30;
        let velocityX = 0;
        let velocityY = 0;

        heroVisual.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            cube.style.transition = 'none';
        });

        // Touch Support
        heroVisual.addEventListener('touchstart', (e) => {
            // No e.preventDefault() here to allow scrolling if they just tap
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            cube.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            handleMove(e.clientX, e.clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Stop scrolling while rotating!
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        function handleMove(clientX, clientY) {
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            // Update velocities based on movement
            velocityY = deltaX * sensitivity;
            velocityX = -deltaY * sensitivity;

            rotationY += velocityY;
            rotationX += velocityX;

            // Clamp vertical rotation
            rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));

            cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;

            startX = clientX;
            startY = clientY;
        }

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        function update() {
            if (!isDragging) {
                // Apply friction
                velocityY *= friction;
                velocityX *= friction;

                // Add a bit of constant auto-rotation
                rotationY += velocityY + autoSpinSpeed;
                rotationX += velocityX;

                // Clamp vertical rotation during inertia
                rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));
                if (rotationX === minRotationX || rotationX === maxRotationX) velocityX = 0;

                cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
            }
            requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    // === Review System Logic ===
    const reviewBtn = document.getElementById('reviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    const closeModal = document.querySelector('.close-modal');
    const reviewForm = document.getElementById('reviewForm');
    const stars = document.querySelectorAll('.star-rating i');
    const ratingInput = document.getElementById('ratingValue');

    if (!reviewBtn || !reviewModal) return;

    // Open Modal
    function openModal() {
        reviewModal.classList.add('active');
        // Stop the floating animation when open
        reviewBtn.style.animation = 'none';

        // Check if there's a URL parameter indicating we should open the review
        // (Just to clean the URL if we want, but keeping it simple)
    }

    // Close Modal
    function closeModalFunc() {
        reviewModal.classList.remove('active');
        reviewBtn.style.animation = 'float 3s ease-in-out infinite';
    }

    reviewBtn.addEventListener('click', openModal);

    closeModal.addEventListener('click', closeModalFunc);

    // Close on outside click
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            closeModalFunc();
        }
    });

    // Check URL Parameters for ?review=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('review') === 'true') {
        openModal();
    }

    // Star Rating Interaction
    let currentRating = 0;

    stars.forEach(star => {
        // Hover
        star.addEventListener('mouseover', function () {
            const rating = this.getAttribute('data-rating');
            highlightStars(rating);
        });

        // Mouse out
        star.addEventListener('mouseout', function () {
            highlightStars(currentRating);
        });

        // Click
        star.addEventListener('click', function () {
            currentRating = this.getAttribute('data-rating');
            ratingInput.value = currentRating;
            highlightStars(currentRating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = star.getAttribute('data-rating');
            if (starRating <= rating) {
                star.classList.add('active');
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            } else {
                star.classList.remove('active');
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star'); // Optional: outline star for empty
            }
        });
    }

    // Handle Form Submission
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rating = ratingInput.value;
        const name = document.getElementById('reviewerName').value || 'Anonymous';
        const comment = document.getElementById('reviewComment').value;

        if (!rating) {
            alert('Please select a star rating!');
            return;
        }

        const reviewData = {
            rating,
            name,
            comment,
            timestamp: new Date().toISOString()
        };

        console.log('Review Submitted:', reviewData);

        // --- SAVE TO FIREBASE ---
        if (db && window.firebaseModules) {
            const { ref, push, serverTimestamp } = window.firebaseModules;
            const reviewsRef = ref(db, 'reviews');

            // Push new review
            push(reviewsRef, {
                ...reviewData,
                timestamp: serverTimestamp() // Use server timestamp
            }).then(() => {
                alert('Review saved to Database successfully!');
            }).catch(error => {
                console.error('Firebase Error:', error);
                alert('Error saving review to database. Check console.');
            });
        }

        // --- SEND TO DISCORD (Keep as backup/notification) ---
        const discordWebhookUrl = 'https://discord.com/api/webhooks/1452650172608807065/56mwK1bVuBAih9CykvYCqy4tMu7KXO0C189HnT5h6bdAT4JU8ld8TmXPtXPkVbL9clgU';

        if (discordWebhookUrl) {
            fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**New Review!**\n**Rating:** ${rating}/5 stars\n**Name:** ${name}\n**Comment:** ${comment}`
                })
            }).catch(err => console.error('Error sending webhook:', err));
        }

        // Reset and close
        reviewForm.reset();
        currentRating = 0;
        highlightStars(0);
        closeModalFunc();
    });
});
