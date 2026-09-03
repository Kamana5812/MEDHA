/**
 * MEDHA - Vanilla JavaScript Implementation & GSAP Animations
 * Architecture: ES6+
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // 1. DOM REFERENCES
    // ==========================================================================
    const DOM = {
        navbar: document.querySelector(".navbar"),
        mobileMenuBtn: document.querySelector(".mobile-menu-btn"),
        navLinksContainer: document.querySelector(".nav-links-container"),
        navLinks: document.querySelectorAll(".nav-links a"),
        sections: document.querySelectorAll("section[id]"),
        
        testimonialsTrack: document.querySelector(".testimonials-track"),
        prevBtn: document.querySelector(".prev-btn"),
        nextBtn: document.querySelector(".next-btn"),
        testimonialCards: document.querySelectorAll(".testimonial-card"),
        sliderIndicators: document.getElementById("slider-indicators"),
        
        counters: document.querySelectorAll(".stat-number"),
        achievementsSection: document.querySelector(".achievements"),
        
        contactForm: document.getElementById("contact-form"),
        submitBtn: document.getElementById("submit-btn"),
        
        playgroundControls: {
            spawn: document.getElementById("spawn-object"),
            gravity: document.getElementById("gravity-toggle"),
            color: document.getElementById("randomize-colors"),
            reset: document.getElementById("reset-scene")
        },
        playgroundStatus: {
            ready: document.getElementById("status-ready"),
            gravity: document.getElementById("status-gravity"),
            objects: document.getElementById("status-objects")
        },
        
        backToTopBtn: document.getElementById("back-to-top"),
        scrollProgress: document.getElementById("scroll-progress")
    };

    // ==========================================================================
    // 2. GLOBAL STATE
    // ==========================================================================
    const State = {
        mobileMenuOpen: false,
        testimonialIndex: 0,
        countersAnimated: false,
        formSubmitting: false,
        activeFilter: 'all',
        playground: {
            currentGravity: "Down",
            objectColorMode: "Default",
            objectCount: 0,
            sceneInitialized: true
        }
    };

    // ==========================================================================
    // 3. MOBILE NAVIGATION
    // ==========================================================================
    function initMobileMenu() {
        if (!DOM.mobileMenuBtn || !DOM.navLinksContainer) return;

        const toggleMenu = () => {
            State.mobileMenuOpen = !State.mobileMenuOpen;
            const isOpen = State.mobileMenuOpen;

            DOM.mobileMenuBtn.setAttribute("aria-expanded", isOpen);
            DOM.navLinksContainer.style.display = isOpen ? "flex" : "none";
            document.body.style.overflow = isOpen ? "hidden" : "";
        };

        const closeMenu = () => {
            if (State.mobileMenuOpen) toggleMenu();
        };

        DOM.mobileMenuBtn.addEventListener("click", toggleMenu);

        // Close when clicking a link
        DOM.navLinks.forEach(link => {
            link.addEventListener("click", closeMenu);
        });

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeMenu();
        });

        // Handle resize issues where menu might stay hidden
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                DOM.navLinksContainer.style.display = "";
                document.body.style.overflow = "";
                State.mobileMenuOpen = false;
                DOM.mobileMenuBtn.setAttribute("aria-expanded", "false");
            } else if (!State.mobileMenuOpen) {
                DOM.navLinksContainer.style.display = "none";
            }
        });
    }

    // ==========================================================================
    // 4. NAVBAR SCROLL STATE
    // ==========================================================================
    function initNavbarScroll() {
        if (!DOM.navbar) return;
        const handleNavbar = () => {
            if (window.scrollY > 50) {
                DOM.navbar.classList.add("scrolled");
            } else {
                DOM.navbar.classList.remove("scrolled");
            }
        };
        window.addEventListener("scroll", handleNavbar, { passive: true });
        handleNavbar();
    }

    // ==========================================================================
    // 5. SMOOTH NAVIGATION
    // ==========================================================================
    function initSmoothNavigation() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener("click", function (e) {
                const targetId = this.getAttribute("href");
                if (targetId === "#") return;

                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    // Account for fixed navbar height
                    const headerOffset = DOM.navbar ? DOM.navbar.offsetHeight : 0;
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                }
            });
        });
    }

    // ==========================================================================
    // 6. ACTIVE SECTION DETECTION
    // ==========================================================================
    function initActiveSectionDetection() {
        if (!DOM.sections.length || !DOM.navLinks.length) return;

        const observerOptions = {
            root: null,
            rootMargin: "-20% 0px -80% 0px", // Triggers when section is near top
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("id");
                    
                    DOM.navLinks.forEach(link => {
                        link.classList.remove("active");
                        if (link.getAttribute("href") === `#${id}`) {
                            link.classList.add("active");
                        }
                    });
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        DOM.sections.forEach(section => observer.observe(section));
    }

    // ==========================================================================
    // 7. TESTIMONIAL SLIDER
    // ==========================================================================
    function initTestimonialSlider() {
        if (!DOM.testimonialsTrack || !DOM.prevBtn || !DOM.nextBtn || !DOM.testimonialCards.length) return;

        const totalCards = DOM.testimonialCards.length;
        let indicators = [];

        // Build indicators
        if (DOM.sliderIndicators) {
            for (let i = 0; i < totalCards; i++) {
                const dot = document.createElement('div');
                dot.classList.add('indicator');
                dot.setAttribute("role", "button");
                dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
                dot.setAttribute("tabindex", "0");
                
                dot.addEventListener("click", () => {
                    State.testimonialIndex = i;
                    updateSlider();
                });
                dot.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        State.testimonialIndex = i;
                        updateSlider();
                    }
                });

                DOM.sliderIndicators.appendChild(dot);
                indicators.push(dot);
            }
        }
        
        const updateSlider = () => {
            const cardsPerView = window.innerWidth > 1024 ? 3 : 1;
            const maxIndex = Math.max(0, totalCards - cardsPerView);
            
            // Wrap logic
            if (State.testimonialIndex > maxIndex) State.testimonialIndex = 0;
            if (State.testimonialIndex < 0) State.testimonialIndex = maxIndex;
            
            const cardWidth = DOM.testimonialCards[0].offsetWidth;
            const margin = parseFloat(window.getComputedStyle(DOM.testimonialCards[0]).marginRight) || 0;
            
            const moveX = State.testimonialIndex * (cardWidth + margin);
            DOM.testimonialsTrack.style.transform = `translateX(-${moveX}px)`;
            
            // Update UI states
            indicators.forEach((dot, index) => {
                if (index === State.testimonialIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        };

        DOM.prevBtn.addEventListener("click", () => {
            State.testimonialIndex--;
            updateSlider();
        });

        DOM.nextBtn.addEventListener("click", () => {
            State.testimonialIndex++;
            updateSlider();
        });

        // Keyboard interaction for slider controls
        document.addEventListener("keydown", (e) => {
            const isSliderFocused = document.activeElement.closest('.testimonials');
            if (isSliderFocused) {
                if (e.key === "ArrowLeft") {
                    State.testimonialIndex--;
                    updateSlider();
                } else if (e.key === "ArrowRight") {
                    State.testimonialIndex++;
                    updateSlider();
                }
            }
        });

        window.addEventListener("resize", () => updateSlider());
        updateSlider(); // Initial execution
    }

    // ==========================================================================
    // 8. ACHIEVEMENT COUNTERS
    // ==========================================================================
    function initAchievementCounters() {
        if (!DOM.achievementsSection || !DOM.counters.length) return;

        const animateCounter = (counter) => {
            const target = +counter.getAttribute("data-target");
            const duration = 2000;
            const startTime = performance.now();
            const startValue = 0;

            const update = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                
                // Ease out cubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(startValue + (target - startValue) * easeProgress);
                
                counter.innerText = currentValue;

                if (progress < 1) requestAnimationFrame(update);
                else counter.innerText = target; // Ensure it finishes on target exactly
            };
            requestAnimationFrame(update);
        };

        const observerOptions = { threshold: 0.5 };
        const observerCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !State.countersAnimated) {
                    State.countersAnimated = true;
                    DOM.counters.forEach(animateCounter);
                    observer.unobserve(entry.target);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        observer.observe(DOM.achievementsSection);
    }

    // ==========================================================================
    // 9. CONTACT FORM VALIDATION
    // ==========================================================================
    function initContactForm() {
        if (!DOM.contactForm || !DOM.submitBtn) return;

        const showError = (input, messageId, message) => {
            input.style.borderColor = "red";
            input.setAttribute("aria-invalid", "true");
            const msgEl = document.getElementById(messageId);
            if (msgEl) msgEl.innerText = message;
        };

        const clearError = (input, messageId) => {
            input.style.borderColor = "var(--color-border)";
            input.removeAttribute("aria-invalid");
            const msgEl = document.getElementById(messageId);
            if (msgEl) msgEl.innerText = "";
        };

        DOM.contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            if (State.formSubmitting) return; // Prevent double submission

            let isValid = true;
            
            const name = document.getElementById("name");
            const email = document.getElementById("email");
            const subject = document.getElementById("subject");
            const message = document.getElementById("message");

            // Reset errors
            [name, email, subject, message].forEach(el => clearError(el, `error-${el.id}`));

            // Validate Name
            if (!name.value.trim()) {
                isValid = false;
                showError(name, "error-name", "Name cannot be empty.");
            }

            // Validate Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim()) {
                isValid = false;
                showError(email, "error-email", "Email cannot be empty.");
            } else if (!emailRegex.test(email.value)) {
                isValid = false;
                showError(email, "error-email", "Please enter a valid email address.");
            }

            // Validate Subject
            if (!subject.value.trim()) {
                isValid = false;
                showError(subject, "error-subject", "Subject cannot be empty.");
            }

            // Validate Message
            if (!message.value.trim()) {
                isValid = false;
                showError(message, "error-message", "Message cannot be empty.");
            }

            if (isValid) {
                // Simulate Loading / Backend Submission
                State.formSubmitting = true;
                const originalText = DOM.submitBtn.innerText;
                DOM.submitBtn.innerText = "Sending...";
                DOM.submitBtn.disabled = true;
                
                setTimeout(() => {
                    DOM.submitBtn.innerText = "Message Sent!";
                    DOM.submitBtn.style.background = "#22c55e"; // Success green
                    DOM.submitBtn.style.boxShadow = "none";
                    DOM.contactForm.reset();
                    
                    setTimeout(() => {
                        DOM.submitBtn.innerText = originalText;
                        DOM.submitBtn.style.background = "";
                        DOM.submitBtn.style.boxShadow = "";
                        DOM.submitBtn.disabled = false;
                        State.formSubmitting = false;
                    }, 3000);
                }, 1000); // Simulated delay
            }
        });
    }

    // ==========================================================================
    // 10. PLAYGROUND STATE
    // ==========================================================================
    function initPlaygroundState() {
        const controls = DOM.playgroundControls;
        const status = DOM.playgroundStatus;
        
        if (!controls.spawn) return;

        const updatePlaygroundStatusUI = () => {
            if (status.ready) status.ready.innerText = "Universe Active";
            if (status.gravity) status.gravity.innerText = `Gravity: ${State.playground.currentGravity}`;
            if (status.objects) status.objects.innerText = `Objects: ${State.playground.objectCount}`;
        };

        controls.spawn.addEventListener("click", () => {
            State.playground.objectCount++;
            updatePlaygroundStatusUI();
        });

        controls.gravity.addEventListener("click", () => {
            State.playground.currentGravity = State.playground.currentGravity === "Down" ? "Up" : "Down";
            const btnText = State.playground.currentGravity === "Down" ? "Change Gravity" : "Restore Gravity";
            controls.gravity.innerText = btnText;
            updatePlaygroundStatusUI();
        });

        controls.color.addEventListener("click", () => {
            State.playground.objectColorMode = "Randomized";
        });

        controls.reset.addEventListener("click", () => {
            State.playground.objectCount = 0;
            State.playground.currentGravity = "Down";
            State.playground.objectColorMode = "Default";
            controls.gravity.innerText = "Change Gravity";
            updatePlaygroundStatusUI();
        });
    }

    // ==========================================================================
    // 11. BACK TO TOP
    // ==========================================================================
    function initBackToTop() {
        if (!DOM.backToTopBtn) return;

        const toggleBackToTop = () => {
            if (window.scrollY > window.innerHeight) {
                DOM.backToTopBtn.classList.add("visible");
            } else {
                DOM.backToTopBtn.classList.remove("visible");
            }
        };

        window.addEventListener("scroll", toggleBackToTop, { passive: true });
        toggleBackToTop();

        DOM.backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // ==========================================================================
    // 12. SCROLL PROGRESS
    // ==========================================================================
    function initScrollProgress() {
        if (!DOM.scrollProgress) return;

        const updateProgress = () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
            DOM.scrollProgress.style.width = `${scrollPercent}%`;
        };

        window.addEventListener("scroll", updateProgress, { passive: true });
        updateProgress();
    }

    // ==========================================================================
    // 13. PROGRAM FILTERING
    // ==========================================================================
    function initProgramFilters() {
        const filterBtns = document.querySelectorAll(".filter-btn");
        const programCards = document.querySelectorAll(".program-card");

        if (!filterBtns.length || !programCards.length) return;

        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Update active state
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const filterValue = btn.getAttribute("data-filter");
                State.activeFilter = filterValue;

                // Animate transition using GSAP if available, otherwise just toggle display
                if (typeof gsap !== 'undefined') {
                    gsap.to(programCards, {
                        scale: 0.9, opacity: 0, duration: 0.3,
                        onComplete: () => {
                            programCards.forEach(card => {
                                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                                    card.style.display = 'flex';
                                } else {
                                    card.style.display = 'none';
                                }
                            });
                            // Refresh ScrollTrigger to recalculate heights
                            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
                            
                            gsap.to(programCards, {
                                scale: 1, opacity: 1, duration: 0.4, stagger: 0.05,
                                clearProps: "scale,opacity"
                            });
                        }
                    });
                } else {
                    programCards.forEach(card => {
                        if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                }
            });
        });
    }

    // ==========================================================================
    // GSAP ANIMATIONS (Sections 14-23)
    // ==========================================================================
    function initGSAPAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn("GSAP or ScrollTrigger not loaded.");
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        // 20. REDUCED MOTION
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return; // Safely exit and keep static layout for a11y

        // Use context for easy cleanup if needed
        let ctx = gsap.context(() => {
            
            // 1. PAGE LOAD MASTER TIMELINE & 2. NAVBAR ANIMATION
            const masterTl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } });
            
            masterTl.from(DOM.navbar, { y: -30, opacity: 0, duration: 1 })
                    .from(".hero-content .badge", { y: 20, opacity: 0 }, "-=0.6")
                    .from(".hero-title", { y: 30, opacity: 0, clipPath: "inset(0 0 100% 0)" }, "-=0.6")
                    .from(".hero-subtitle", { y: 20, opacity: 0 }, "-=0.8")
                    .from(".hero-cta .btn", { y: 20, opacity: 0, stagger: 0.1 }, "-=0.8")
                    .from(".hero-3d", { scale: 0.95, opacity: 0, duration: 1.5, ease: "power2.out" }, "-=1");

            // 5. HERO AMBIENT ANIMATION (Subtle DOM-level)
            gsap.to(".hero-3d canvas", {
                y: -10,
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            // 6. ABOUT SECTION
            gsap.from(".about-content > *", {
                scrollTrigger: { trigger: ".about", start: "top 75%" },
                y: 40, opacity: 0, stagger: 0.15, duration: 1, ease: "power2.out"
            });
            gsap.from(".about-visual", {
                scrollTrigger: { trigger: ".about", start: "top 75%" },
                x: 40, opacity: 0, duration: 1, delay: 0.3, ease: "power2.out"
            });

            // 7. PROGRAMS SECTION
            gsap.from("#programs .section-title", {
                scrollTrigger: { trigger: "#programs", start: "top 80%" },
                y: 30, opacity: 0, duration: 0.8
            });
            gsap.from(".program-card", {
                scrollTrigger: { trigger: "#programs", start: "top 70%" },
                y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power2.out"
            });

            // 8. WHY MEDHA SECTION
            gsap.from("#why-us .section-title", {
                scrollTrigger: { trigger: "#why-us", start: "top 80%" },
                y: 30, opacity: 0, duration: 0.8
            });
            gsap.from(".feature-item", {
                scrollTrigger: { trigger: "#why-us", start: "top 70%" },
                y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power2.out"
            });

            // 9. PLAYGROUND SECTION (UI only)
            const playgroundTl = gsap.timeline({ scrollTrigger: { trigger: "#playground", start: "top 75%" } });
            playgroundTl.from(".playground-content > *", { y: 30, opacity: 0, stagger: 0.1, duration: 0.8 })
                        .from(".playground-3d", { scale: 0.98, opacity: 0, duration: 1 }, "-=0.4");

            // 10. MENTORS SECTION
            gsap.from("#mentors .section-title", {
                scrollTrigger: { trigger: "#mentors", start: "top 80%" },
                y: 30, opacity: 0, duration: 0.8
            });
            gsap.from(".mentor-card", {
                scrollTrigger: { trigger: "#mentors", start: "top 70%" },
                y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power2.out"
            });

            // 11. ACHIEVEMENTS SECTION (GSAP integration for subtle container reveal)
            gsap.from(".stat-item", {
                scrollTrigger: { trigger: "#achievements", start: "top 85%" },
                y: 20, opacity: 0, stagger: 0.1, duration: 0.6
            });
            // Number counter logic is kept strictly inside initAchievementCounters()

            // 12. TESTIMONIAL SECTION
            gsap.from("#testimonials .section-title", {
                scrollTrigger: { trigger: "#testimonials", start: "top 80%" },
                y: 30, opacity: 0, duration: 0.8
            });
            gsap.from(".testimonials-slider-container", {
                scrollTrigger: { trigger: "#testimonials", start: "top 70%" },
                y: 30, opacity: 0, duration: 0.8, ease: "power2.out"
            });

            // 13. EVENTS SECTION
            gsap.from("#events .section-title", {
                scrollTrigger: { trigger: "#events", start: "top 80%" },
                y: 30, opacity: 0, duration: 0.8
            });
            gsap.from(".event-card", {
                scrollTrigger: { trigger: "#events", start: "top 70%" },
                y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power2.out"
            });

            // 14. ADMISSION CTA
            const ctaTl = gsap.timeline({ scrollTrigger: { trigger: "#admission", start: "top 75%" } });
            ctaTl.from(".admission-container", { scale: 0.95, opacity: 0, duration: 1, ease: "expo.out" })
                 .from(".admission-container h2", { y: 20, opacity: 0, duration: 0.6 }, "-=0.6")
                 .from(".admission-container p", { y: 20, opacity: 0, duration: 0.6 }, "-=0.4")
                 .from(".admission-container .btn", { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, "-=0.4");

            // 15. CONTACT SECTION
            gsap.from(".contact-info > *", {
                scrollTrigger: { trigger: "#contact", start: "top 75%" },
                x: -30, opacity: 0, stagger: 0.15, duration: 0.8
            });
            gsap.from(".contact-form-wrapper", {
                scrollTrigger: { trigger: "#contact", start: "top 75%" },
                x: 30, opacity: 0, duration: 0.8
            });

            // 16. FOOTER
            gsap.from(".footer-container > div", {
                scrollTrigger: { trigger: ".footer", start: "top 90%" },
                y: 20, opacity: 0, stagger: 0.1, duration: 0.8
            });

            // 18. PARALLAX
            gsap.to(".visual-placeholder", {
                scrollTrigger: {
                    trigger: ".about",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                },
                y: -40
            });

        });
    }

    // ==========================================================================
    // 13. INITIALIZATION
    // ==========================================================================
    function init() {
        initMobileMenu();
        initNavbarScroll();
        initSmoothNavigation();
        initActiveSectionDetection();
        initTestimonialSlider();
        initAchievementCounters();
        initContactForm();
        initPlaygroundState();
        initBackToTop();
        initScrollProgress();
        initProgramFilters();
        
        // Load GSAP
        initGSAPAnimations();
    }

    // Launch
    init();
});
