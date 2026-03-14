/**
 * BuildFlow - Main JavaScript
 * Professional Website Builder Landing Page
 */

document.addEventListener('DOMContentLoaded', function() {
    function isLoggedIn() {
        return localStorage.getItem('nexlance_auth') === '1';
    }

    function getCurrentPlanCode() {
        try {
            const plan = JSON.parse(localStorage.getItem('nexlance_plan') || 'null');
            return plan && plan.code ? plan.code : 'individual';
        } catch (error) {
            return 'individual';
        }
    }

    function notify(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            window.alert(message);
        }
    }

    function getBusinessPlanAmountCents() {
        const amountEl = document.querySelector('.pricing-grid .pricing-card.popular .amount, .price-grid .price-card.popular .price-num');
        if (!amountEl) return 39900;

        const monthly = Number.parseFloat(amountEl.dataset.monthly || amountEl.textContent || '399');
        const annual = Number.parseFloat(amountEl.dataset.annual || monthly);
        const isAnnual = Boolean(
            (document.getElementById('billing-toggle') && document.getElementById('billing-toggle').checked)
            || (document.getElementById('billingToggle') && document.getElementById('billingToggle').checked)
        );

        return Math.round((isAnnual ? annual : monthly) * 100);
    }

    function getBusinessPlanSummaryText() {
        const isAnnual = Boolean(
            (document.getElementById('billing-toggle') && document.getElementById('billing-toggle').checked)
            || (document.getElementById('billingToggle') && document.getElementById('billingToggle').checked)
        );
        return isAnnual ? 'Annual full dashboard access' : 'Monthly full dashboard access';
    }

    function getBusinessPlanProductCode() {
        const isAnnual = Boolean(
            (document.getElementById('billing-toggle') && document.getElementById('billing-toggle').checked)
            || (document.getElementById('billingToggle') && document.getElementById('billingToggle').checked)
        );
        return isAnnual ? 'business_annual' : 'business_monthly';
    }

    function formatEuroAmount(amountCents) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format((Number(amountCents) || 0) / 100);
    }

    async function completeBusinessCheckout(amountCents) {
        const price = typeof amountCents === 'number' ? amountCents / 100 : 399;

        if (typeof activateBusinessPlanAccess === 'function') {
            activateBusinessPlanAccess();
        } else {
            localStorage.setItem('nexlance_plan', JSON.stringify({
                code: 'business',
                name: 'Business',
                paid: true,
                price,
                currency: 'EUR',
                startedAt: new Date().toISOString()
            }));
        }

        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && typeof db !== 'undefined' && db) {
            await db.collection('users').doc(firebase.auth().currentUser.uid).set({
                currentPlan: 'Business',
                planCode: 'business',
                planPaid: true,
                planStatus: 'active',
                fullAccess: true,
                paymentAmount: price,
                upgradedAt: new Date().toISOString()
            }, { merge: true });
        }

        notify('Business plan payment completed. Full dashboard access is now unlocked.', 'success');
        window.location.href = 'dashboard.html';
    }

    function setupPlanCheckout() {
        const params = new URLSearchParams(window.location.search);
        const checkoutPlan = params.get('checkout');

        document.querySelectorAll('[data-plan-action="business"]').forEach(button => {
            button.addEventListener('click', async event => {
                event.preventDefault();
                event.stopPropagation();

                if (getCurrentPlanCode() === 'business') {
                    notify('Your Business plan is already active.', 'success');
                    window.location.href = 'dashboard.html';
                    return;
                }

                const amountCents = getBusinessPlanAmountCents();

                if (!window.confirm(`Confirm payment of ${formatEuroAmount(amountCents)} for the Business plan?`)) {
                    return;
                }

                if (!window.NexlancePayments || typeof window.NexlancePayments.startBusinessCheckout !== 'function') {
                    notify('Secure payment is not available yet. Make sure payment.js is loaded.', 'error');
                    return;
                }

                try {
                    const redirectTarget = window.NexlancePayments.getCurrentPageWithQuery({ checkout: 'business' });

                    await window.NexlancePayments.startBusinessCheckout({
                        amount: amountCents,
                        currency: 'eur',
                        productCode: getBusinessPlanProductCode(),
                        redirectTarget,
                        summaryTitle: 'Business Plan',
                        summaryText: getBusinessPlanSummaryText(),
                        description: 'Nexlance Business plan upgrade',
                        successMessage: 'Business plan payment completed successfully.',
                        onSuccess: async () => {
                            await completeBusinessCheckout(amountCents);
                        }
                    });
                } catch (error) {
                    console.error('Business checkout failed:', error);
                    notify('Could not complete the Business plan payment. Please try again.', 'error');
                }
            });
        });

        if (checkoutPlan === 'business' && isLoggedIn() && getCurrentPlanCode() !== 'business') {
            const businessButton = document.querySelector('[data-plan-action="business"]');
            if (businessButton) {
                setTimeout(() => businessButton.click(), 120);
            }
        }
    }

    function setupPricingSections() {
        const homepageCards = document.querySelectorAll('.pricing-grid .pricing-card');
        if (homepageCards.length > 2) {
            homepageCards.forEach((card, index) => {
                if (index > 1) card.remove();
            });
        }

        const pricingPageCards = document.querySelectorAll('.price-grid .price-card');
        if (pricingPageCards.length > 2) {
            pricingPageCards.forEach((card, index) => {
                if (index > 1) card.remove();
            });
        }

        const individualAmount = document.querySelectorAll('.amount[data-monthly], .price-num[data-monthly]');
        if (individualAmount.length) {
            const first = individualAmount[0];
            first.dataset.monthly = '0';
            first.dataset.annual = '0';
            first.textContent = '0';
        }

        const homepagePlanTitles = document.querySelectorAll('.pricing-grid .pricing-header h3');
        if (homepagePlanTitles[0]) homepagePlanTitles[0].textContent = 'Individual';
        if (homepagePlanTitles[1]) homepagePlanTitles[1].textContent = 'Business';

        const homepagePlanDescriptions = document.querySelectorAll('.pricing-grid .pricing-header p');
        if (homepagePlanDescriptions[0]) homepagePlanDescriptions[0].textContent = 'Free plan for project-focused access';
        if (homepagePlanDescriptions[1]) homepagePlanDescriptions[1].textContent = 'Paid plan for full dashboard access';

        const homepageFeatureLists = document.querySelectorAll('.pricing-grid .pricing-features');
        if (homepageFeatureLists[0]) {
            homepageFeatureLists[0].innerHTML = `
                <li><span class="check">&#10003;</span> Projects section access</li>
                <li><span class="check">&#10003;</span> Support info access</li>
                <li><span class="check">&#10003;</span> Template editing</li>
                <li><span class="check">&#10003;</span> Delete account and logout</li>
                <li class="disabled"><span class="x">&#10007;</span> Clients, invoices, services</li>
                <li class="disabled"><span class="x">&#10007;</span> Full dashboard analytics</li>
            `;
        }
        if (homepageFeatureLists[1]) {
            homepageFeatureLists[1].innerHTML = `
                <li><span class="check">&#10003;</span> Everything in Individual</li>
                <li><span class="check">&#10003;</span> Full dashboard access</li>
                <li><span class="check">&#10003;</span> Clients, team, invoices, services</li>
                <li><span class="check">&#10003;</span> Advanced analytics</li>
                <li><span class="check">&#10003;</span> Priority support</li>
                <li class="disabled"><span class="x">&#10007;</span> Admin panel</li>
            `;
        }

        const pricingPageTitles = document.querySelectorAll('.price-grid .plan-name');
        if (pricingPageTitles[0]) pricingPageTitles[0].textContent = 'Individual';
        if (pricingPageTitles[1]) pricingPageTitles[1].textContent = 'Business';

        const pricingPageDescriptions = document.querySelectorAll('.price-grid .plan-desc');
        if (pricingPageDescriptions[0]) pricingPageDescriptions[0].textContent = 'Free access for projects, support info, and template editing';
        if (pricingPageDescriptions[1]) pricingPageDescriptions[1].textContent = 'Paid access to the full dashboard except admin panel';

        const pricingPageFeatureLists = document.querySelectorAll('.price-grid .feature-list');
        if (pricingPageFeatureLists[0]) {
            pricingPageFeatureLists[0].innerHTML = `
                <li><span class="chk">&#10003;</span> Projects section access</li>
                <li><span class="chk">&#10003;</span> Support info access</li>
                <li><span class="chk">&#10003;</span> Template editing</li>
                <li><span class="chk">&#10003;</span> Delete account and logout</li>
                <li><span class="crs">&#10007;</span> Clients, team, invoices</li>
                <li><span class="crs">&#10007;</span> Full dashboard analytics</li>
            `;
        }
        if (pricingPageFeatureLists[1]) {
            pricingPageFeatureLists[1].innerHTML = `
                <li><span class="chk">&#10003;</span> Everything in Individual</li>
                <li><span class="chk">&#10003;</span> Full dashboard access</li>
                <li><span class="chk">&#10003;</span> Clients, team, invoices, services</li>
                <li><span class="chk">&#10003;</span> Advanced analytics</li>
                <li><span class="chk">&#10003;</span> Priority support</li>
                <li><span class="crs">&#10007;</span> Admin panel</li>
            `;
        }

        const homepageButtons = document.querySelectorAll('.pricing-grid a.btn-outline, .pricing-grid a.btn-primary');
        if (homepageButtons[0]) homepageButtons[0].textContent = 'Continue Free';
        if (homepageButtons[1]) {
            homepageButtons[1].textContent = 'Choose Business';
            homepageButtons[1].setAttribute('data-plan-action', 'business');
            homepageButtons[1].setAttribute('href', 'pricing.html?checkout=business');
        }

        const pricingButtons = document.querySelectorAll('.price-grid .plan-cta');
        if (pricingButtons[0]) pricingButtons[0].textContent = 'Continue Free';
        if (pricingButtons[1]) {
            const pricingBusinessLink = pricingButtons[1].closest('a');
            if (pricingBusinessLink) {
                pricingBusinessLink.setAttribute('data-plan-action', 'business');
                pricingBusinessLink.setAttribute('href', 'pricing.html?checkout=business');
                pricingButtons[1].removeAttribute('data-plan-action');
            }
        }
    }
    
    // =========================================
    // Navbar Scroll Effect
    // =========================================
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
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
    const labelMonthly = document.getElementById('label-monthly');
    const labelAnnual  = document.getElementById('label-annual');
    const billingNote  = document.getElementById('billing-note');

    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            const isAnnual = this.checked;

            // Switch price number
            priceAmounts.forEach(amount => {
                amount.textContent = isAnnual ? amount.dataset.annual : amount.dataset.monthly;
            });

            // Switch period label /month to /year
            document.querySelectorAll('.period').forEach(el => {
                el.textContent = isAnnual ? '/year' : '/month';
            });

            // Highlight the active label
            if (labelMonthly && labelAnnual) {
                labelMonthly.classList.toggle('active-label', !isAnnual);
                labelAnnual.classList.toggle('active-label',  isAnnual);
            }

            // Update billing note
            if (billingNote) {
                if (isAnnual) {
                    billingNote.textContent = 'Billed annually - you save 20% compared to monthly';
                    billingNote.classList.add('annual');
                } else {
                    billingNote.textContent = 'Billed monthly - switch to annual and save 20%';
                    billingNote.classList.remove('annual');
                }
            }
        });
    }

    setupPricingSections();
    setupPlanCheckout();
    
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
    // Template Preview Redirect
    // =========================================
    const previewRouteMap = {
        'minimal portfolio': 'template-demo.html?template=minimal-portfolio',
        'agency pro': 'template-demo.html?template=agency-pro',
        'fashion store': 'template-demo.html?template=fashion-store',
        "writer's blog": 'template-demo.html?template=writers-blog',
        'photographer': 'template-demo.html?template=photographer',
        'startup landing': 'template-demo.html?template=startup-landing',
        'fine dining': 'template-demo.html?template=fine-dining',
        'electronics store': 'template-demo.html?template=electronics-store',
        'creative agency': 'template-demo.html?template=creative-agency',
        'designer portfolio': 'template-demo.html?template=designer-portfolio',
        'saas product': 'template-demo.html?template=saas-product',
        'cafe & bakery': 'template-demo.html?template=cafe-bakery',
        'cafe & bakery': 'template-demo.html?template=cafe-bakery',
        'tech blog': 'template-demo.html?template=tech-blog',
        'consulting firm': 'template-demo.html?template=consulting-firm',
        'wedding gallery': 'template-demo.html?template=wedding-gallery',
        'digital marketing': 'template-demo.html?template=digital-marketing',
        'jewelry & luxury': 'template-demo.html?template=jewelry-luxury',
        'app download': 'template-demo.html?template=app-download'
    };

    document.querySelectorAll('.btn-preview').forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.template-card, .tpl-card');
            if (!card) return;

            const titleEl = card.querySelector('.template-info h4, .tpl-info h4');
            const rawTitle = card.dataset.name || (titleEl ? titleEl.textContent : '');
            const normalizedTitle = rawTitle.trim().toLowerCase();
            const previewUrl = previewRouteMap[normalizedTitle];

            if (previewUrl) {
                window.location.href = previewUrl;
            }
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
    console.log('%cBuildFlow', 'font-size: 24px; font-weight: bold; color: #4f46e5;');
    console.log('%cBuild beautiful websites without code.', 'font-size: 14px; color: #6b7280;');
    console.log('%c----------------------------------------', 'color: #e5e7eb;');
    
});          

document.addEventListener("DOMContentLoaded", () => {
    emailjs.init(EMAILJS_CONFIG.publicKey);
});
