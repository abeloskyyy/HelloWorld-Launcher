/**
 * INTERACTIVE SPOTLIGHT TUTORIAL SYSTEM
 * 
 * This system allows creating step-by-step tutorials where:
 * - The UI gets darkened except for the target element
 * - A tooltip explains what to do
 * - User clicks on the real element to advance
 */

(function () {
    'use strict';

    // Tutorial state
    let isActive = false;
    let currentStepIndex = 0;
    let tutorialSteps = [];
    let onComplete = null;

    // DOM Elements (created dynamically)
    let overlay = null;
    let spotlight = null;
    let tooltip = null;
    let progressContainer = null;
    let currentResizeObserver = null;

    /**
     * Initialize the tutorial DOM elements
     */
    function initDOM() {
        if (overlay) return; // Already initialized

        // Create overlay
        overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);

        // Create spotlight
        spotlight = document.createElement('div');
        spotlight.className = 'tutorial-spotlight';
        document.body.appendChild(spotlight);

        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'tutorial-tooltip';
        tooltip.innerHTML = `
            <div class="tutorial-tooltip-step">
                <span class="step-number">1</span>
                <span class="step-label">Step 1 of 5</span>
            </div>
            <div class="tutorial-tooltip-title">Title</div>
            <div class="tutorial-tooltip-text">Description text here</div>
            <div class="tutorial-tooltip-hint">
                <i class="fas fa-hand-pointer"></i>
                <span>Click here to continue</span>
            </div>
        `;
        document.body.appendChild(tooltip);

        // Create progress dots container
        progressContainer = document.createElement('div');
        progressContainer.className = 'tutorial-progress';
        document.body.appendChild(progressContainer);
    }

    /**
     * Start the interactive tutorial
     * @param {Array} steps - Array of step objects
     * @param {Function} onCompleteCallback - Called when tutorial finishes
     * 
     * Step object format:
     * {
     *   target: 'CSS selector' or HTMLElement,
     *   title: 'Step title',
     *   text: 'Description',
     *   hint: 'Click hint text',
     *   position: 'top' | 'bottom' | 'left' | 'right' (tooltip position),
     *   action: 'click' | 'custom', // What triggers next step
     *   beforeShow: async function() {}, // Run before showing this step
     *   onComplete: async function() {} // Run after step completes
     * }
     */
    window.startSpotlightTutorial = async function (steps, onCompleteCallback) {
        if (isActive) return;

        initDOM();

        tutorialSteps = steps;
        currentStepIndex = 0;
        onComplete = onCompleteCallback;
        isActive = true;

        // Activate UI (no dots since flow is dynamic)
        overlay.classList.add('active');

        // Show first step
        await showStep(0);
    };

    /**
     * End the tutorial
     */
    window.endSpotlightTutorial = endTutorial;

    function endTutorial() {
        if (!isActive) return;

        isActive = false;

        // Cleanup observer
        if (currentResizeObserver) {
            currentResizeObserver.disconnect();
            currentResizeObserver = null;
        }

        // Remove target class from any element
        const currentTarget = document.querySelector('.tutorial-target');
        if (currentTarget) {
            currentTarget.classList.remove('tutorial-target');
            currentTarget.removeEventListener('click', handleTargetClick);
            currentTarget.removeEventListener('change', handleTargetClick);
        }

        // Reset any elevated modals
        document.querySelectorAll('.tutorial-elevated-modal').forEach(m => {
            m.classList.remove('tutorial-elevated-modal');
        });

        // Add closing classes for animation
        overlay.classList.add('closing');
        spotlight.classList.add('closing');
        tooltip.classList.add('closing');

        // Wait for animation to finish before fully hiding
        setTimeout(() => {
            overlay.classList.remove('active', 'closing');
            spotlight.classList.remove('active', 'closing');
            tooltip.classList.remove('active', 'closing');
            progressContainer.classList.remove('active');

            // Callback
            if (onComplete) {
                onComplete();
            }
        }, 300);
    }

    /**
     * Show a specific step
     */
    async function showStep(index) {
        if (index >= tutorialSteps.length) {
            endTutorial();
            return;
        }

        currentStepIndex = index;
        const step = tutorialSteps[index];

        // Cleanup previous observer
        if (currentResizeObserver) {
            currentResizeObserver.disconnect();
            currentResizeObserver = null;
        }

        // Run beforeShow if exists
        if (step.beforeShow) {
            await step.beforeShow();
        }

        // Just in case step.beforeShow or a previous step hid them
        if (spotlight) spotlight.style.opacity = '1';
        if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.style.display = ''; // Clear the inline 'none' display
        }

        // Get target element
        let targetEl = step.target;
        if (typeof step.target === 'function') {
            targetEl = step.target();
        } else if (typeof step.target === 'string') {
            targetEl = document.querySelector(step.target);
        }

        if (!targetEl) {
            console.error(`Tutorial: Target not found for step ${index}:`, step.target);
            // Skip to next step
            await showStep(index + 1);
            return;
        }

        // Remove previous target styling and modal elevation
        const prevTarget = document.querySelector('.tutorial-target');
        if (prevTarget && prevTarget !== targetEl) {
            prevTarget.classList.remove('tutorial-target');
            prevTarget.removeEventListener('click', handleTargetClick);
        }

        // Reset any previously elevated containers
        document.querySelectorAll('.tutorial-elevated-modal, .tutorial-elevated-sidebar, .skin-pack-card.tutorial-elevated-modal').forEach(m => {
            m.classList.remove('tutorial-elevated-modal');
            m.classList.remove('tutorial-elevated-sidebar');
        });

        // Check if target is inside a modal and elevate it
        const parentModal = targetEl.closest('.modal');
        if (parentModal) {
            parentModal.classList.add('tutorial-elevated-modal');
        }

        // Check if target is inside a skin card and elevate it (for Use button step)
        const parentCard = targetEl.closest('.skin-pack-card');
        if (parentCard) {
            parentCard.classList.add('tutorial-elevated-modal');
        }

        // Check if target is inside sidebar and elevate it
        const parentSidebar = targetEl.closest('.sidebar');
        if (parentSidebar) {
            parentSidebar.classList.add('tutorial-elevated-sidebar');
        }

        // Position spotlight over target
        positionSpotlight(targetEl);

        // Add target class for z-index and click handling
        targetEl.classList.add('tutorial-target');

        // Observe target for resizing
        let rafId = null;
        currentResizeObserver = new ResizeObserver(() => {
            if (isActive && targetEl.classList.contains('tutorial-target')) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    positionSpotlight(targetEl);
                    positionTooltip(targetEl, step.position || 'bottom');
                });
            }
        });
        currentResizeObserver.observe(targetEl);

        // Use 'change' for select, 'blur' for input/textarea, 'click' for everything else
        if (step.advanceOn !== 'manual') {
            let eventType = 'click';
            if (targetEl.tagName === 'SELECT') {
                eventType = 'change';
            } else if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') {
                eventType = 'blur';
            }
            targetEl.addEventListener(eventType, handleTargetClick, { once: true, capture: true });
        }

        // Update and position tooltip
        updateTooltip(step, index);
        positionTooltip(targetEl, step.position || 'bottom');

        // Show elements
        spotlight.classList.add('active');
        tooltip.classList.add('active');

        // Update progress
        updateProgressDots();
    }

    /**
     * Handle click on target element
     */
    async function handleTargetClick(e) {
        const step = tutorialSteps[currentStepIndex];
        const targetEl = e.currentTarget;

        // Run onComplete callback if exists
        let shouldAdvance = true;
        if (step.onComplete) {
            const result = await step.onComplete();
            if (result === false) {
                shouldAdvance = false;
            }
        }

        // If validation failed, re-attach listener and keep target highlighted
        if (!shouldAdvance) {
            // Re-add target class and listener
            targetEl.classList.add('tutorial-target');
            let eventType = 'click';
            if (targetEl.tagName === 'SELECT') {
                eventType = 'change';
            } else if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') {
                eventType = 'blur';
            }
            targetEl.addEventListener(eventType, handleTargetClick, { once: true, capture: true });
            return; // Don't proceed
        }

        // Remove target class (validation passed)
        targetEl.classList.remove('tutorial-target');

        // Small delay before next step
        await new Promise(r => setTimeout(r, 300));

        // Next step
        await showStep(currentStepIndex + 1);
    }

    /**
     * Position the spotlight over an element
     */
    /**
     * Position the spotlight over an element
     */
    function positionSpotlight(el) {
        // Ensure element is in view instantly so getBoundingClientRect is accurate and not mid-scroll
        el.scrollIntoView({ block: 'center' });

        const rect = el.getBoundingClientRect();
        const padding = 8;

        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';
    }

    /**
     * Update tooltip content
     */
    function updateTooltip(step, index) {
        const stepInfo = tooltip.querySelector('.tutorial-tooltip-step');
        const title = tooltip.querySelector('.tutorial-tooltip-title');
        const text = tooltip.querySelector('.tutorial-tooltip-text');
        const hint = tooltip.querySelector('.tutorial-tooltip-hint span');

        // Hide step counter since tutorial flow is dynamic
        if (stepInfo) stepInfo.style.display = 'none';

        title.textContent = step.title || '';
        text.innerHTML = step.text || '';
        hint.textContent = step.hint || 'Click here to continue';
    }

    /**
     * Position tooltip relative to target
     */
    function positionTooltip(targetEl, position) {
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const gap = 20;

        // Remove all arrow classes
        tooltip.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - gap;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                tooltip.classList.add('arrow-bottom');
                break;
            case 'bottom':
                top = rect.bottom + gap;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                tooltip.classList.add('arrow-top');
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - gap;
                tooltip.classList.add('arrow-right');
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + gap;
                tooltip.classList.add('arrow-left');
                break;
            default:
                top = rect.bottom + gap;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                tooltip.classList.add('arrow-top');
        }

        // Keep tooltip in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = viewportHeight - tooltipRect.height - 10;
        }

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    }

    /**
     * Update progress dots
     */
    function updateProgressDots() {
        progressContainer.innerHTML = '';

        for (let i = 0; i < tutorialSteps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'tutorial-progress-dot';

            if (i < currentStepIndex) {
                dot.classList.add('completed');
            } else if (i === currentStepIndex) {
                dot.classList.add('current');
            }

            progressContainer.appendChild(dot);
        }
    }

    /**
     * Advance to next step programmatically
     */
    window.nextTutorialStep = async function () {
        if (!isActive) return;

        const targetEl = document.querySelector('.tutorial-target');
        if (targetEl) {
            targetEl.classList.remove('tutorial-target');
            targetEl.removeEventListener('click', handleTargetClick);
            targetEl.removeEventListener('change', handleTargetClick);
            targetEl.removeEventListener('blur', handleTargetClick);
        }

        await showStep(currentStepIndex + 1);
    };

    // Alias for clarity
    window.advanceSpotlightTutorial = window.nextTutorialStep;

    /**
     * Check if tutorial is currently active
     */
    window.isTutorialActive = function () {
        return isActive;
    };

    /**
     * Update spotlight content dynamically without changing steps
     */
    window.updateSpotlightContent = function (titleStr, textStr, hintStr) {
        if (!isActive || !tooltip) return;

        const title = tooltip.querySelector('.tutorial-tooltip-title');
        const text = tooltip.querySelector('.tutorial-tooltip-text');
        const hint = tooltip.querySelector('.tutorial-tooltip-hint span');

        if (title && titleStr) title.textContent = titleStr;
        if (text && textStr) text.textContent = textStr;
        if (hint && hintStr) hint.textContent = hintStr;

        // Re-position tooltip
        const target = document.querySelector('.tutorial-target');
        if (target) {
            const step = tutorialSteps[currentStepIndex];
            const position = step ? (step.position || 'bottom') : 'bottom';
            positionTooltip(target, position);
        }
    };

    /**
     * Dynamically change the spotlight target without advancing the step
     */
    window.setSpotlightTarget = function (newTarget, optionalPosition) {
        if (!isActive || !newTarget) return;

        const prevTarget = document.querySelector('.tutorial-target');
        if (prevTarget === newTarget) {
            // Only update position if forced, otherwise skip
            if (optionalPosition) positionTooltip(newTarget, optionalPosition);
            return;
        }

        if (prevTarget) {
            prevTarget.classList.remove('tutorial-target');
            if (currentResizeObserver) {
                currentResizeObserver.unobserve(prevTarget);
            }
        }

        newTarget.classList.add('tutorial-target');
        positionSpotlight(newTarget);

        const step = tutorialSteps[currentStepIndex];
        const pos = optionalPosition || step.position || 'bottom';
        positionTooltip(newTarget, pos);

        if (currentResizeObserver) {
            currentResizeObserver.observe(newTarget);
        }
    };

})();
