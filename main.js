/**
 * BuildFlow - Main JavaScript
 * Professional Website Builder Landing Page
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // =========================================
    // Navbar Scroll Effect
    // =========================================
    const navbar = document.getElementById('navbar'); 
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // =========================================
    // Mobile Navigation Toggle
    // =========================================
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
    
    // =========================================
    // Smooth Scroll for Anchor Links
    // =========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
        });
    });
    
    // =========================================
    // Pricing Toggle (Monthly/Annual)
    // =========================================
    const billingToggle = document.getElementById('billing-toggle');
    const priceAmounts = document.querySelectorAll('.amount');
    
    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            priceAmounts.forEach(amount => {
                const monthly = amount.dataset.monthly;
                const annual = amount.dataset.annual;
                
                if (this.checked) {
                    // Annual pricing
                    amount.textContent = annual;
                } else {
                    // Monthly pricing
                    amount.textContent = monthly;
                }
            });
        });
    }
    
    // =========================================
    // Template Filter
    // =========================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const templateCards = document.querySelectorAll('.template-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            
            templateCards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
    
    // =========================================
    // Testimonials Slider
    // =========================================
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    let autoSlideInterval;
    
    function showSlide(index) {
        testimonialCards.forEach((card, i) => {
            card.classList.remove('active');
            dots[i].classList.remove('active');
        });
        
        testimonialCards[index].classList.add('active');
        dots[index].classList.add('active');
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % testimonialCards.length;
        showSlide(currentSlide);
    }
    
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }
    
    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            currentSlide = index;
            showSlide(currentSlide);
            stopAutoSlide();
            startAutoSlide();
        });
    });
    
    // Start auto-slide
    if (testimonialCards.length > 0) {
        startAutoSlide();
    }
    
    // =========================================
    // Back to Top Button
    // =========================================
    const backToTop = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    if (backToTop) {
        backToTop.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // =========================================
    // Intersection Observer for Animations
    // =========================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe elements with fade-up class
    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });
    
    // Add fade-up to sections
    document.querySelectorAll('.section-header, .feature-card, .template-card, .step-card, .pricing-card').forEach(el => {
        el.classList.add('fade-up');
        observer.observe(el);
    });
    
    // =========================================
    // Dropdown Hover Effect (Desktop)
    // =========================================
    const dropdownItems = document.querySelectorAll('.nav-item.has-dropdown');
    
    dropdownItems.forEach(item => {
        let timeout;
        
        item.addEventListener('mouseenter', function() {
            clearTimeout(timeout);
            this.querySelector('.dropdown').style.opacity = '1';
            this.querySelector('.dropdown').style.visibility = 'visible';
        });
        
        item.addEventListener('mouseleave', function() {
            const dropdown = this.querySelector('.dropdown');
            timeout = setTimeout(() => {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
            }, 200);
        });
    });
    
    // =========================================
    // Counter Animation for Stats
    // =========================================
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        }
        
        updateCounter();
    }
    
    // =========================================
    // Form Validation (if contact form exists)
    // =========================================
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            let isValid = true;
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            });
            
            if (isValid) {
                // Submit form
                console.log('Form submitted!');
                // Add your form submission logic here
            }
        });
    });
    
    // =========================================
    // Lazy Loading for Images
    // =========================================
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
    
    // =========================================
    // Keyboard Navigation
    // =========================================
    document.addEventListener('keydown', function(e) {
        // ESC to close mobile menu
        if (e.key === 'Escape') {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
        }
    });
    
    // =========================================
    // Print Styles Detection
    // =========================================
    window.addEventListener('beforeprint', function() {
        document.body.classList.add('printing');
    });
    
    window.addEventListener('afterprint', function() {
        document.body.classList.remove('printing');
    });
    
    // =========================================
    // Console Welcome Message
    // =========================================
    console.log('%c🎨 BuildFlow', 'font-size: 24px; font-weight: bold; color: #4f46e5;');
    console.log('%cBuild beautiful websites without code.', 'font-size: 14px; color: #6b7280;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #e5e7eb;');
    
});          