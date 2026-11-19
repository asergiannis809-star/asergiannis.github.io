const hamburger = document.querySelector('.hamburger');
const menu = document.querySelector('.toolbar-menu');

function setMenuOpen(open) {
  hamburger.classList.toggle('active', open);
  menu.classList.toggle('show', open);
  // Blurs the page and locks scrolling behind the mobile menu
  document.documentElement.classList.toggle('nav-open', open);
}

hamburger.addEventListener('click', function () {
  setMenuOpen(!menu.classList.contains('show'));
});

// Intro hints (scroll + language): once the visitor has scrolled past the
// intro, hide them for good. The language hint is fixed to the screen, so it
// also copies the intro's scroll fade while the intro is still in view.
const introHints = document.querySelectorAll('.scroll-hint, .lang-hint');
const langHint = document.querySelector('.lang-hint');
const introSection = document.getElementById('main-content');
if (introHints.length) {
  // Mirror the intro's opacity whenever the page's scroll code changes it
  const fadeObserver = (langHint && introSection)
    ? new MutationObserver(() => { langHint.style.opacity = introSection.style.opacity; })
    : null;
  if (fadeObserver) fadeObserver.observe(introSection, { attributes: true, attributeFilter: ['style'] });

  const dismissIntroHints = () => {
    if (window.scrollY < window.innerHeight) return;
    introHints.forEach(hint => hint.classList.add('is-dismissed'));
    if (fadeObserver) fadeObserver.disconnect();
    window.removeEventListener('scroll', dismissIntroHints);
  };
  window.addEventListener('scroll', dismissIntroHints, { passive: true });
}

// Close the menu once a link is chosen
menu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('DOMContentLoaded', function () {
  const languageOptions = document.querySelectorAll('.lang-option');

  function rebuildHeroName(lang) {
    const heroNameElement = document.querySelector('.hero-name');
    if (!heroNameElement) return;

    const source = heroNameElement.getAttribute(lang === 'el' ? 'data-greek' : 'data-english');
    if (!source) return;

    heroNameElement.innerHTML = buildHeroNameHTML(source);
  }

  function applyLanguageState(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-greek][data-english]').forEach(element => {
      if (element.classList.contains('hero-name')) {
        return;
      }

      const translated = element.getAttribute(lang === 'el' ? 'data-greek' : 'data-english');
      if (!translated) return;

      if (translated.includes('<br>')) {
        element.innerHTML = translated;
      } else {
        element.textContent = translated;
      }
    });

    rebuildHeroName(lang);

    // CV download follows the active language
    document.querySelectorAll('.cv-link').forEach(link => {
      const href = link.getAttribute(lang === 'el' ? 'data-href-el' : 'data-href-en');
      if (href) link.setAttribute('href', href);
    });

    document.dispatchEvent(new CustomEvent('app:languagechange', { detail: { lang } }));
  }

  // Language switch fade: translated text fades out, swaps, fades back in.
  // Uses element.animate so it doesn't override the elements' own CSS transitions.
  const LANG_FADE_MS = 200;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let langSwitchToken = 0;

  function fadeSwapLanguage(lang) {
    const targets = [...document.querySelectorAll('[data-greek][data-english]')];
    const token = ++langSwitchToken;
    const timing = { duration: LANG_FADE_MS, easing: 'ease' };

    // Single keyframe = animate from/to the element's own opacity, so hidden overlays stay hidden
    const fadeOuts = targets.map(el => el.animate([{ opacity: 0 }], { ...timing, fill: 'forwards' }));

    Promise.all(fadeOuts.map(a => a.finished)).then(() => {
      if (token === langSwitchToken) {
        applyLanguageState(lang);
        targets.forEach(el => el.animate([{ opacity: 0 }], { ...timing, direction: 'reverse' }));
      }
      // Drop the held opacity: 0 (the fade-in, or a newer fade-out, now sits on top)
      fadeOuts.forEach(a => a.cancel());
    }).catch(() => { });
  }

  // Split flag switch: each half is a button; the active half shows in full colour
  function setLanguage(lang, { animate = true } = {}) {
    languageOptions.forEach(option => {
      const isActive = option.dataset.lang === lang;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-pressed', String(isActive));
    });

    if (!animate || reduceMotion.matches || !Element.prototype.animate) {
      applyLanguageState(lang);
      return;
    }
    fadeSwapLanguage(lang);
  }

  languageOptions.forEach(option => {
    option.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (this.classList.contains('active')) return;
      setLanguage(this.dataset.lang);
    });
  });

  setLanguage('en', { animate: false });
});

// Close menu when clicking outside
document.addEventListener('click', function (e) {
  const isClickInsideMenu = menu.contains(e.target);
  const isClickOnHamburger = hamburger.contains(e.target);
  const isMenuOpen = menu.classList.contains('show');
  
  if (isMenuOpen && !isClickInsideMenu && !isClickOnHamburger) {
    setMenuOpen(false);
  }
});

// Splits the name into letters that fade in one after another and then float, grouped per
// word so a line can only break between words (never mid-word on narrow screens)
function buildHeroNameHTML(text) {
  let index = 0;
  const letter = char =>
    `<span class="hero-letter" style="--d: ${(0.2 + index++ * 0.06).toFixed(2)}s">${char}</span>`;

  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0) index++; // small pause where the space was
      return `<span class="hero-word">${[...word].map(letter).join('')}</span>`;
    })
    .join(' ');
}

const heroName = document.querySelector('.hero-name');
heroName.innerHTML = buildHeroNameHTML(heroName.innerText);

function getCurrentLanguage() {
  return document.documentElement.lang === 'el' ? 'el' : 'en';
}

const mainContent = document.getElementById('main-content');
const aboutMe = document.getElementById('about-me');
// Title element for the About description block
const aboutDescriptionTitle = document.querySelector('.description-title');

let ignoreScroll = false;

// Ensure both have the fade class
mainContent.classList.add('fade');
aboutMe.classList.add('fade');

function smoothScrollTo(target, duration = 800) {
  const start = window.scrollY;
  const end = typeof target === 'number'
    ? target
    : target.getBoundingClientRect().top + window.scrollY;
  const change = end - start;
  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutCubic(progress);
    window.scrollTo(0, start + change * ease);

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

// === Page sections: scroll fades, toolbar colour and in-page links ===
// Everything follows the order of the [data-section] elements in index.html,
// so sections can be reordered there without touching this code.
// [data-light] marks a light background: the toolbar switches to dark icons over it.
const pageSections = [...document.querySelectorAll('[data-section]')];

// Links that scroll to a section (nav menu, buttons, back-to-top)
const SECTION_LINKS = {
  '#hero': 'main-content',
  '#work': 'portfolio',
  '#about': 'about-me',
  '#contact': 'contact'
};

// Make one section the visible, clickable, top-most one
function setActiveSection(active) {
  pageSections.forEach(section => {
    const isActive = section === active;
    section.style.opacity = isActive ? '1' : '0';
    section.style.pointerEvents = isActive ? 'auto' : 'none';
    section.style.zIndex = isActive ? '4' : '1';
  });
}

// Cross-fade neighbouring sections as each one scrolls out of view
function updateSectionFades() {
  if (ignoreScroll || pageSections.length === 0) return;

  const fadeStart = window.innerHeight * 0.8;
  const fadeEnd = window.innerHeight * 0.2;
  // How far each section has scrolled away: 0 = still in view, 1 = gone
  const progress = pageSections.map(section => {
    const bottom = section.getBoundingClientRect().bottom;
    return Math.max(0, Math.min(1, (fadeStart - bottom) / (fadeStart - fadeEnd)));
  });

  // The active section is the furthest one whose predecessor is mostly gone
  let activeIndex = 0;
  for (let i = 1; i < pageSections.length; i++) {
    if (progress[i - 1] > 0.5) activeIndex = i;
  }

  const last = pageSections.length - 1;
  pageSections.forEach((section, i) => {
    const fadeIn = i === 0 ? 1 : progress[i - 1];  // first section starts visible
    const fadeOut = i === last ? 0 : progress[i];  // last section never fades out
    section.style.opacity = fadeIn * (1 - fadeOut);

    const isActive = i === activeIndex;
    section.style.pointerEvents = isActive ? 'auto' : 'none';
    section.style.zIndex = isActive ? '4' : '1';
  });
}

// Dark toolbar icons while a light section is under the toolbar
function updateToolbarColour() {
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) return;
  const toolbarEdge = 80; // roughly the toolbar's height
  const underToolbar = pageSections.find(section => {
    const rect = section.getBoundingClientRect();
    return rect.top <= toolbarEdge && rect.bottom > toolbarEdge;
  });
  let light = !!(underToolbar && underToolbar.hasAttribute('data-light'));
  // My work: the top of the section is covered by teal paint (.paint-drip), so
  // keep the white toolbar while the toolbar is still over that band
  const drip = light && underToolbar.querySelector('.paint-drip');
  if (drip) {
    const band = parseFloat(drip.style.getPropertyValue('--band')) || 260;
    if (toolbarEdge - underToolbar.getBoundingClientRect().top < band) light = false;
  }
  toolbar.classList.toggle('dark-mode', light);
}

// Scroll to a section, then settle the fades on it
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  ignoreScroll = true; // keep the scroll fades from fighting the animation
  smoothScrollTo(section, 900);
  setTimeout(() => {
    setActiveSection(section);
    updateToolbarColour();
    ignoreScroll = false;
  }, 950); // scroll duration + buffer
}

window.addEventListener('scroll', updateSectionFades);
window.addEventListener('scroll', updateToolbarColour);

document.querySelectorAll('a[href]').forEach(link => {
  const sectionId = SECTION_LINKS[link.getAttribute('href')];
  if (!sectionId) return;
  link.addEventListener('click', event => {
    event.preventDefault();
    // Buttons get a moment to show their splash effect before the page moves
    const delay = link.classList.contains('about-btn') ? 300 : 0;
    setTimeout(() => scrollToSection(sectionId), delay);
  });
});

document.addEventListener('DOMContentLoaded', function () {
  if (pageSections.length) setActiveSection(pageSections[0]);
  // Re-evaluate once layout settles (fixes a blank screen when refreshing mid-page)
  setTimeout(() => window.dispatchEvent(new Event('scroll')), 50);
});


// === ABOUT ME VERTICAL CAROUSEL ===
// 1. grab elements and set up state
const aboutMeCarousel = document.querySelector('.about-me .carousel');
const aboutMeCarouselRegion = document.querySelector('.about-me-carousel-region');
const aboutDescriptionP = document.querySelector('.about-description p'); // Get the description paragraph

if (aboutMeCarousel && aboutMeCarouselRegion && aboutDescriptionP) {
  let offset = 0;
  let animationFrame;
  let isMobile = window.innerWidth <= 600; // Check if mobile view
  let logoSwapTimeout = null; // controls staggered fade-out → fade-in for tool logos

  // 2. the core rendering function
  function updateCards() {
    const cards = Array.from(aboutMeCarousel.children);
    let centerCardIdentified = false; // Flag to ensure we only update once per state change

    cards.forEach((card, i) => {
      const pos = i - 2 + offset;
      const scale = Math.max(0.7, 1 - Math.abs(pos) * 0.2);
      const finalOpacity = Math.abs(pos) < 0.5 ? 1 : 0;

      card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease';

      // Horizontal layout universally
      card.style.transform = `translate(-50%, -50%) translateX(${pos * 140}px) scale(${scale})`;

      card.style.opacity = finalOpacity;
      card.style.zIndex = finalOpacity ? (10 - Math.abs(pos)) : 0;

      // Check if this is the settled, central card and update description, title, and tool logos
      if (finalOpacity === 1 && !centerCardIdentified) {
        // Trust the card's own data-title for the logical label so
        // icon, title, and description can never drift out of sync.
        const logicalKey = card.dataset.title || 'Web Design';

        // Keep the about copy in sync with the selected language.
        const englishDescriptions = {
          'Web Design': 'Focusing on responsive web design and development.',
          'Creative Ideas': 'Idea generation, brainstorming, and creative solutions.',
          'UI/UX Focus': 'UI/UX design, wireframing, and prototyping.',
          'Visual Arts': 'Visual design, branding, and illustration skills.',
          'Tech & Tools': 'Technical skills, problem-solving, and development tools.'
        };

        const greekDescriptions = {
          'Web Design': 'Εστιάζω στον responsive σχεδιασμό και την ανάπτυξη ιστοσελίδων.',
          'Creative Ideas': 'Παραγωγή ιδεών, brainstorming και δημιουργικές λύσεις.',
          'UI/UX Focus': 'Σχεδιασμός UI/UX, wireframing και prototyping.',
          'Visual Arts': 'Οπτικός σχεδιασμός, branding και δεξιότητες εικονογράφησης.',
          'Tech & Tools': 'Τεχνικές δεξιότητες, επίλυση προβλημάτων και εργαλεία ανάπτυξης.'
        };

        const isGreek = getCurrentLanguage() === 'el';
        const localizedTitle = isGreek ? (card.dataset.titleEl || logicalKey) : logicalKey;

        if (aboutDescriptionTitle) {
          aboutDescriptionTitle.innerText = localizedTitle;
        }

        const targetText = isGreek
          ? (greekDescriptions[logicalKey] || 'Σχεδιαστικές δεξιότητες και εμπειρία.')
          : (englishDescriptions[logicalKey] || 'Design-focused skills and experience.');
        if (aboutDescriptionP.innerText !== targetText) {
          aboutDescriptionP.style.opacity = 0;
          setTimeout(() => {
            aboutDescriptionP.innerText = targetText;
            aboutDescriptionP.style.opacity = 1;
          }, 150);
        } else {
          aboutDescriptionP.style.opacity = 1;
        }

        // Toggle tool logos based on the central card
        const toolsLogos = document.querySelector('.about-tools-logos');
        if (toolsLogos) {
          const logo1 = toolsLogos.querySelector('.tool-logo-1');
          const logo2 = toolsLogos.querySelector('.tool-logo-2');
          const logo3 = toolsLogos.querySelector('.tool-logo-3');
          const allLogos = toolsLogos.querySelectorAll('.tool-logo');

          // Clear any in-flight swap so we can start a fresh fade sequence
          if (logoSwapTimeout) {
            clearTimeout(logoSwapTimeout);
            logoSwapTimeout = null;
          }

          // Always remove active first so current icons fade OUT
          allLogos.forEach(logo => logo.classList.remove('active'));

          // Decide which pair should be shown based on the active card
          const pairByKey = {
            'UI/UX Focus': {
              src1: 'assets/Figma-logo.svg.webp',
              alt1: 'Figma',
              src2: 'assets/android_logo_PNG32.webp',
              alt2: 'Android / Android Studio'
            },
            'Visual Arts': {
              src1: 'assets/photoshop-logo-png.webp',
              alt1: 'Adobe Photoshop',
              src2: 'assets/png-transparent-adobe-illustrator-macos-bigsur-icon-thumbnail.webp',
              alt2: 'Adobe Illustrator'
            },
            'Tech & Tools': {
              src1: 'assets/Sql_data_base_with_logo.webp',
              alt1: 'SQL Database',
              src2: 'assets/Firebase-Logo.webp',
              alt2: 'Firebase'
            },
            'Creative Ideas': {
              src1: 'assets/blender-logo.webp',
              alt1: 'Blender',
              src2: 'assets/ptc-creo-elements-software.webp',
              alt2: 'Creo'
            },
            'Web Design': {
              src1: 'assets/js-logo.webp',
              alt1: 'JavaScript',
              src2: 'assets/HTML5_logo_and_wordmark.svg.webp',
              alt2: 'HTML5',
              src3: 'assets/css-logo.webp',
              alt3: 'CSS'
            }
          };

          const pair = pairByKey[logicalKey];

          if (pair && logo1 && logo2) {
            // Keep container visible while we fade out old icons
            toolsLogos.classList.add('visible');
            toolsLogos.setAttribute('aria-hidden', 'false');

            // After fade-out finishes (including the stagger on the right logo),
            // swap sources and fade the new pair IN
            logoSwapTimeout = setTimeout(() => {
              logo1.src = pair.src1;
              logo1.alt = pair.alt1;
              logo2.src = pair.src2;
              logo2.alt = pair.alt2;
              
              // Handle third logo if it exists
              if (logo3 && pair.src3 && pair.alt3) {
                logo3.style.display = 'block';
                logo3.src = pair.src3;
                logo3.alt = pair.alt3;
                logo3.classList.add('active');
              } else if (logo3) {
                logo3.style.display = 'none';
                logo3.classList.remove('active');
              }

              // Trigger staggered fade-in via .active
              logo1.classList.add('active');
              logo2.classList.add('active');
            }, 650); // 0.4s transition + 0.25s delay on right logo (with a small buffer)
          } else {
            toolsLogos.classList.remove('visible');
            toolsLogos.setAttribute('aria-hidden', 'true');
          }
        }

        centerCardIdentified = true; // Mark that we've updated for this cycle
      }
    });

    // Add transition to the description paragraph for the fade effect
    aboutDescriptionP.style.transition = 'opacity 0.15s ease-in-out';
  }

  // 3. wrap logic: when offset drifts past ±0.5, move cards in DOM
  function wrapCards() {
    while (offset > 0.5) {
      aboutMeCarousel.insertBefore(aboutMeCarousel.lastElementChild, aboutMeCarousel.firstElementChild);
      offset -= 1;
    }
    while (offset < -0.5) {
      aboutMeCarousel.appendChild(aboutMeCarousel.firstElementChild);
      offset += 1;
    }
  }

  // 4. snap to nearest card
  function snapToNearest() {
    if (animationFrame) cancelAnimationFrame(animationFrame);

    const target = Math.round(offset);
    if (Math.abs(offset - target) > 0.01) {
      offset += (target - offset) * 0.2; // Snapping ease
      wrapCards();
      updateCards();
      animationFrame = requestAnimationFrame(snapToNearest);
    }
  }

  // 5. arrow click handlers
  const leftArrow = aboutMeCarouselRegion.querySelector('.left');
  const rightArrow = aboutMeCarouselRegion.querySelector('.right');

  if (leftArrow) {
    leftArrow.addEventListener('click', () => {
      offset -= 1;
      wrapCards();
      updateCards();
      snapToNearest();
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener('click', () => {
      offset += 1;
      wrapCards();
      updateCards();
      snapToNearest();
    });
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 600;

    // Only update if the layout type changed
    if (wasMobile !== isMobile) {
      updateCards();
    }
  });

  // Initial render
  updateCards();

  document.addEventListener('app:languagechange', () => {
    requestAnimationFrame(() => updateCards());
  });
} else {
  console.warn("About Me carousel elements not found. Vertical carousel inactive.");
}

// === ABOUT ME TABS (WHO AM I | I WORK ON) ===
// Same fade as the MY WORK tabs: highlight the tab, fade the panel out, swap panes, fade in
const aboutTabs = document.querySelector('.about-tabs');
const aboutPanel = document.querySelector('.about-panel');

if (aboutTabs && aboutPanel) {
  const ABOUT_FADE_MS = 250; // keep in sync with .about-fading in styles.css
  let aboutFadeTimer = 0;

  aboutTabs.querySelectorAll('.portfolio-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) return;
      const pane = tab.dataset.pane;

      aboutTabs.querySelectorAll('.portfolio-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      aboutTabs.dataset.active = pane;

      clearTimeout(aboutFadeTimer);
      aboutPanel.classList.add('about-fading');
      aboutFadeTimer = setTimeout(() => {
        aboutPanel.querySelectorAll('.about-pane').forEach(el => {
          el.hidden = el.dataset.pane !== pane;
        });
        aboutPanel.classList.remove('about-fading');
        revealAboutPane(aboutPanel.querySelector(`.about-pane[data-pane="${pane}"]`));
      }, ABOUT_FADE_MS);
    });
  });

  // First-time drop-in: each pane's content fades in from above, one piece after
  // another, the first time it is shown (styles.css: .reveal-item / .is-revealed)
  aboutPanel.querySelectorAll('.about-pane').forEach(pane => {
    pane.querySelectorAll(':scope > :not(.about-description), :scope > .about-description > :not(.about-tools-logos)')
      .forEach((item, i) => {
        item.classList.add('reveal-item');
        item.style.setProperty('--i', i);
      });
  });

  function revealAboutPane(pane) {
    if (pane) pane.classList.add('is-revealed');
  }

  // The visible pane drops in the first time the About section comes into view
  const aboutSection = document.getElementById('about-me');
  if (aboutSection && 'IntersectionObserver' in window) {
    const aboutObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.intersectionRatio >= 0.3)) return;
      revealAboutPane(aboutPanel.querySelector('.about-pane:not([hidden])'));
      aboutObserver.disconnect();
    }, { threshold: [0, 0.3] });
    aboutObserver.observe(aboutSection);
  } else {
    aboutPanel.querySelectorAll('.about-pane').forEach(revealAboutPane);
  }
}

// === END OF ABOUT ME VERTICAL CAROUSEL ===

// === Portfolio Carousel Logic ===
document.addEventListener('DOMContentLoaded', () => {
  const carouselContainer = document.querySelector('.portfolio-carousel-container'); // Use container for events if needed
  const carousel = document.querySelector('.portfolio-carousel');
  // All cards; `slides` is only the group shown by the active tab (see showGroup)
  const allSlides = [...document.querySelectorAll('.portfolio-slide')];
  let slides = allSlides;
  const portfolioTabs = document.querySelector('.portfolio-section .portfolio-tabs');
  const prevBtn = document.querySelector('.portfolio-arrow.prev');
  const nextBtn = document.querySelector('.portfolio-arrow.next');
  const dotsContainer = document.querySelector('.portfolio-dots-container');

  if (!carousel || slides.length === 0 || !prevBtn || !nextBtn || !dotsContainer || !carouselContainer) {
    console.warn('Portfolio carousel elements not found. Carousel inactive.');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (dotsContainer) dotsContainer.style.display = 'none';
    return;
  }

  let currentSlideIndex = 0;
  let isDragging = false;
  let startPos = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let animationID = 0; // For requestAnimationFrame

  // On mobile, carousel should be vertical (swipe up/down). Desktop remains horizontal.
  let isVertical = window.innerWidth <= 768;

  // --- Create Dots (one per card in the active group) ---
  let dots = [];
  function buildDots() {
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.classList.add('portfolio-dot');
      dot.setAttribute('aria-label', `Go to project ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
    dots = dotsContainer.querySelectorAll('.portfolio-dot');
  }

  // --- Tabs: show one group of cards, hide the rest, restart at its first card ---
  function showGroup(group) {
    const groupSlides = allSlides.filter(slide => slide.dataset.group === group);
    if (groupSlides.length === 0) return;

    allSlides.forEach(slide => {
      slide.hidden = slide.dataset.group !== group;
      slide.classList.remove('active'); // updateUI only touches the visible group
    });
    slides = groupSlides;
    buildDots();

    if (portfolioTabs) {
      portfolioTabs.dataset.active = group;
      portfolioTabs.querySelectorAll('.portfolio-tab').forEach(tab => {
        const isActive = tab.dataset.group === group;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
    }

    // Jump to the first card without sliding across from the old position
    currentSlideIndex = 0;
    carousel.style.transition = 'none';
    goToSlide(0);
    void carousel.offsetWidth; // apply the jump before transitions come back on
    carousel.style.transition = 'transform 0.5s ease-in-out';
  }

  // Tab switch: fade the cards and dots out, swap the group while hidden, fade back in
  const fadeTargets = [document.querySelector('.portfolio-carousel-layout'), dotsContainer].filter(Boolean);
  const TAB_FADE_MS = 250; // keep in sync with .portfolio-fading in styles.css
  let tabFadeTimer = 0;

  if (portfolioTabs) {
    portfolioTabs.querySelectorAll('.portfolio-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        const group = tab.dataset.group;

        // Highlight the clicked tab right away; the cards follow after the fade-out
        portfolioTabs.querySelectorAll('.portfolio-tab').forEach(t => {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        portfolioTabs.dataset.active = group;

        clearTimeout(tabFadeTimer);
        fadeTargets.forEach(el => el.classList.add('portfolio-fading'));
        tabFadeTimer = setTimeout(() => {
          showGroup(group);
          fadeTargets.forEach(el => el.classList.remove('portfolio-fading'));
        }, TAB_FADE_MS);
      });
    });
  }

  // --- Go To Slide Function ---
  function goToSlide(index) {
    if (index < 0 || index >= slides.length || isDragging || slides.length === 0) return;
    cancelAnimationFrame(animationID);

    const firstSlide = slides[0];
    const slideStyle = getComputedStyle(firstSlide);

    // Calculate the total size of one slide including its margins (width for desktop, height for mobile)
    const slideOuterSize = isVertical
      ? firstSlide.offsetHeight + parseFloat(slideStyle.marginTop) + parseFloat(slideStyle.marginBottom)
      : firstSlide.offsetWidth + parseFloat(slideStyle.marginLeft) + parseFloat(slideStyle.marginRight);

    currentSlideIndex = index;

    // Translate the track to make the active slide centered in the container
    currentTranslate = -index * slideOuterSize;

    const containerSize = isVertical ? carouselContainer.offsetHeight : carouselContainer.offsetWidth;
    const initialOffset = (containerSize - slideOuterSize) / 2;
    currentTranslate += initialOffset;

    prevTranslate = currentTranslate;

    setSliderPosition();
    updateUI();
  }

  // --- Update UI (Dots/Arrows) --- 
  function updateUI() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlideIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlideIndex);
    });

    // Update mobile details panel (shown on narrow viewports)
    const mobileTitle = document.querySelector('.portfolio-mobile-title');
    const mobileDesc = document.querySelector('.portfolio-mobile-description');
    if (mobileTitle && mobileDesc) {
      const activeSlide = slides[currentSlideIndex];
      const titleEl = activeSlide.querySelector('.portfolio-item-title');
      const descEl = activeSlide.querySelector('.portfolio-item-description');
      mobileTitle.innerText = titleEl ? titleEl.innerText : '';
      mobileDesc.innerText = descEl ? descEl.innerText : '';
    }

    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;
  }

  // --- Set Slider Position --- 
  function setSliderPosition() {
    carousel.style.transform = isVertical
      ? `translateY(${currentTranslate}px)`
      : `translateX(${currentTranslate}px)`;
  }

  // --- Animation Loop (for smooth drag) --- 
  function animation() {
    setSliderPosition();
    if (isDragging) requestAnimationFrame(animation);
  }

  // --- Event Listeners --- 
  prevBtn.addEventListener('click', () => goToSlide(currentSlideIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentSlideIndex + 1));

  // --- Drag/Swipe Event Listeners --- 
  carousel.addEventListener('mousedown', dragStart);
  carousel.addEventListener('touchstart', dragStart, { passive: true }); // Use passive for performance

  carousel.addEventListener('mouseup', dragEnd);
  carousel.addEventListener('mouseleave', dragEnd); // End drag if mouse leaves carousel
  carousel.addEventListener('touchend', dragEnd);

  carousel.addEventListener('mousemove', dragAction);
  carousel.addEventListener('touchmove', dragAction, { passive: true });

  // Prevent default image drag behavior
  carousel.ondragstart = () => false;

  function dragStart(event) {
    isDragging = true;
    startPos = getPointerPosition(event);
    prevTranslate = currentTranslate; // Store position before drag starts
    carousel.style.transition = 'none'; // Disable transition during drag
    carousel.style.cursor = 'grabbing';
    animationID = requestAnimationFrame(animation); // Start animation loop
  }

  function dragAction(event) {
    if (!isDragging) return;
    const currentPosition = getPointerPosition(event);
    const move = currentPosition - startPos;
    currentTranslate = prevTranslate + move; // Calculate new position based on drag start
    // No need to call setSliderPosition here, animation loop handles it
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    cancelAnimationFrame(animationID);

    const movedBy = currentTranslate - prevTranslate;

    const slideSize = isVertical
      ? slides[0].offsetHeight + (parseFloat(getComputedStyle(slides[0]).marginTop) + parseFloat(getComputedStyle(slides[0]).marginBottom))
      : slides[0].offsetWidth + (parseFloat(getComputedStyle(slides[0]).marginLeft) + parseFloat(getComputedStyle(slides[0]).marginRight));

    const threshold = slideSize * 0.2;

    carousel.style.transition = 'transform 0.5s ease-in-out'; // Re-enable transition
    carousel.style.cursor = 'grab';

    // Determine slide change based on drag distance and direction
    if (movedBy < -threshold && currentSlideIndex < slides.length - 1) {
      goToSlide(currentSlideIndex + 1);
    } else if (movedBy > threshold && currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1);
    } else {
      // Snap back to the current slide if threshold not met
      goToSlide(currentSlideIndex);
    }
  }

  // Helper to get position for both mouse and touch events
  function getPointerPosition(event) {
    const isMouse = event.type.includes('mouse');
    if (isVertical) {
      return isMouse ? event.pageY : (event.touches ? event.touches[0].clientY : event.changedTouches[0].clientY);
    }
    return isMouse ? event.pageX : (event.touches ? event.touches[0].clientX : event.changedTouches[0].clientX);
  }

  // --- Window Resize Handler --- 
  window.addEventListener('resize', () => {
    const wasVertical = isVertical;
    isVertical = window.innerWidth <= 768;

    if (slides.length > 0) { // Add this check before accessing slides[0]
      // Only re-layout if orientation mode changes
      if (wasVertical !== isVertical) {
        goToSlide(currentSlideIndex);
      }
    }
  });

  // --- Initialize: start on the tab marked active in the HTML ---
  const initialTab = portfolioTabs && portfolioTabs.querySelector('.portfolio-tab.active');
  if (initialTab) {
    showGroup(initialTab.dataset.group);
  } else {
    buildDots();
    carousel.style.transition = 'none';
    goToSlide(0);
    setTimeout(() => { carousel.style.transition = 'transform 0.5s ease-in-out'; }, 50);
  }

  // Portfolio Image Hover Effect
  const portfolioImageContainers = document.querySelectorAll('.portfolio-image-container');
  portfolioImageContainers.forEach(container => {
    container.addEventListener('mouseenter', () => {
      container.classList.add('hover-active');
    });
    container.addEventListener('mouseleave', () => {
      container.classList.remove('hover-active');
    });
  });

  // Project Detail Modal Logic
  const projectDetailModal = document.getElementById('project-detail-modal');
  const closeModalBtn = projectDetailModal ? projectDetailModal.querySelector('.modal-close-btn') : null;
  const modalProjectTitle = projectDetailModal ? projectDetailModal.querySelector('#modal-project-title') : null;
  const modalProjectImage = projectDetailModal ? projectDetailModal.querySelector('#modal-project-image') : null;
  const seeMorePrompts = document.querySelectorAll('.see-more-prompt .see-more-text');

  // Make each slide tappable/clickable to open the modal
  if (projectDetailModal) {
    allSlides.forEach(slide => {
      slide.addEventListener('click', () => {
        openProjectModal(parseInt(slide.dataset.projectIndex, 10));
      });
    });

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeProjectModal);
    }

    // Close modal when clicking outside content wrapper
    projectDetailModal.addEventListener('click', (event) => {
      if (event.target === projectDetailModal) {
        closeProjectModal();
      }
    });
  }

  // --- Elements for Project Detail Modal Text Carousel ---
  const modalMainImage = projectDetailModal ? projectDetailModal.querySelector('#modal-project-image') : null;
  const modalImageSliderContainer = projectDetailModal ? projectDetailModal.querySelector('.modal-image-slider-container') : null;
  const textCarouselPageDisplay = projectDetailModal ? projectDetailModal.querySelector('.text-carousel-page-display') : null;
  const textCarouselTrack = projectDetailModal ? projectDetailModal.querySelector('.text-carousel-track') : null;
  const textCarouselPrevBtn = projectDetailModal ? projectDetailModal.querySelector('.text-carousel-arrow.prev') : null;
  const textCarouselNextBtn = projectDetailModal ? projectDetailModal.querySelector('.text-carousel-arrow.next') : null;
  const textCarouselDotsContainer = projectDetailModal ? projectDetailModal.querySelector('.text-carousel-dots-container') : null;

  let currentProjectData = null;
  let currentTextPageIndex = 0;

  // Variables for modal image slider
  let modalImageSliderInterval = null;
  let currentModalImageIndex = 0;

  // --- Variables for Text Carousel Dragging ---
  let isTextDragging = false;
  let textDragStartPosX = 0;
  let textDragStartPosY = 0;
  let isTextDragAllowed = null; // null = undecided, true = horizontal swipe, false = vertical scroll
  let textDragCurrentTranslateX = 0;
  let textDragAnimationID = 0;

  function syncPortfolioLanguageState() {
    updateUI();

    if (!currentProjectData) return;

    if (currentProjectData.caseStudy && caseEls) {
      renderCaseStudy();
      return;
    }

    if (modalProjectTitle) {
      modalProjectTitle.textContent = getCurrentLanguage() === 'el'
        ? (currentProjectData.modalHeaderEl || currentProjectData.modalHeader || 'Project Details')
        : (currentProjectData.modalHeader || 'Project Details');
    }

    generateTextCarouselPagesAndDots();
    goToTextPage(currentTextPageIndex, false);
    fitModalText();
  }

  // --- Placeholder Project Data (ensure this matches your intended structure) ---
  const portfolioProjectsData = [
    {
      title: "Project Alpha", shortDescription: "Brief for card Alpha.", mainImage: "assets/img/Web_Design_1.webp",
      modalHeader: "Web Design",
      modalHeaderEl: "Σχεδιασμός Ιστοσελίδων",
      imageContainerClass: "web-screenshot-frame",
      modalSliderImages: [
        "assets/img/Web_Design_1.webp",
        "assets/img/Web_Design_2.webp",
        "assets/img/Web_Design_3.webp",
        "assets/img/Web_Design_4.webp"
      ],
      detailedContentPages: [
        "<h3>I developed a university assignment website focused on clear structure, usability, and functional design.</h3>",
        "<h3>My core skill set includes HTML, CSS, and JavaScript for building responsive and engaging web interfaces.</h3>",
        "<h3>I also use SQL and database systems to manage data efficiently and support more dynamic web solutions.</h3>"
      ],
      detailedContentPagesEl: [
        "<h3>Ανέπτυξα μια ιστοσελίδα πανεπιστημιακής εργασίας με έμφαση στην καθαρή δομή, τη χρηστικότητα και τον λειτουργικό σχεδιασμό.</h3>",
        "<h3>Το βασικό μου σύνολο δεξιοτήτων περιλαμβάνει HTML, CSS και JavaScript για responsive και ελκυστικά web interfaces.</h3>",
        "<h3>Χρησιμοποιώ επίσης SQL και συστήματα βάσεων δεδομένων για αποδοτική διαχείριση δεδομένων και πιο δυναμικές web λύσεις.</h3>"
      ]
    },
    {
      title: "Project Beta", shortDescription: "Brief for card Beta.", mainImage: "assets/img/App_Design_2.webp",
      modalHeader: "App Design",
      modalHeaderEl: "Σχεδιασμός Εφαρμογών",
      imageClass: "app-screenshot",
      modalSliderImages: [
        "assets/img/CarInCommon-2.webp",
        "assets/img/CarInCommon-1.webp",
        "assets/img/App-Design_1.webp",
        "assets/img/App_Design_2.webp"
      ],
      detailedContentPages: [
        "<h3>I have designed and developed university app projects, including a parking app, a friend finder app, and a shared car platform that helps groups manage vehicle usage, maintenance needs, and related services.</h3>",
        "<h3>I specialize in Android Studio, using Java and XML to create functional, well-structured, and user-friendly mobile applications.</h3>",
        "<h3>I also work with Firebase database and storage solutions to support real-time data handling, user information, and app content management.</h3>"
      ],
      detailedContentPagesEl: [
        "<h3>Έχω σχεδιάσει και αναπτύξει πανεπιστημιακά app projects, όπως εφαρμογή στάθμευσης, εφαρμογή εύρεσης φίλων και κοινόχρηστη πλατφόρμα αυτοκινήτου που βοηθά ομάδες να διαχειρίζονται χρήση οχήματος, ανάγκες συντήρησης και σχετικές υπηρεσίες.</h3>",
        "<h3>Εξειδικεύομαι στο Android Studio, χρησιμοποιώντας Java και XML για λειτουργικές, σωστά δομημένες και φιλικές προς τον χρήστη mobile εφαρμογές.</h3>",
        "<h3>Εργάζομαι επίσης με Firebase database και storage λύσεις για real-time διαχείριση δεδομένων, πληροφοριών χρηστών και περιεχομένου εφαρμογών.</h3>"
      ]
    },
    {
      title: "Project Gamma", shortDescription: "Brief for card Gamma.", mainImage: "assets/img/MOCKUP1.webp",
      modalHeader: "Graphic Design",
      modalHeaderEl: "Γραφιστικός Σχεδιασμός",
      modalSliderImages: [
        "assets/img/MOCKUP1.webp",
        "assets/img/MOCKUP2-b.webp",
        "assets/img/products.webp"
      ],
      detailedContentPages: [
        "<h3>I create visual work that transforms ideas into branding and design solutions that support both identity and business presence.</h3>",
        "<h3>My experience includes university assignments in poster design, product design concepts, and sketch development, which reflects my ability to draw, explore, and communicate ideas effectively.</h3>",
        "<h3>I work with Photoshop and Illustrator to produce visually strong, concept-based designs across digital and print-oriented projects.</h3>",
      ],
      detailedContentPagesEl: [
        "<h3>Δημιουργώ οπτική δουλειά που μετατρέπει ιδέες σε branding και σχεδιαστικές λύσεις που ενισχύουν τόσο την ταυτότητα όσο και την επιχειρηματική παρουσία.</h3>",
        "<h3>Η εμπειρία μου περιλαμβάνει πανεπιστημιακές εργασίες σε poster design, product design concepts και ανάπτυξη σκίτσων, κάτι που αντικατοπτρίζει την ικανότητά μου να σχεδιάζω, να εξερευνώ και να επικοινωνώ ιδέες αποτελεσματικά.</h3>",
        "<h3>Χρησιμοποιώ Photoshop και Illustrator για να παράγω οπτικά δυναμικά, concept-based σχέδια για digital και print-oriented projects.</h3>",
      ]
    },
    {
      title: "Project Delta", shortDescription: "Brief for card Delta.", mainImage: "assets/img/Emorph-1.webp",
      modalHeader: "Product Design",
      modalHeaderEl: "Σχεδιασμός Προϊόντων",
      imageContainerClass: "web-screenshot-frame",
      modalSliderImages: [
        "assets/img/Emorph-1.webp",
        "assets/img/Emorph-2.webp",
        "assets/img/Emorph-3.webp",
        "assets/img/emorph.webp"
      ],
      detailedContentPages: [
        "<h3>I have worked on a range of projects that combined mechanical thinking with the design thinking process to bring products from early ideas to developed concepts.</h3>",
        "<h3>I have also taken part in design competitions, including a shoe design challenge where my team placed third in Greece.</h3>",
        "<h3>I use CAD and 3D design tools such as Blender and Creo Parametric to support product development, digital modeling, and visual exploration.</h3>"
      ],
      detailedContentPagesEl: [
        "<h3>Έχω εργαστεί σε μια σειρά από projects που συνδύαζαν μηχανική σκέψη με τη διαδικασία design thinking για να μετατρέψουν προϊόντα από αρχικές ιδέες σε αναπτυγμένες προτάσεις.</h3>",
        "<h3>Έχω επίσης λάβει μέρος σε διαγωνισμούς design, συμπεριλαμβανομένου ενός shoe design challenge όπου η ομάδα μου κατέκτησε την τρίτη θέση στην Ελλάδα.</h3>",
        "<h3>Χρησιμοποιώ CAD και 3D design εργαλεία όπως Blender και Creo Parametric για product development, digital modeling και οπτική διερεύνηση.</h3>"
      ]
    },
    // --- NOTEWORTHY (placeholders; indexes 4 and 5 match data-project-index in index.html) ---
    {
      title: "Diploma Thesis", mainImage: "assets/img/thesis-1.webp",
      modalHeader: "Diploma Thesis",
      modalHeaderEl: "Διπλωματική",
      modalSliderImages: [
        "assets/img/thesis-1.webp",
        "assets/img/thesis-2.webp",
        "assets/img/thesis-3.webp",
        "assets/img/thesis-4.webp"
      ],
      detailedContentPages: [
        "<h3>For my diploma thesis at DPSD, University of the Aegean, I designed a wearable bracelet and companion mobile app that detect the onset of a panic attack.</h3>",
        "<h3>When an episode is detected, the bracelet delivers a discreet haptic intervention to help the user regain control in the moment.</h3>",
        "<h3>The project followed a human-centred design process, from user research and concept development to prototyping the device and the app experience.</h3>"
      ],
      detailedContentPagesEl: [
        "<h3>Στη διπλωματική μου εργασία στο ΤΜΣΠΣ του Πανεπιστημίου Αιγαίου σχεδίασα ένα φορετό βραχιόλι και μια συνοδευτική εφαρμογή κινητού που ανιχνεύουν την έναρξη μιας κρίσης πανικού.</h3>",
        "<h3>Όταν εντοπιστεί επεισόδιο, το βραχιόλι παρέχει μια διακριτική απτική (haptic) παρέμβαση που βοηθά τον χρήστη να ανακτήσει τον έλεγχο τη στιγμή που το χρειάζεται.</h3>",
        "<h3>Η εργασία ακολούθησε ανθρωποκεντρική σχεδιαστική διαδικασία, από την έρευνα χρηστών και την ανάπτυξη της ιδέας έως την πρωτοτυποποίηση της συσκευής και της εφαρμογής.</h3>"
      ],
      // Rendered by renderCaseStudy(); every text is { en, el }
      caseStudy: {
        title: { en: "Diploma Thesis", el: "Διπλωματική" },
        subtitle: { en: "EUFORIA · Panic-detection bracelet & companion app", el: "EUFORIA · Βραχιόλι ανίχνευσης πανικού & εφαρμογή" },
        year: "2025–26",
        meta: { en: "DPSD, University of the Aegean · Supervisor: Modestos Stavrakis", el: "ΤΜΣΠΣ, Πανεπιστήμιο Αιγαίου · Επιβλέπων: Μόδεστος Σταυράκης" },
        images: [
          { src: "assets/img/thesis-1.webp", caption: { en: "Final prototype: bracelet + companion app", el: "Τελικό πρωτότυπο: βραχιόλι + εφαρμογή" } },
          { src: "assets/img/thesis-2.webp", caption: { en: "3D-printed TPU body with the status LED", el: "3D-εκτυπωμένο σώμα από TPU με LED κατάστασης" } },
          { src: "assets/img/thesis-3.webp", caption: { en: "Four colourways", el: "Τέσσερις χρωματικές εκδοχές" } },
          { src: "assets/img/thesis-4.webp", fit: "contain", caption: { en: "Companion app: home screen", el: "Η εφαρμογή: αρχική οθόνη" } }
        ],
        pages: [
          {
            name: { en: "Overview", el: "Επισκόπηση" },
            blocks: [
              { type: "lead", text: { en: "A wristband and Android app that pick up the early signs of a panic attack and respond with a discreet haptic cue, helping the user regain control in the moment, without anyone else noticing.", el: "Ένα βραχιόλι και μια εφαρμογή Android που εντοπίζουν τα πρώτα σημάδια μιας κρίσης πανικού και απαντούν με διακριτικό απτικό σήμα, ώστε ο χρήστης να ανακτήσει τον έλεγχο χωρίς να το καταλάβουν οι γύρω του." } },
              { type: "stats", label: { en: "Problem space", el: "Το πρόβλημα" }, items: [
                { value: "~10'", text: { en: "for symptoms to peak, so help has to come early", el: "μέχρι την κορύφωση· η βοήθεια πρέπει να έρθει νωρίς" } },
                { value: "66.7%", text: { en: "of respondents had a sudden episode of intense fear", el: "έχουν βιώσει αιφνίδιο επεισόδιο έντονου φόβου" } },
                { value: "5.17", text: { en: "average daily stress, out of 10", el: "μέσο καθημερινό στρες, στα 10" } },
                { value: "n=69", text: { en: "survey responses, plus interviews guided by a psychiatrist", el: "απαντήσεις ερωτηματολογίου και συνεντεύξεις με καθοδήγηση ψυχιάτρου" } }
              ] },
              { type: "pairs", label: { en: "Insights → decisions", el: "Ευρήματα → αποφάσεις" }, items: [
                { from: { en: "Can't focus at the peak", el: "Αδυναμία συγκέντρωσης στην κορύφωση" }, to: { en: "breathing rhythm through vibration, no reading", el: "ρυθμός αναπνοής με δόνηση, χωρίς διάβασμα" } },
                { from: { en: "Discretion matters", el: "Η διακριτικότητα μετράει" }, to: { en: "looks like jewellery, silent haptics", el: "μοιάζει με κόσμημα, σιωπηλή δόνηση" } },
                { from: { en: "Users want control", el: "Ανάγκη για έλεγχο" }, to: { en: "nothing happens without consent", el: "τίποτα χωρίς συγκατάθεση" } }
              ] }
            ]
          },
          {
            name: { en: "Research", el: "Έρευνα" },
            blocks: [
              { type: "lead", text: { en: "The process followed human-centred design (ISO 9241-210): a literature review of panic, biosignals and existing products, a 54-question survey, and interviews with people who experience panic attacks.", el: "Η διαδικασία ακολούθησε τον ανθρωποκεντρικό σχεδιασμό (ISO 9241-210): βιβλιογραφική έρευνα για τον πανικό, τα βιοσήματα και τις υπάρχουσες λύσεις, ερωτηματολόγιο 54 ερωτήσεων και συνεντεύξεις με άτομα που βιώνουν κρίσεις πανικού." } },
              { type: "chips", label: { en: "Seven user needs", el: "Επτά ανάγκες χρηστών" }, items: [
                { en: "Immediate guidance", el: "Άμεση καθοδήγηση" },
                { en: "Early warning", el: "Έγκαιρη προειδοποίηση" },
                { en: "Discretion", el: "Διακριτικότητα" },
                { en: "Comfort", el: "Άνεση" },
                { en: "Privacy", el: "Ιδιωτικότητα" },
                { en: "Personalisation", el: "Εξατομίκευση" },
                { en: "Context awareness", el: "Επίγνωση πλαισίου" }
              ] }
            ]
          },
          {
            name: { en: "Hardware", el: "Υλικό" },
            blocks: [
              { type: "specs", label: { en: "The bracelet", el: "Το βραχιόλι" }, items: [
                { part: "ESP32-S3", text: { en: "Microcontroller with Bluetooth LE", el: "Μικροελεγκτής με Bluetooth LE" } },
                { part: "MAX30102", text: { en: "Heart rate (PPG)", el: "Καρδιακός ρυθμός (PPG)" } },
                { part: "EDA / GSR", text: { en: "Skin response and sweat", el: "Ηλεκτροδερμική δραστηριότητα, εφίδρωση" } },
                { part: "MPU6050", text: { en: "Motion and tremor", el: "Κίνηση και τρέμουλο" } },
                { part: { en: "Motor + RGB LED", el: "Μοτέρ + RGB LED" }, text: { en: "Haptic cue and status light", el: "Απτικό σήμα και φωτεινή ένδειξη" } },
                { part: "450 mAh · USB-C", text: { en: "LiPo battery and charging", el: "Μπαταρία LiPo και φόρτιση" } },
                { part: "TPU + PETG", text: { en: "3D-printed soft band, rigid sensor shell", el: "3D-εκτυπωμένο μαλακό σώμα, άκαμπτο κέλυφος αισθητήρων" } }
              ] }
            ]
          },
          {
            name: { en: "App", el: "Εφαρμογή" },
            blocks: [
              { type: "lead", text: { en: "An Android app, designed in Figma and built in Android Studio with Firebase, that talks to the bracelet over Bluetooth LE.", el: "Μια εφαρμογή Android, σχεδιασμένη στο Figma και υλοποιημένη στο Android Studio με Firebase, που επικοινωνεί με το βραχιόλι μέσω Bluetooth LE." } },
              { type: "flow", label: { en: "Panic flow in the app", el: "Ροή παρέμβασης στην εφαρμογή" }, items: [
                { en: "Awareness", el: "Επίγνωση" },
                { en: "Choose a tool", el: "Επιλογή εργαλείου" },
                { en: "Breathe 4″ in / 6″ out · CBT · 5-4-3-2-1 grounding", el: "Αναπνοή 4″ / 6″ · CBT · γείωση 5-4-3-2-1" },
                { en: "Summary", el: "Σύνοψη" }
              ] },
              { type: "chips", label: { en: "Also in the app", el: "Επίσης στην εφαρμογή" }, items: [
                { en: "7-step onboarding with the PDSS questionnaire", el: "Εγγραφή 7 βημάτων με το ερωτηματολόγιο PDSS" },
                { en: "Daily journal", el: "Ημερολόγιο" },
                { en: "Therapist mode with PIN and consent", el: "Λειτουργία θεραπευτή με PIN και συναίνεση" }
              ] },
              { type: "chips", muted: true, label: { en: "Built with", el: "Εργαλεία" }, items: ["Figma", "Android Studio", "Firebase", "Arduino IDE", "BLE"] }
            ]
          },
          {
            name: { en: "Evaluation", el: "Αξιολόγηση" },
            blocks: [
              { type: "lead", text: { en: "A formative test with 4 users: 35–45 minute think-aloud sessions with the app and the bracelet. The core idea was understood and well received, and the sessions produced specific fixes.", el: "Διαμορφωτική δοκιμή με 4 χρήστες: συνεδρίες 35–45 λεπτών με σκέψη φωναχτά, στην εφαρμογή και στο βραχιόλι. Η βασική ιδέα έγινε κατανοητή και αντιμετωπίστηκε θετικά, και προέκυψαν συγκεκριμένες διορθώσεις." } },
              { type: "pairs", label: { en: "Findings → fixes", el: "Ευρήματα → διορθώσεις" }, items: [
                { from: { en: "Panic button felt like an emergency", el: "Το κουμπί πανικού έμοιαζε με έκτακτη ανάγκη" }, to: { en: "clearer name, softer colour", el: "σαφέστερη ονομασία, ηπιότερο χρώμα" } },
                { from: { en: "“CBT” and “grounding” read as jargon", el: "Οι όροι CBT και grounding ήταν ορολογία" }, to: { en: "plain wording", el: "απλή διατύπωση" } },
                { from: { en: "Motion sensor flagged tremor at rest", el: "Ο αισθητήρας κίνησης έβλεπε τρόμο σε ακινησία" }, to: { en: "calibrate; combine HR, EDA & motion", el: "βαθμονόμηση· συνδυασμός HR, EDA και κίνησης" } },
                { from: { en: "One user disliked the vibration", el: "Σε έναν χρήστη δεν άρεσε η δόνηση" }, to: { en: "adjustable strength and rhythm, or off", el: "ρυθμιζόμενη ένταση και ρυθμός, ή απενεργοποίηση" } }
              ] },
              { type: "chips", label: { en: "Next steps", el: "Επόμενα βήματα" }, items: [
                { en: "More data", el: "Περισσότερα δεδομένα" },
                { en: "ML detection & sensor fusion", el: "Ανίχνευση με μηχανική μάθηση" },
                { en: "Personalisation", el: "Εξατομίκευση" },
                { en: "Long-term real-world testing", el: "Μακροχρόνια δοκιμή σε πραγματικές συνθήκες" }
              ] },
              { type: "note", text: { en: "A design prototype, not a clinically validated system.", el: "Σχεδιαστικό πρωτότυπο, όχι κλινικά επικυρωμένο σύστημα." } }
            ]
          }
        ]
      }
    },
    {
      title: "Internship", mainImage: "assets/img/internship-1.webp",
      modalHeader: "Internship",
      modalHeaderEl: "Πρακτική",
      modalSliderImages: [
        "assets/img/internship-1.webp",
        "assets/img/internship-2.webp",
        "assets/img/internship-3.webp",
        "assets/img/internship-4.webp"
      ],
      detailedContentPages: [
        "<h3>During my internship at ATRIDE, I designed and developed an Android app for ANASA®, the company’s smart breathing shirt that continuously monitors respiratory activity.</h3>",
        "<h3>I followed a standard design process, from defining requirements and user flows to building the interface in Android Studio.</h3>",
        "<h3>The app retrieves and works with the respiratory data recorded by the shirts, which is stored in CSV files.</h3>"
      ],
      detailedContentPagesEl: [
        "<h3>Κατά την πρακτική μου άσκηση στην ATRIDE, σχεδίασα και ανέπτυξα μια εφαρμογή Android για το ANASA®, το έξυπνο μπλουζάκι αναπνοής της εταιρείας που παρακολουθεί συνεχώς τη δραστηριότητα της αναπνοής.</h3>",
        "<h3>Ακολούθησα την καθιερωμένη σχεδιαστική διαδικασία, από τον καθορισμό απαιτήσεων και ροών χρήστη έως την υλοποίηση της διεπαφής στο Android Studio.</h3>",
        "<h3>Η εφαρμογή ανακτά και αξιοποιεί τα δεδομένα αναπνοής που καταγράφουν τα μπλουζάκια, τα οποία αποθηκεύονται σε αρχεία CSV.</h3>"
      ]
    }
  ];

  // --- Case-study layout (projects with `caseStudy` data, e.g. the diploma thesis) ---
  const modalContentWrapper = projectDetailModal ? projectDetailModal.querySelector('.modal-content-wrapper') : null;
  const modalLeftPanel = projectDetailModal ? projectDetailModal.querySelector('.modal-left-panel') : null;
  const caseStudyEl = projectDetailModal ? projectDetailModal.querySelector('.case-study') : null;
  const caseEls = caseStudyEl ? {
    image: caseStudyEl.querySelector('.case-image'),
    caption: caseStudyEl.querySelector('.case-caption'),
    thumbs: caseStudyEl.querySelector('.case-thumbs'),
    title: caseStudyEl.querySelector('.case-title'),
    subtitle: caseStudyEl.querySelector('.case-subtitle'),
    meta: caseStudyEl.querySelector('.case-meta'),
    body: caseStudyEl.querySelector('.case-body'),
    pageCount: caseStudyEl.querySelector('.case-page-count'),
    prev: caseStudyEl.querySelector('.case-page-btn.prev'),
    next: caseStudyEl.querySelector('.case-page-btn.next')
  } : null;
  let currentCasePage = 0;
  let currentCaseImage = 0;

  // Pick the right language from a { en, el } pair (plain strings pass through)
  function tr(value) {
    if (!value || typeof value !== 'object') return value || '';
    return getCurrentLanguage() === 'el' ? (value.el || value.en) : value.en;
  }

  function caseSection(label, inner) {
    return `<section class="case-section"><h4 class="case-label">${tr(label)}</h4>${inner}</section>`;
  }

  const caseBlockRenderers = {
    lead: b => `<p class="case-lead">${tr(b.text)}</p>`,
    note: b => `<p class="case-note">${tr(b.text)}</p>`,
    stats: b => caseSection(b.label, `<div class="case-stats">${b.items.map(i =>
      `<div class="case-stat"><span class="case-stat-value">${i.value}</span><span class="case-stat-text">${tr(i.text)}</span></div>`).join('')}</div>`),
    pairs: b => caseSection(b.label, `<div class="case-pairs${b.items.length === 4 ? ' is-grid' : ''}">${b.items.map(i =>
      `<div class="case-pair"><strong>${tr(i.from)}</strong> <span class="case-arrow" aria-hidden="true">→</span> ${tr(i.to)}</div>`).join('')}</div>`),
    chips: b => caseSection(b.label, `<ul class="case-chips${b.muted ? ' is-muted' : ''}">${b.items.map(i =>
      `<li>${tr(i)}</li>`).join('')}</ul>`),
    personas: b => caseSection(b.label, `<div class="case-personas">${b.items.map(i =>
      `<div class="case-persona"><strong>${tr(i.name)}</strong><span>${tr(i.role)}</span><p>${tr(i.text)}</p></div>`).join('')}</div>`),
    specs: b => caseSection(b.label, `<dl class="case-specs">${b.items.map(i =>
      `<div><dt>${tr(i.part)}</dt><dd>${tr(i.text)}</dd></div>`).join('')}</dl>`),
    flow: b => caseSection(b.label, `<ol class="case-flow">${b.items.map(i =>
      `<li>${tr(i)}</li>`).join('')}</ol>`)
  };

  function setCaseImage(index) {
    const images = currentProjectData.caseStudy.images;
    currentCaseImage = index;
    const img = images[index];
    caseEls.image.src = img.src;
    caseEls.image.alt = tr(img.caption);
    caseEls.image.classList.toggle('is-contain', img.fit === 'contain');
    caseEls.caption.textContent = tr(img.caption);
    caseEls.thumbs.querySelectorAll('.case-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
      thumb.setAttribute('aria-pressed', String(i === index));
    });
  }

  function goToCasePage(index) {
    const pages = currentProjectData.caseStudy.pages;
    currentCasePage = Math.max(0, Math.min(index, pages.length - 1));
    const page = pages[currentCasePage];
    caseEls.body.innerHTML = page.blocks.map(b => caseBlockRenderers[b.type](b)).join('');
    caseEls.body.scrollTop = 0;
    caseEls.pageCount.textContent = `${currentCasePage + 1} / ${pages.length}`;
    // Name the neighbouring pages so the arrows say where they lead
    const prevPage = pages[currentCasePage - 1];
    const nextPage = pages[currentCasePage + 1];
    caseEls.prev.title = prevPage ? tr(prevPage.name) : '';
    caseEls.next.title = nextPage ? tr(nextPage.name) : '';
    caseEls.pageCount.title = tr(page.name);
    caseEls.prev.disabled = currentCasePage === 0;
    caseEls.next.disabled = currentCasePage === pages.length - 1;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && caseEls.body.animate) {
      caseEls.body.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    }
  }

  function renderCaseStudy() {
    const cs = currentProjectData.caseStudy;
    caseEls.title.textContent = tr(cs.title);
    caseEls.subtitle.innerHTML = `${tr(cs.subtitle)} · <span class="case-year">${cs.year}</span>`;
    caseEls.meta.textContent = tr(cs.meta);

    caseEls.thumbs.innerHTML = '';
    cs.images.forEach((img, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'case-thumb';
      thumb.setAttribute('aria-label', tr(img.caption));
      thumb.innerHTML = `<img src="${img.src}" alt="">`;
      thumb.addEventListener('click', () => setCaseImage(i));
      caseEls.thumbs.appendChild(thumb);
    });

    setCaseImage(currentCaseImage);
    goToCasePage(currentCasePage);
  }

  function setCaseMode(on) {
    if (!caseStudyEl) return;
    caseStudyEl.hidden = !on;
    if (modalLeftPanel) modalLeftPanel.hidden = on;
    if (modalContentWrapper) modalContentWrapper.classList.toggle('is-case-study', on);
  }

  if (caseEls) {
    caseEls.prev.addEventListener('click', () => goToCasePage(currentCasePage - 1));
    caseEls.next.addEventListener('click', () => goToCasePage(currentCasePage + 1));
  }

  // Escape closes the modal; arrow keys page through a case study
  document.addEventListener('keydown', event => {
    if (!currentProjectData || !projectDetailModal.classList.contains('show')) return;
    if (event.key === 'Escape') {
      closeProjectModal();
      return;
    }
    if (currentProjectData.caseStudy && caseEls) {
      if (event.key === 'ArrowRight') goToCasePage(currentCasePage + 1);
      if (event.key === 'ArrowLeft') goToCasePage(currentCasePage - 1);
    }
  });

  function goToTextPage(pageIndex, animate = true) {
    if (!currentProjectData || !textCarouselTrack || !textCarouselPageDisplay) return;
    const pageContent = getCurrentLanguage() === 'el' && currentProjectData.detailedContentPagesEl
      ? currentProjectData.detailedContentPagesEl
      : currentProjectData.detailedContentPages;
    const pageCount = pageContent.length;
    if (pageIndex < 0) pageIndex = 0;
    if (pageIndex >= pageCount) pageIndex = pageCount - 1;

    const viewportWidth = Math.max(textCarouselPageDisplay.offsetWidth, textCarouselPageDisplay.getBoundingClientRect().width, 1);
    currentTextPageIndex = pageIndex;
    textDragCurrentTranslateX = -currentTextPageIndex * viewportWidth;

    if (animate) {
      textCarouselTrack.style.transition = 'transform 0.4s ease-in-out';
    } else {
      textCarouselTrack.style.transition = 'none';
    }
    textCarouselTrack.style.transform = `translateX(${textDragCurrentTranslateX}px)`;

    const dots = textCarouselDotsContainer.querySelectorAll('.text-carousel-dot');
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentTextPageIndex));

    if (textCarouselPrevBtn) textCarouselPrevBtn.disabled = currentTextPageIndex === 0;
    if (textCarouselNextBtn) textCarouselNextBtn.disabled = currentTextPageIndex >= pageCount - 1;
  }

  function generateTextCarouselPagesAndDots() {
    if (!currentProjectData || !textCarouselTrack || !textCarouselDotsContainer) return;
    const pageContent = getCurrentLanguage() === 'el' && currentProjectData.detailedContentPagesEl
      ? currentProjectData.detailedContentPagesEl
      : currentProjectData.detailedContentPages;

    // Reset the track position so old translates don't push new pages offscreen
    textDragCurrentTranslateX = 0;
    currentTextPageIndex = 0;
    textCarouselTrack.style.transition = 'none';
    textCarouselTrack.style.transform = 'translateX(0)';

    textCarouselTrack.innerHTML = '';
    textCarouselDotsContainer.innerHTML = '';
    if (textCarouselPageDisplay) textCarouselPageDisplay.scrollTop = 0;
    pageContent.forEach((pageHTML, index) => {
      const pageElement = document.createElement('div');
      pageElement.classList.add('text-carousel-page');
      pageElement.innerHTML = pageHTML;
      textCarouselTrack.appendChild(pageElement);
      const dot = document.createElement('button');
      dot.classList.add('text-carousel-dot');
      dot.setAttribute('aria-label', `Go to page ${index + 1}`);
      dot.addEventListener('click', () => goToTextPage(index));
      textCarouselDotsContainer.appendChild(dot);
    });
  }

  // Desktop: shrink the modal text step by step until all of it fits the
  // panel (down to a readable minimum; below that the panel scrolls)
  function fitModalText() {
    if (!textCarouselPageDisplay) return;
    const style = textCarouselPageDisplay.style;
    style.removeProperty('--modal-text-size');
    if (!currentProjectData || !window.matchMedia('(min-width: 769px)').matches) return;

    const overflows = () => textCarouselPageDisplay.scrollHeight > textCarouselPageDisplay.clientHeight + 1;
    for (let size = 1.35; overflows() && size > 1.05; ) {
      size = Math.round((size - 0.05) * 100) / 100;
      style.setProperty('--modal-text-size', `${size}rem`);
    }
  }

  // --- Image dots: hover (or tap/focus) a dot to peek at that image ---
  const modalImageDots = projectDetailModal ? projectDetailModal.querySelector('.modal-image-dots') : null;
  let modalImageFadeTimeout = null;
  let isPeekingModalImage = false; // pauses the automatic rotation

  function setModalImage(index) {
    currentModalImageIndex = index;
    modalMainImage.src = currentProjectData.modalSliderImages[index];
    modalMainImage.alt = `${currentProjectData.title} image ${index + 1}`;
    modalMainImage.style.opacity = '1';
    if (modalImageDots) {
      modalImageDots.querySelectorAll('.modal-image-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-pressed', String(i === index));
      });
    }
  }

  function restartModalImageTimer() {
    if (modalImageSliderInterval) clearInterval(modalImageSliderInterval);
    modalImageSliderInterval = null;
    if (currentProjectData && currentProjectData.modalSliderImages && currentProjectData.modalSliderImages.length >= 2) {
      modalImageSliderInterval = setInterval(changeModalImage, 5000); // 5 seconds
    }
  }

  function peekModalImage(index) {
    if (!currentProjectData) return;
    isPeekingModalImage = true;
    clearTimeout(modalImageFadeTimeout); // cancel a fade that's halfway through
    setModalImage(index);
  }

  function stopPeekingModalImage() {
    if (!isPeekingModalImage) return;
    isPeekingModalImage = false;
    restartModalImageTimer(); // continue from the peeked image, 5s later
  }

  function buildModalImageDots() {
    if (!modalImageDots) return;
    modalImageDots.innerHTML = '';
    const images = (currentProjectData && currentProjectData.modalSliderImages) || [];
    modalImageDots.hidden = images.length < 2;
    images.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'modal-image-dot';
      dot.setAttribute('aria-label', `Show image ${i + 1}`);
      dot.addEventListener('mouseenter', () => peekModalImage(i));
      dot.addEventListener('focus', () => peekModalImage(i));
      dot.addEventListener('click', () => peekModalImage(i));
      modalImageDots.appendChild(dot);
    });
  }

  if (modalImageDots) {
    modalImageDots.addEventListener('mouseleave', stopPeekingModalImage);
    modalImageDots.addEventListener('focusout', event => {
      if (!modalImageDots.contains(event.relatedTarget)) stopPeekingModalImage();
    });
  }

  function changeModalImage() {
    if (!currentProjectData || !modalMainImage || !currentProjectData.modalSliderImages || currentProjectData.modalSliderImages.length < 2) {
      return; // No slider if not enough images
    }
    if (isPeekingModalImage) return;

    modalMainImage.style.opacity = '0'; // Start fade out

    clearTimeout(modalImageFadeTimeout);
    modalImageFadeTimeout = setTimeout(() => {
      if (!currentProjectData || isPeekingModalImage) return;
      setModalImage((currentModalImageIndex + 1) % currentProjectData.modalSliderImages.length);
    }, 750); // Wait for fade out (matches half of 1.5s total, or full 0.7s opacity transition)
  }

  function startModalImageSlider() {
    isPeekingModalImage = false;
    clearTimeout(modalImageFadeTimeout);
    buildModalImageDots();

    if (!currentProjectData || !currentProjectData.modalSliderImages || currentProjectData.modalSliderImages.length < 2) {
      // If only one image or no images, just ensure the first one is displayed if available
      if (modalMainImage && currentProjectData && currentProjectData.modalSliderImages && currentProjectData.modalSliderImages.length === 1) {
        modalMainImage.src = currentProjectData.modalSliderImages[0];
        modalMainImage.alt = currentProjectData.title + " image 1";
        modalMainImage.style.opacity = '1';
      } else if (modalMainImage && currentProjectData && currentProjectData.mainImage) {
        modalMainImage.src = currentProjectData.mainImage;
        modalMainImage.alt = currentProjectData.title + " image";
        modalMainImage.style.opacity = '1';
      }
      return; // Don't start interval if not enough images for a slideshow
    }

    // Set initial image immediately
    setModalImage(0);
    restartModalImageTimer();
  }

  function openProjectModal(projectIndex) {
    if (!projectDetailModal || !portfolioProjectsData[projectIndex]) return;
    currentProjectData = portfolioProjectsData[projectIndex];
    currentTextPageIndex = 0;

    const isCaseStudy = Boolean(currentProjectData.caseStudy && caseEls);
    setCaseMode(isCaseStudy);
    if (isCaseStudy) {
      currentCasePage = 0;
      currentCaseImage = 0;
      renderCaseStudy();
      projectDetailModal.style.display = 'flex';
      document.body.classList.add('modal-open');
      setTimeout(() => projectDetailModal.classList.add('show'), 10);
      return;
    }

    if (modalProjectTitle) {
      modalProjectTitle.textContent = getCurrentLanguage() === 'el'
        ? (currentProjectData.modalHeaderEl || currentProjectData.modalHeader || 'Project Details')
        : (currentProjectData.modalHeader || 'Project Details');
    }

    if (modalMainImage) {
      if (currentProjectData.imageClass) {
        modalMainImage.className = 'modal-project-image ' + currentProjectData.imageClass;
      } else {
        modalMainImage.className = 'modal-project-image';
      }
    }

    if (modalImageSliderContainer) {
      modalImageSliderContainer.className = 'modal-image-slider-container';
      if (currentProjectData.imageContainerClass) {
        modalImageSliderContainer.classList.add(currentProjectData.imageContainerClass);
      }
    }

    // Show modal first so layout measurements (offsetWidth) are correct
    projectDetailModal.style.display = 'flex';
    document.body.classList.add('modal-open');

    // Generate pages + position carousel after browser has laid out modal
    requestAnimationFrame(() => {
      generateTextCarouselPagesAndDots();
      // Delay positioning until after the DOM update (widths can be 0 on first pass)
      requestAnimationFrame(() => {
        goToTextPage(currentTextPageIndex, false); // Set initial page without animation
        fitModalText();
        document.fonts.ready.then(fitModalText); // Re-fit once web fonts have loaded
      });
      startModalImageSlider();
    });

    setTimeout(() => projectDetailModal.classList.add('show'), 10);
  }

  function closeProjectModal() {
    if (!projectDetailModal) return;
    projectDetailModal.classList.remove('show');
    document.body.classList.remove('modal-open');
    currentProjectData = null;
    if (modalImageSliderInterval) clearInterval(modalImageSliderInterval);
    modalImageSliderInterval = null;
    clearTimeout(modalImageFadeTimeout);
    isPeekingModalImage = false;
    currentModalImageIndex = 0;
    if (isTextDragging) { // Reset drag state if modal is closed mid-drag
      isTextDragging = false;
      document.body.style.cursor = '';
      textCarouselTrack.style.transition = 'transform 0.4s ease-in-out';
    }
  }

  // Text Carousel Arrow Listeners
  if (textCarouselPrevBtn) {
    textCarouselPrevBtn.addEventListener('click', () => goToTextPage(currentTextPageIndex - 1));
  }
  if (textCarouselNextBtn) {
    textCarouselNextBtn.addEventListener('click', () => goToTextPage(currentTextPageIndex + 1));
  }

  document.addEventListener('app:languagechange', syncPortfolioLanguageState);

  // --- Text Carousel Drag Logic ---
  function getTextPositionX(event) {
    return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
  }

  function getTextPositionY(event) {
    return event.type.includes('mouse') ? event.pageY : event.touches[0].clientY;
  }

  function textDragStart(event) {
    if (!currentProjectData) return;
    // Desktop shows all pages stacked and scrollable, so there is nothing to swipe
    if (window.matchMedia('(min-width: 769px)').matches) return;

    textDragStartPosX = getTextPositionX(event);
    textDragStartPosY = getTextPositionY(event);
    isTextDragAllowed = null;
    isTextDragging = true;
    textDragAnimationID = requestAnimationFrame(textDragAnimationLoop);
    textCarouselTrack.style.transition = 'none';
    document.body.style.cursor = 'grabbing';
  }

  function textDragAnimationLoop() {
    if (isTextDragging) {
      textCarouselTrack.style.transform = `translateX(${textDragCurrentTranslateX}px)`;
      requestAnimationFrame(textDragAnimationLoop);
    }
  }

  function textDragMove(event) {
    if (!isTextDragging || !currentProjectData) return;

    const currentX = getTextPositionX(event);
    const currentY = getTextPositionY(event);
    const diffX = currentX - textDragStartPosX;
    const diffY = currentY - textDragStartPosY;

    // On touch devices, determine whether the user intends a vertical scroll (within the page)
    // or a horizontal swipe (between carousel pages).
    if (isTextDragAllowed === null) {
      if (Math.abs(diffY) > Math.abs(diffX) + 6) {
        // Vertical movement wins: stop drag handling and allow native scroll
        isTextDragging = false;
        document.body.style.cursor = '';
        cancelAnimationFrame(textDragAnimationID);
        return;
      }

      if (Math.abs(diffX) > Math.abs(diffY) + 6) {
        isTextDragAllowed = true;
      } else {
        // Not enough movement to decide; keep waiting for more movement
        return;
      }
    }

    if (!isTextDragAllowed) return;

    const baseTranslateX = -currentTextPageIndex * textCarouselPageDisplay.offsetWidth;
    textDragCurrentTranslateX = baseTranslateX + diffX;
  }

  function textDragAnimationLoop() {
    if (isTextDragging) {
      textCarouselTrack.style.transform = `translateX(${textDragCurrentTranslateX}px)`;
      requestAnimationFrame(textDragAnimationLoop);
    }
  }

  function textDragMove(event) {
    if (!isTextDragging || !currentProjectData) return;
    const currentX = getTextPositionX(event);
    const diffX = currentX - textDragStartPosX;
    const baseTranslateX = -currentTextPageIndex * textCarouselPageDisplay.offsetWidth;
    textDragCurrentTranslateX = baseTranslateX + diffX;
    // No need to set transform here directly if using rAF loop, but for immediate feedback outside loop:
    // textCarouselTrack.style.transform = `translateX(${textDragCurrentTranslateX}px)`; 
  }

  function textDragEnd() {
    if (!isTextDragging || !currentProjectData) return;
    isTextDragging = false;
    isTextDragAllowed = null;
    cancelAnimationFrame(textDragAnimationID);
    document.body.style.cursor = '';
    textCarouselTrack.style.transition = 'transform 0.4s ease-in-out';

    const viewportWidth = textCarouselPageDisplay.offsetWidth;
    const draggedDistance = textDragCurrentTranslateX - (-currentTextPageIndex * viewportWidth);
    const threshold = viewportWidth / 4; // Must drag at least 1/4 of the page width

    let newPageIndex = currentTextPageIndex;
    if (draggedDistance < -threshold && currentTextPageIndex < currentProjectData.detailedContentPages.length - 1) {
      newPageIndex++;
    } else if (draggedDistance > threshold && currentTextPageIndex > 0) {
      newPageIndex--;
    }
    goToTextPage(newPageIndex);
  }

  if (textCarouselPageDisplay) { // Viewport for drag
    textCarouselPageDisplay.addEventListener('mousedown', textDragStart);
    textCarouselPageDisplay.addEventListener('touchstart', textDragStart, { passive: true });
  }
  document.addEventListener('mousemove', textDragMove);
  document.addEventListener('touchmove', textDragMove, { passive: true });
  document.addEventListener('mouseup', textDragEnd);
  document.addEventListener('touchend', textDragEnd);

  // Prevent image dragging interference (if any images are inside text pages)
  if (textCarouselTrack) {
    textCarouselTrack.ondragstart = () => false;
  }

  // --- Existing Modal Trigger and Close Logic ---
  seeMorePrompts.forEach(prompt => {
    prompt.addEventListener('click', (event) => {
      const slide = event.target.closest('.portfolio-slide');
      if (slide) {
        const projectIndex = slide.dataset.projectIndex;
        if (projectIndex !== undefined) {
          openProjectModal(parseInt(projectIndex, 10));
        }
      }
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeProjectModal);
  }

  if (projectDetailModal) {
    projectDetailModal.addEventListener('click', (event) => {
      if (event.target === projectDetailModal) {
        closeProjectModal();
      }
    });
  }

  // Adjust resize listener for text carousel
  window.addEventListener('resize', () => {
    if (projectDetailModal && projectDetailModal.classList.contains('show')) {
      // For image slider (already present)
      // For text carousel, readjust position without animation if viewport width changed
      if (textCarouselTrack && currentProjectData) {
        goToTextPage(currentTextPageIndex, false);
        fitModalText();
      }
    }
  });

});

// === Tool Logo Tooltip Functionality ===
document.addEventListener('DOMContentLoaded', function() {
  const tooltip = document.getElementById('carousel-tooltip');
  const toolsLogosContainer = document.querySelector('.about-tools-logos');
  
  if (!tooltip || !toolsLogosContainer) return;
  
  let tooltipTimeout = null;
  
  // Use event delegation to handle dynamically loaded logos
  toolsLogosContainer.addEventListener('mouseenter', function(e) {
    const logo = e.target.closest('.tool-logo');
    if (logo) {
      const altText = logo.getAttribute('alt');
      if (altText) {
        // Clear any existing timeout
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
        }
        
        // Set tooltip content using the alt attribute
        tooltip.textContent = altText;
        
        // Show tooltip with slight delay for better UX
        tooltipTimeout = setTimeout(() => {
          tooltip.classList.add('show');
          updateTooltipPosition(e);
        }, 200);
      }
    }
  }, true); // Use capture to ensure we catch the event
  
  toolsLogosContainer.addEventListener('mouseleave', function(e) {
    const logo = e.target.closest('.tool-logo');
    if (logo) {
      // Clear timeout and hide tooltip
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      tooltip.classList.remove('show');
    }
  }, true);
  
  toolsLogosContainer.addEventListener('mousemove', function(e) {
    const logo = e.target.closest('.tool-logo');
    if (logo && tooltip.classList.contains('show')) {
      updateTooltipPosition(e);
    }
  }, true);
  
  // Hide tooltip when mouse leaves the entire tools logos area
  toolsLogosContainer.addEventListener('mouseleave', function(e) {
    // Only hide if not leaving to another logo within the container
    if (!e.relatedTarget || !e.relatedTarget.closest('.tool-logo')) {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      tooltip.classList.remove('show');
    }
  });
  
  function updateTooltipPosition(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Position tooltip above the cursor
    tooltip.style.left = mouseX + 'px';
    tooltip.style.top = mouseY + 'px';
  }
  
  // Also try to attach to any existing logos immediately
  function attachToExistingLogos() {
    const existingLogos = document.querySelectorAll('.tool-logo');
    existingLogos.forEach(logo => {
      // Remove any existing listeners to avoid duplicates
      logo.replaceWith(logo.cloneNode(true));
    });
    
    // Re-attach to fresh logos
    const freshLogos = document.querySelectorAll('.tool-logo');
    freshLogos.forEach(logo => {
      logo.addEventListener('mouseenter', function(e) {
        const altText = this.getAttribute('alt');
        if (altText) {
          if (tooltipTimeout) clearTimeout(tooltipTimeout);
          tooltip.textContent = altText;
          tooltipTimeout = setTimeout(() => {
            tooltip.classList.add('show');
            updateTooltipPosition(e);
          }, 200);
        }
      });
      
      logo.addEventListener('mouseleave', function() {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        tooltip.classList.remove('show');
      });
      
      logo.addEventListener('mousemove', function(e) {
        if (tooltip.classList.contains('show')) {
          updateTooltipPosition(e);
        }
      });
    });
  }
  
  // Initial attachment
  attachToExistingLogos();
  
  // Re-attach whenever logos might change (after carousel animations)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.target.classList.contains('about-tools-logos')) {
        attachToExistingLogos();
      }
    });
  });
  
  if (toolsLogosContainer) {
    observer.observe(toolsLogosContainer, {
      childList: true,
      subtree: true
    });
  }
});

// Simple Tool Logo Tooltips
setTimeout(function() {
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:fixed;background:#183B3B;color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;opacity:0;transition:opacity 0.2s;font-family:"Manrope", Arial, sans-serif;font-size:20px;';
  document.body.appendChild(tooltip);
  
  const logos = document.querySelectorAll('.tool-logo');
  console.log('Found logos:', logos.length);
  
  logos.forEach((logo, index) => {
    console.log(`Logo ${index}:`, logo.alt);
    
    // Enable pointer events on the logos
    logo.style.pointerEvents = 'auto';
    
    logo.onmouseover = function() {
      console.log('Mouse over:', this.alt);
      tooltip.textContent = this.alt;
      tooltip.style.opacity = '1';
    };
    
    logo.onmouseout = function() {
      console.log('Mouse out');
      tooltip.style.opacity = '0';
    };
    
    logo.onmousemove = function(e) {
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY - 30 + 'px';
    };
  });
}, 500);

// // --- Generate Slides and Dots from Data ---
// function generatePortfolioItems() {
//   carousel.innerHTML = ''; // Clear existing slides
//   dotsContainer.innerHTML = ''; // Clear existing dots

//   portfolioProjects.forEach((project, index) => {
//     // Create Slide
//     const slide = document.createElement('div');
//     slide.classList.add('portfolio-slide');

//     // Create Image Container & Image
//     const imageContainer = document.createElement('div');
//     imageContainer.classList.add('portfolio-image-container');
//     const img = document.createElement('img');
//     img.src = project.image;
//     img.alt = project.title + " Image";
//     img.classList.add('portfolio-image-item');
//     imageContainer.appendChild(img);
//     // Append Image Container to Slide FIRST
//     slide.appendChild(imageContainer);

//     // Create Text Content Container (now separate)
//     const textContent = document.createElement('div');
//     textContent.classList.add('portfolio-text-content'); // Removed 'overlay' class here
//     const title = document.createElement('h3');
//     title.classList.add('portfolio-item-title');
//     title.textContent = project.title; // Use project title
//     const description = document.createElement('p');
//     description.classList.add('portfolio-item-description');
//     description.textContent = project.description; // Use project description
//     textContent.appendChild(title);
//     textContent.appendChild(description);
//     // Append Text Content to Slide SECOND
//     slide.appendChild(textContent);

//     carousel.appendChild(slide);

//     // Create Dot
//     const dot = document.createElement('button');
//     dot.classList.add('portfolio-dot');
//     dot.setAttribute('aria-label', `Go to project ${index + 1}`);
//     dot.addEventListener('click', () => goToSlide(index));
//     dotsContainer.appendChild(dot);
//   });

//   // Re-initialize slides array and UI after generation
//   slides = document.querySelectorAll('.portfolio-slide');
//   totalSlides = slides.length;
//   dots = dotsContainer.querySelectorAll('.portfolio-dot');
//   if (totalSlides > 0) {
//     currentSlideIndex = 0; // Reset index
//     goToSlide(currentSlideIndex);
//   } else {
//     updateUI(); // Update arrows if no slides
//   }
// }
// generatePortfolioItems(); // Call the function to build slides initially

// --- Button Splash Ripple Effect ---
// Visual only: scrolling to the target section is handled by the section links
// code near the top of this file (it waits for the splash before moving).
document.querySelectorAll('.about-btn').forEach(button => {
  button.addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.classList.add('splash-ripple');

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    this.appendChild(ripple);

    // Remove the ripple element after the CSS animation finishes (0.6s)
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});


// === Hero "milk" ripples + hidden word ===
// A small wave simulation on a low-res canvas behind the hero. Moving the mouse
// pushes into the surface; waves spread out and die down quickly, like milk.
// A word (HIDDEN_WORD) lies under the surface: where the pointer passes it is
// uncovered for a moment, like brushing sand away, then slowly covered again.
// The canvas is upscaled by the browser, which keeps everything soft.
(function initHeroRipples() {
  const host = document.getElementById('main-content');
  if (!host) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let CELL = 4;            // screen pixels per simulation cell (finer on phones, set in resize)
  const DAMPING = 0.955;   // lower = thicker liquid, waves fade sooner
  const RADIUS = 3;        // brush radius in cells
  const STRENGTH = 60;     // how deep the "finger" pushes
  const LIGHT = 0.9;       // how strongly slopes are shaded
  const HIDDEN_WORD = 'DESIGN';
  const HIDDEN_WORD_2 = 'UI/UX';  // small word to the right of the end of the name
  const INK_2 = '#7B5EA7';        // purple for HIDDEN_WORD_2
  const HIDDEN_WORD_3 = 'PRODUCT'; // above the start of the name
  const INK_3 = '#D64545';        // red for HIDDEN_WORD_3
  const HIDDEN_WORD_4 = 'INNOVATION'; // behind the "Scroll down" hint
  const INK_4 = '#3E9B4F';        // green for HIDDEN_WORD_4
  const REVEAL_RADIUS = 9; // how wide the pointer uncovers the word, in cells
  const REVEAL_FADE = 0.975; // closer to 1 = the word stays visible longer
  // Tap (touch screens): one big splash that uncovers the word as it spreads
  const SPLASH_REACH = 0.7;  // how far the splash spreads, as a share of the screen width
  const SPLASH_FRAMES = 45;  // how long it takes to spread (60 frames ~ 1 second)

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-ripples';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const beigeHex = getComputedStyle(document.documentElement).getPropertyValue('--beige').trim() || '#F5EFE6';
  const base = [1, 3, 5].map(i => parseInt(beigeHex.slice(i, i + 2), 16));
  const tealHex = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#147D78';
  const ink = [1, 3, 5].map(i => parseInt(tealHex.slice(i, i + 2), 16));
  const ink2 = [1, 3, 5].map(i => parseInt(INK_2.slice(i, i + 2), 16));
  const ink3 = [1, 3, 5].map(i => parseInt(INK_3.slice(i, i + 2), 16));
  const ink4 = [1, 3, 5].map(i => parseInt(INK_4.slice(i, i + 2), 16));

  let cols = 0, rows = 0, cur, prev, image, running = false, last = null;
  let mask, mask2, mask3, mask4, reveal; // mask: where the word's letters are (0..1); reveal: how uncovered each cell is
  let splashes = [];

  function resize() {
    CELL = window.innerWidth < 700 ? 3 : 4;
    cols = Math.max(2, Math.ceil(host.clientWidth / CELL));
    rows = Math.max(2, Math.ceil(host.clientHeight / CELL));
    canvas.width = cols;
    canvas.height = rows;
    cur = new Float32Array(cols * rows);
    prev = new Float32Array(cols * rows);
    image = ctx.createImageData(cols, rows);
    reveal = new Float32Array(cols * rows);
    splashes = [];
    buildMask();
    paint();
  }

  // Draw the word into a tiny offscreen canvas and keep its coverage per cell,
  // roughened with grain so uncovered edges look like sand
  function buildMask() {
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d');
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-main').trim() || 'Arial, sans-serif';
    // Place the word in the space between the hero name and the bottom of the screen
    const hostTop = host.getBoundingClientRect().top;
    const nameEl = host.querySelector('.hero-name');
    const areaTop = nameEl ? (nameEl.getBoundingClientRect().bottom - hostTop) / CELL : rows * 0.3;
    const areaBottom = Math.min(host.clientHeight, window.innerHeight) / CELL;
    const areaHeight = Math.max(areaBottom - areaTop, rows * 0.2);
    // Left-aligned with the start of the hero name
    const nameText = nameEl && nameEl.querySelector('.hero-letter');
    const left = Math.max(cols * 0.04, nameText ? (nameText.getBoundingClientRect().left - host.getBoundingClientRect().left) / CELL : cols * 0.08);
    let size = areaHeight * 0.5;
    o.font = `800 ${size}px ${family}`;
    const maxWidth = window.innerWidth < 700 ? 0.75 : 0.5; // wider share of the screen on phones
    // Never wider than that share, and never past the right edge of the screen
    const fit = Math.min(cols * maxWidth, cols * 0.96 - left) / o.measureText(HIDDEN_WORD).width;
    if (fit < 1) size *= fit;
    o.font = `800 ${size}px ${family}`;
    o.textAlign = 'left';
    o.textBaseline = 'middle';
    o.fillStyle = '#000';
    o.fillText(HIDDEN_WORD, left, areaTop + areaHeight / 2);
    mask = readMask(o);

    // Second word: large, at the end of the name's last word and partly tucked
    // behind it, right-aligned to the screen edge (the name is drawn on top)
    o.clearRect(0, 0, cols, rows);
    const words = host.querySelectorAll('.hero-word');
    const lastWord = words[words.length - 1];
    if (lastWord) {
      const hostRect = host.getBoundingClientRect();
      const w = lastWord.getBoundingClientRect();
      const wordLeft = (w.left - hostRect.left) / CELL;
      const wordRight = (w.right - hostRect.left) / CELL;
      const wordTop = (w.top - hostRect.top) / CELL;
      const wordH = w.height / CELL;
      const edge = cols * 0.97;
      let size2 = wordH * 0.8;
      o.font = `800 ${size2}px ${family}`;
      let width2 = o.measureText(HIDDEN_WORD_2).width;
      // Keep it within the last word's start and the screen edge
      const maxW = edge - wordLeft;
      if (width2 > maxW) { size2 *= maxW / width2; o.font = `800 ${size2}px ${family}`; width2 = maxW; }
      // About 60% of it sticks out past the name; less if the screen edge is closer
      const right = Math.min(edge, wordRight + width2 * 0.6);
      o.textAlign = 'right';
      o.fillText(HIDDEN_WORD_2, right, wordTop + wordH * 0.42);
    }
    mask2 = readMask(o);

    // Third word: a bit bigger than the second, above the start of the name's
    // first word, its lower part tucked behind the name (kept clear of the menu button)
    o.clearRect(0, 0, cols, rows);
    const firstWord = words[0];
    if (firstWord) {
      const hostRect = host.getBoundingClientRect();
      const w = firstWord.getBoundingClientRect();
      const wordLeft = (w.left - hostRect.left) / CELL;
      const wordTop = (w.top - hostRect.top) / CELL;
      const wordH = w.height / CELL;
      let size3 = wordH * 0.9;
      o.font = `800 ${size3}px ${family}`;
      let width3 = o.measureText(HIDDEN_WORD_3).width;
      const maxW = cols * 0.94;
      if (width3 > maxW) { size3 *= maxW / width3; o.font = `800 ${size3}px ${family}`; width3 = maxW; }
      const left3 = Math.min(Math.max(cols * 0.03, wordLeft - width3 * 0.12), cols * 0.97 - width3);
      const menuClear = 96 / CELL; // below the hamburger button
      const y3 = Math.max(wordTop + wordH * 0.05, menuClear + size3 * 0.4);
      o.textAlign = 'left';
      o.fillText(HIDDEN_WORD_3, left3, y3);
    }
    mask3 = readMask(o);

    // Fourth word: medium size, behind the "Scroll down" hint. When the hint sits
    // at the right (desktop) the word extends left from the hint's right edge;
    // when it is centred (phones) the word is centred on it too.
    o.clearRect(0, 0, cols, rows);
    const hint = host.querySelector('.scroll-hint');
    if (hint && firstWord) {
      const hostRect = host.getBoundingClientRect();
      const h = hint.getBoundingClientRect();
      const nameH = firstWord.getBoundingClientRect().height / CELL;
      let size4 = nameH * 0.5;
      o.font = `800 ${size4}px ${family}`;
      let width4 = o.measureText(HIDDEN_WORD_4).width;
      const maxW = cols * 0.9;
      if (width4 > maxW) { size4 *= maxW / width4; o.font = `800 ${size4}px ${family}`; width4 = maxW; }
      const hintRight = (h.right - hostRect.left) / CELL;
      const hintCentreX = (h.left + h.width / 2 - hostRect.left) / CELL;
      const hintCentreY = (h.top + h.height * 0.45 - hostRect.top) / CELL;
      if (hintCentreX > cols * 0.6) {
        o.textAlign = 'right';
        o.fillText(HIDDEN_WORD_4, Math.min(hintRight, cols * 0.97), hintCentreY);
      } else {
        // Centred layout (phones): size it to about 70% of the screen width
        size4 *= (cols * 0.7) / width4;
        o.font = `800 ${size4}px ${family}`;
        o.textAlign = 'center';
        o.fillText(HIDDEN_WORD_4, hintCentreX, hintCentreY);
      }
    }
    mask4 = readMask(o);
  }

  // Coverage of what is drawn on the offscreen canvas, with sandy grain
  function readMask(o) {
    const px = o.getImageData(0, 0, cols, rows).data;
    const out = new Float32Array(cols * rows);
    for (let i = 0; i < out.length; i++) {
      out[i] = (px[i * 4 + 3] / 255) * (0.75 + Math.random() * 0.25);
    }
    return out;
  }

  function uncover(cx, cy) {
    const r = REVEAL_RADIUS;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d2 = x * x + y * y;
        if (d2 > r * r) continue;
        const px = cx + x, py = cy + y;
        if (px < 0 || py < 0 || px >= cols || py >= rows) continue;
        const i = py * cols + px;
        // Soft brush with a little randomness, so it clears like sand
        const amount = (1 - d2 / (r * r)) * (0.12 + Math.random() * 0.1);
        reveal[i] = Math.min(1, reveal[i] + amount);
      }
    }
  }

  function disturb(cx, cy, radius = RADIUS, depth = STRENGTH * 0.25) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const d2 = x * x + y * y;
        if (d2 > radius * radius) continue;
        const px = cx + x, py = cy + y;
        if (px < 1 || py < 1 || px >= cols - 1 || py >= rows - 1) continue;
        // Smooth falloff so the dent has no hard edge
        cur[py * cols + px] -= depth * (1 - d2 / (radius * radius + 1));
      }
    }
  }

  function splash(cx, cy) {
    disturb(cx, cy, 8, 70);
    splashes.push({ x: cx, y: cy, r: 0, max: cols * SPLASH_REACH });
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  // Grow each splash: uncover everything inside it, and push the surface along
  // its edge so a ripple front travels outwards with it
  function updateSplashes() {
    splashes = splashes.filter(sp => {
      sp.r += sp.max / SPLASH_FRAMES;
      const r = sp.r, r2 = r * r, left = 1 - r / sp.max;
      const x0 = Math.max(0, Math.floor(sp.x - r)), x1 = Math.min(cols - 1, Math.ceil(sp.x + r));
      const y0 = Math.max(0, Math.floor(sp.y - r)), y1 = Math.min(rows - 1, Math.ceil(sp.y + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - sp.x, dy = y - sp.y;
          if (dx * dx + dy * dy > r2) continue;
          const i = y * cols + x;
          const v = 0.85 + Math.random() * 0.15;
          if (reveal[i] < v) reveal[i] = v;
        }
      }
      const points = Math.ceil((2 * Math.PI * r) / 3);
      for (let k = 0; k < points; k++) {
        const a = (k / points) * Math.PI * 2;
        disturb(Math.round(sp.x + Math.cos(a) * r), Math.round(sp.y + Math.sin(a) * r), 2, 9 * left);
      }
      return sp.r < sp.max;
    });
  }

  function step() {
    let peak = 0;
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        const v = ((cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols]) / 2 - prev[i]) * DAMPING;
        prev[i] = v;
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
      }
    }
    const t = cur; cur = prev; prev = t;
    // The uncovered word slowly gets covered again
    let revealPeak = 0;
    for (let i = 0; i < reveal.length; i++) {
      const r = reveal[i] * REVEAL_FADE;
      reveal[i] = r < 0.004 ? 0 : r;
      if (r > revealPeak) revealPeak = r;
    }
    return Math.max(peak, revealPeak * 100);
  }

  function paint() {
    const data = image.data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let shade = 0;
        if (x > 0 && x < cols - 1 && y > 0 && y < rows - 1) {
          // Light from the top-left: slopes facing it get lighter
          shade = ((cur[i - 1] - cur[i + 1]) + (cur[i - cols] - cur[i + cols])) * LIGHT;
        }
        const m = mask ? mask[i] * reveal[i] : 0;
        const m2 = mask2 ? mask2[i] * reveal[i] : 0;
        const m3 = mask3 ? mask3[i] * reveal[i] : 0;
        const m4 = mask4 ? mask4[i] * reveal[i] : 0;
        const o = i * 4;
        data[o] = base[0] + (ink[0] - base[0]) * m + (ink2[0] - base[0]) * m2 + (ink3[0] - base[0]) * m3 + (ink4[0] - base[0]) * m4 + shade;
        data[o + 1] = base[1] + (ink[1] - base[1]) * m + (ink2[1] - base[1]) * m2 + (ink3[1] - base[1]) * m3 + (ink4[1] - base[1]) * m4 + shade;
        data[o + 2] = base[2] + (ink[2] - base[2]) * m + (ink2[2] - base[2]) * m2 + (ink3[2] - base[2]) * m3 + (ink4[2] - base[2]) * m4 + shade * 1.05;
        data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  function loop() {
    if (splashes.length) updateSplashes();
    const peak = step();
    paint();
    // Keep going until the surface is visually flat again
    if (peak > 0.25 || splashes.length) {
      requestAnimationFrame(loop);
    } else {
      cur.fill(0); prev.fill(0); reveal.fill(0); splashes = []; paint();
      running = false;
    }
  }

  function moveTo(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((clientX - rect.left) / CELL);
    const y = Math.round((clientY - rect.top) / CELL);
    // Fill in the path between pointer events so fast moves leave a smooth trail
    if (last) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / 2));
      for (let s = 1; s <= steps; s++) {
        const sx = Math.round(last.x + (x - last.x) * s / steps);
        const sy = Math.round(last.y + (y - last.y) * s / steps);
        disturb(sx, sy);
        uncover(sx, sy);
      }
    } else {
      disturb(x, y);
      uncover(x, y);
    }
    last = { x, y };
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  // Mouse and pen
  host.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') moveTo(event.clientX, event.clientY);
  });
  host.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') last = null;
  });

  // Touch: every touch sets off a big splash where the finger lands. It stays at
  // that spot even if the finger then drags or scrolls the page. Passive
  // listener, so scrolling works as usual.
  host.addEventListener('touchstart', event => {
    const t = event.touches[0];
    if (!t || event.touches.length !== 1) return;
    const rect = canvas.getBoundingClientRect();
    splash(Math.round((t.clientX - rect.left) / CELL), Math.round((t.clientY - rect.top) / CELL));
  }, { passive: true });

  // Skip the small height-only resizes phones fire when the address bar shows/hides
  let resizeTimer, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 150) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();
  // Redraw the hidden word once the web font has loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildMask(); paint(); });
})();

// === My work: paint drip ===
// Places the paint's edge just below the title, and plays the pour each time
// the section scrolls into view (reset once it is fully out of view).
(function initPaintDrip() {
  const section = document.getElementById('portfolio');
  const drip = section && section.querySelector('.paint-drip');
  const title = section && section.querySelector('.portfolio-title');
  if (!drip || !title) return;

  function placeBand() {
    const sectionTop = section.getBoundingClientRect().top;
    const titleBottom = title.getBoundingClientRect().bottom;
    drip.style.setProperty('--band', `${Math.round(titleBottom - sectionTop + 24)}px`);
    updateToolbarColour();
  }

  placeBand();
  window.addEventListener('resize', placeBand);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBand);

  if (!('IntersectionObserver' in window)) {
    section.classList.add('is-poured');
    return;
  }
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.3) {
        placeBand();
        section.classList.add('is-poured');
      } else if (!entry.isIntersecting) {
        section.classList.remove('is-poured');
      }
    });
  }, { threshold: [0, 0.3] }).observe(section);
})();

// === Contact form ===
// Sends the message to FormSubmit in the background and shows the result under
// the button. Without JavaScript the form still posts normally.
(function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const status = form.querySelector('.contact-status');
  const button = form.querySelector('.contact-send');
  const endpoint = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');

  const text = {
    missing: { en: 'Please fill in all fields.', el: 'Συμπλήρωσε όλα τα πεδία.' },
    badEmail: { en: 'Please enter a valid email.', el: 'Γράψε ένα έγκυρο email.' },
    sending: { en: 'Sending…', el: 'Αποστολή…' },
    sent: { en: "Thanks! I'll get back to you soon.", el: 'Ευχαριστώ! Θα σου απαντήσω σύντομα.' },
    failed: { en: 'Something went wrong. Please email me directly.', el: 'Κάτι πήγε στραβά. Στείλε μου απευθείας email.' }
  };
  const t = key => text[key][document.documentElement.lang === 'el' ? 'el' : 'en'];

  function setStatus(key, kind) {
    status.textContent = key ? t(key) : '';
    status.classList.toggle('is-success', kind === 'success');
    status.classList.toggle('is-error', kind === 'error');
  }

  form.addEventListener('input', event => {
    const field = event.target.closest('.contact-field');
    if (field) field.classList.remove('is-invalid');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.elements.name, email = form.elements.email, message = form.elements.message;

    let firstBad = null;
    [name, email, message].forEach(input => {
      const bad = !input.value.trim() || (input === email && !input.validity.valid);
      input.closest('.contact-field').classList.toggle('is-invalid', bad);
      if (bad && !firstBad) firstBad = input;
    });
    if (firstBad) {
      setStatus(firstBad === email && email.value.trim() ? 'badEmail' : 'missing', 'error');
      firstBad.focus();
      return;
    }

    button.disabled = true;
    setStatus('sending');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim(),
          message: message.value.trim(),
          _honey: form.elements._honey.value,
          _subject: `New message from your portfolio: ${name.value.trim()}`,
          _template: 'table'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) === 'false') throw new Error(result.message || response.status);
      form.reset();
      setStatus('sent', 'success');
    } catch (error) {
      setStatus('failed', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();

// === Back to top: drop in when the footer (bottom of the page) comes into view ===
(function initBackToTop() {
  const footer = document.querySelector('.site-footer');
  const button = footer && footer.querySelector('.back-to-top');
  if (!button) return;
  if (!('IntersectionObserver' in window)) {
    button.classList.add('is-visible');
    return;
  }
  new IntersectionObserver(entries => {
    entries.forEach(entry => button.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: 0.4 }).observe(footer);
})();
