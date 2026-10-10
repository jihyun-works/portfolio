const siteHeader = document.getElementById('siteHeader');
    const modal = document.getElementById('portfolioModal');
    const modalDialog = modal.querySelector('.modal-dialog');
    const modalHeroMedia = document.getElementById('modalHeroMedia');
    const modalThumbs = document.getElementById('modalThumbs');
    const modalDynamicBody = document.getElementById('modalDynamicBody');
    const modalClose = modal.querySelector('.modal-close');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');
    const modalPageIndicator = document.getElementById('modalPageIndicator');

    const modalTemplate = document.getElementById('modalTemplateDefault');

    let lastFocusedElement = null;
    let currentModalImages = [];
    let currentModalTitle = '';
    let currentModalIndex = 0;
    let modalTouchStartX = 0;
    let modalTouchDeltaX = 0;
    let modalTouchStartY = 0;
    let modalTouchDeltaY = 0;

    function getCardPrimaryMedia(source) {
      const imageEl = source.querySelector(':scope > img, :scope > a > img');
      if (imageEl?.getAttribute('src')) {
        return imageEl.getAttribute('src');
      }

      const sourceEl = source.querySelector('video source');
      if (sourceEl?.getAttribute('src')) {
        return sourceEl.getAttribute('src');
      }

      const videoEl = source.querySelector('video');
      if (videoEl?.getAttribute('src')) {
        return videoEl.getAttribute('src');
      }

      return '';
    }

    function isVideoFile(src) {
      return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src || '');
    }

    function createMediaMarkup(src, alt) {
      if (!src) return '';

      if (isVideoFile(src)) {
        return `
          <video autoplay muted loop playsinline preload="metadata" aria-label="${alt}">
            <source src="${src}">
          </video>
        `;
      }

      return `<img src="${src}" alt="${alt}">`;
    }

    function getCardData(source) {
      return {
        type: source.dataset.modalType || 'default',
        title: source.dataset.modalTitle || '',
        description: source.dataset.modalDescription || '',
        images: (source.dataset.modalImages || '').split('|').map(item => item.trim()).filter(Boolean),
        modalMedia: source.dataset.modalMedia || '',
        primaryMedia: getCardPrimaryMedia(source)
      };
    }

    function fillTemplateFields(container, data) {
      container.querySelectorAll('[data-field]').forEach((node) => {
        node.textContent = data[node.dataset.field] || '';
      });
    }

    function setModalGalleryMode(type, totalImages) {
      const isMultiPageCardNews = type === 'cardnews' && totalImages > 1;

      modalThumbs.classList.toggle('is-hidden', !isMultiPageCardNews);
      modalPrev.classList.toggle('is-hidden', !isMultiPageCardNews);
      modalNext.classList.toggle('is-hidden', !isMultiPageCardNews);
      modalPageIndicator.classList.toggle('is-hidden', !isMultiPageCardNews);
    }

    function renderModalBody(data) {
      const template = modalTemplate;
      const fragment = template.content.cloneNode(true);
      const wrapper = document.createElement('div');
      wrapper.className = 'modal-dynamic-body';
      wrapper.appendChild(fragment);
      fillTemplateFields(wrapper, data);
      modalDynamicBody.replaceChildren(wrapper);
    }

    function updateModalThumbActiveState() {
      modalThumbs.querySelectorAll('.modal-thumb').forEach((thumb, index) => {
        thumb.classList.toggle('is-active', index === currentModalIndex);
      });
    }

    function updateModalControls() {
      const total = currentModalImages.length;

      if (!total) {
        modalPrev.disabled = true;
        modalNext.disabled = true;
        modalPageIndicator.textContent = '0 / 0';
        return;
      }

      modalPrev.disabled = currentModalIndex <= 0;
      modalNext.disabled = currentModalIndex >= total - 1;
      modalPageIndicator.textContent = `${currentModalIndex + 1} / ${total}`;
    }

    function renderModalHeroByIndex(index) {
      if (!currentModalImages.length) {
        modalHeroMedia.classList.remove('is-swipe-ready');
        modalHeroMedia.textContent = currentModalTitle;
        updateModalControls();
        return;
      }

      currentModalIndex = Math.max(0, Math.min(index, currentModalImages.length - 1));
      modalHeroMedia.classList.add('is-swipe-ready');
      modalHeroMedia.innerHTML = createMediaMarkup(
        currentModalImages[currentModalIndex],
        `${currentModalTitle} ${currentModalIndex + 1}`
      );
      updateModalThumbActiveState();
      updateModalControls();
    }

    function goToModalSlide(index) {
      renderModalHeroByIndex(index);
    }

    function stepModalSlide(direction) {
      const nextIndex = currentModalIndex + direction;
      if (nextIndex < 0 || nextIndex >= currentModalImages.length) return;
      goToModalSlide(nextIndex);
    }

    function renderModalThumbs(images, title) {
      modalThumbs.innerHTML = '';

      if (!images.length) {
        modalThumbs.innerHTML = '';
        updateModalControls();
        return;
      }

      images.forEach((imageSrc, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'modal-thumb';
        button.setAttribute('aria-label', `${title} ${index + 1}번 이미지`);
        button.innerHTML = createMediaMarkup(imageSrc, `${title} ${index + 1}`);
        button.addEventListener('click', () => {
          goToModalSlide(index);
        });
        modalThumbs.appendChild(button);
      });

      updateModalThumbActiveState();
      updateModalControls();
    }

    function openModal(source) {
      const parentTrack = source.closest('.slider-track');
      if (parentTrack && parentTrack._dragState?.suppressClick) return;

      const data = getCardData(source);

      currentModalTitle = data.title;
      currentModalImages = [...data.images];

      if (data.type === 'poster' || data.type === 'banner') {
        if (data.modalMedia) {
          currentModalImages = [data.modalMedia];
        } else if (!currentModalImages.length && data.primaryMedia) {
          currentModalImages = [data.primaryMedia];
        }
      }

      if (!currentModalImages.length && data.primaryMedia) currentModalImages = [data.primaryMedia];
      currentModalIndex = 0;
      lastFocusedElement = source;
      renderModalBody(data);
      renderModalThumbs(currentModalImages, data.title);
      setModalGalleryMode(data.type, currentModalImages.length);
      renderModalHeroByIndex(0);

      modal.inert = false;
      setBackgroundInert(true);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      modalClose.focus();
    }

    function closeModal() {
      modal.querySelectorAll('video').forEach((video) => video.pause());
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      setBackgroundInert(false);
      if (lastFocusedElement) lastFocusedElement.focus();
      modal.inert = true;
    }

// Main card fields are the single source for project title, hero, category and year.
// Detail sections live in index.html > template#projectDetails01 / 02.
const projectRows = [...document.querySelectorAll('.project-card')];
const projectGallery = modal.querySelector('.modal-gallery');
const projectDetailToolbar = modal.querySelector('.project-detail-toolbar');
const projectDetailTitle = document.getElementById('projectDetailTitle');
// Reuse the gallery nodes and their listeners in one foreground detail layer.
const detailLightbox = document.createElement('div');
detailLightbox.className = 'detail-lightbox';
detailLightbox.hidden = true;
const detailViewer = document.createElement('div');
const cardnewsContent = document.createElement('div');
cardnewsContent.className = 'modal-content cardnews-content';
const cardnewsInfo = document.createElement('div');
cardnewsInfo.className = 'modal-body cardnews-info';
const projectToolAssets = {
  illustrator:['Adobe Illustrator','illustrator'], photoshop:['Adobe Photoshop','photoshop'],
  figma:['Figma','figma'], chatgpt:['ChatGPT','chatgpt'], gemini:['Gemini','gemini'],
  firefly:['Adobe Firefly','firefly'], html:['HTML','html_icon'], css:['CSS','css_icon'],
  javascript:['JavaScript','js_icon'], premiere:['Adobe Premiere Pro','premiere'],
  aftereffects:['Adobe After Effects','aftereffects'], canva:['Canva','canva circle logo']
};
function createProjectToolList(value) {
  const list = document.createElement('ul');
  list.className = 'project-tool-list';
  list.setAttribute('aria-label', 'Tools');
  value.split(/\s+/).filter(Boolean).forEach(key => {
    const tool = projectToolAssets[key];
    if (!tool) return;
    const item = document.createElement('li');
    item.className = 'project-tool-icon'; item.title = tool[0];
    item.setAttribute('aria-label', tool[0]);
    const img = document.createElement('img');
    img.src = `assets/img/tool_icon/${tool[1]}.svg`; img.alt = '';
    img.setAttribute('aria-hidden', 'true'); item.append(img); list.append(item);
  });
  return list;
}
detailViewer.className = 'detail-viewer';
detailViewer.setAttribute('role', 'dialog');
detailViewer.setAttribute('aria-modal', 'true');
detailViewer.setAttribute('aria-labelledby', 'projectDetailTitle');
detailLightbox.append(detailViewer);
modal.append(detailLightbox);
detailLightbox.addEventListener('click', event => {
  if (event.target === detailLightbox) returnToProjectOverview();
});
const viewerDescription = document.getElementById('viewerDescription');
const projectScope = document.getElementById('projectScope');
const viewerTitle = document.getElementById('viewerTitle');
const viewerCategory = document.getElementById('viewerCategory');
const viewerYear = document.getElementById('viewerYear');
const viewerIndex = document.getElementById('viewerIndex');
const pagination = document.querySelector('.project-pagination');
let activeProject = -1;
let projectDetailOpen = false;
let projectDetailTrigger = null;
let overviewScrollTop = 0;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches;

function setBackgroundInert(value) {
  document.querySelectorAll('body > header, body > main, body > footer, .skip-link').forEach(el => el.inert = value);
}
function openProjectDetail(trigger) {
  projectDetailTrigger = trigger;
  overviewScrollTop = modalDialog.scrollTop;
  projectDetailOpen = true;
  currentModalTitle = trigger.dataset.projectDetail;
  const media = trigger.closest('.overview-item').querySelector('.overview-image');
  const source = media.querySelector('img,video source,video[src]');
  modalDynamicBody.querySelectorAll('video').forEach(video => video.pause());
  currentModalImages = (trigger.dataset.detailImages || source.getAttribute('src')).split('|').map(src => src.trim()).filter(Boolean);
  // A project thumbnail is never a gallery page, even if accidentally listed.
  if (trigger.dataset.detailType === 'cardnews') currentModalImages = currentModalImages.filter(src => src !== trigger.dataset.detailThumbnail);
  currentModalIndex = 0;
  projectDetailTitle.textContent = currentModalTitle;
  const type = trigger.dataset.detailType || (media.classList.contains('team-cardnews') ? 'cardnews' : media.querySelector('video') ? 'reel' : 'guide');
  detailViewer.className = `detail-viewer detail-viewer--${type}`;
  detailViewer.append(projectDetailToolbar, projectGallery);
  if (type === 'cardnews') {
    cardnewsInfo.replaceChildren(document.getElementById('projectCardnewsInfoTemplate').content.cloneNode(true));
    ['title', 'description', 'tools', 'author'].forEach(field => {
      const key = `detail${field[0].toUpperCase()}${field.slice(1)}`;
      cardnewsInfo.querySelector(`[data-field="${field}"]`).textContent = trigger.dataset[key] || '';
    });
    const tags = cardnewsInfo.querySelector('[data-list="keywords"]');
    cardnewsInfo.querySelector('[data-field="tools"]').replaceChildren(createProjectToolList(trigger.closest('[data-project-tools]')?.dataset.projectTools || trigger.dataset.detailTools || ''));
    (trigger.dataset.detailKeywords || '').split('·').filter(Boolean).forEach(word => {
      const tag = document.createElement('span'); tag.textContent = word.trim(); tags.append(tag);
    });
    cardnewsContent.replaceChildren(projectGallery, cardnewsInfo);
    detailViewer.append(cardnewsContent);
  }
  detailLightbox.hidden = false;
  modalDialog.inert = true;
  modal.setAttribute('role', 'presentation');
  modal.removeAttribute('aria-modal');
  projectDetailToolbar.hidden = false;
  projectGallery.hidden = false;
  setModalGalleryMode('cardnews', currentModalImages.length);
  renderModalThumbs(currentModalImages.length > 1 ? currentModalImages : [], currentModalTitle);
  renderModalHeroByIndex(0);
  detailViewer.scrollTop = 0;
  document.getElementById('backToOverview').focus({preventScroll:true});
  applyMediaPreference();
}
function returnToProjectOverview() {
  modalHeroMedia.querySelectorAll('video').forEach(video => video.pause());
  modalHeroMedia.replaceChildren();
  modalThumbs.replaceChildren();
  projectDetailOpen = false;
  projectGallery.hidden = true;
  projectDetailToolbar.hidden = true;
  modalDialog.insertBefore(projectDetailToolbar, modalDynamicBody);
  modalDialog.insertBefore(projectGallery, modalDynamicBody);
  cardnewsContent.remove();
  detailLightbox.hidden = true;
  modalDialog.inert = false;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modalDialog.scrollTop = overviewScrollTop;
  projectDetailTrigger?.focus({preventScroll:true});
}
document.getElementById('backToOverview').addEventListener('click', returnToProjectOverview);
modalDynamicBody.addEventListener('click', event => {
  const trigger = event.target.closest('[data-project-detail]');
  if (trigger && activeProject >= 0) openProjectDetail(trigger);
});
function openProject(index, trigger) {
  activeProject = (index + projectRows.length) % projectRows.length;
  const row = projectRows[activeProject];
  modal.classList.toggle('theme-seamood', activeProject === 0);
  modal.classList.toggle('theme-select-busan', activeProject === 1);
  if (trigger) lastFocusedElement = trigger;
  viewerTitle.textContent = row.querySelector('.project-name').textContent;
  if (activeProject === 1) {
    const selectWord = document.createElement('span');
    selectWord.className = 'select-word';
    selectWord.textContent = 'SELECT';
    const busanWord = document.createElement('span');
    busanWord.className = 'busan-word';
    ['navy', 'coral', 'yellow', 'teal', 'navy'].forEach((color, index) => {
      const letter = document.createElement('span');
      letter.className = `busan-letter ${color}`;
      letter.textContent = 'BUSAN'[index];
      busanWord.append(letter);
    });
    viewerTitle.replaceChildren(selectWord, document.createTextNode(' '), busanWord);
  }
  const template = document.getElementById(row.dataset.details);
  viewerDescription.textContent = row.querySelector('.project-description').textContent;
  viewerDescription.hidden = false;
  viewerCategory.textContent = `${row.querySelector('.project-year').textContent} · ${template.dataset.meta}`;
  viewerYear.textContent = '';
  viewerYear.hidden = true;
  projectScope.textContent = activeProject === 1
    ? '01 PROJECT OVERVIEW  /  02 MY WORK  /  03 PROJECT GUIDES  /  04 TEAM ARCHIVE'
    : '01 BRAND IDENTITY  /  02 MOCKUP  /  03 WEB GUIDE  /  04 WEBSITE  /  05 SOCIAL CONTENT';
  projectScope.hidden = false;
  viewerIndex.textContent = activeProject === 0 ? 'PERSONAL PROJECT' : 'TEAM PROJECT';
  document.getElementById('projectCount').textContent = `${activeProject + 1} / ${projectRows.length}`;
  modal.querySelectorAll('video').forEach(video => video.pause());
  currentModalImages = [];
  currentModalTitle = viewerTitle.textContent;
  currentModalIndex = 0;
  modalHeroMedia.replaceChildren();
  renderModalThumbs([], currentModalTitle);
  setModalGalleryMode('default', 1);
  projectDetailOpen = false;
  projectDetailTrigger = null;
  projectDetailToolbar.hidden = true;
  projectGallery.hidden = true;
  modalDynamicBody.hidden = false;
  pagination.hidden = false;
  modalDynamicBody.replaceChildren(template.content.cloneNode(true));
  modalDynamicBody.querySelectorAll('[data-project-tools]').forEach(item => {
    const list = createProjectToolList(item.dataset.projectTools);
    if (item.matches('.overview-item')) item.querySelector('.overview-item-footer').prepend(list);
    else item.replaceChildren(list);
  });
  // The media and its text action share the same detail data or external URL.
  modalDynamicBody.querySelectorAll('.overview-item').forEach(item => {
    const media = item.querySelector('.overview-image');
    const action = item.querySelector('.overview-action');
    if (!media || !action) return;
    const control = document.createElement(action.matches('a[href]') ? 'a' : 'button');
    control.className = `${media.className} project-media-action`;
    control.setAttribute('aria-label', `${item.querySelector('h3,h4')?.textContent || '작업'} ${action.matches('a') ? '웹사이트 새 탭에서 열기' : '상세 보기'}`);
    if (action.matches('a[href]')) {
      control.href = action.href;
      control.target = '_blank';
      control.rel = 'noopener noreferrer';
    } else {
      control.type = 'button';
      Object.assign(control.dataset, action.dataset);
    }
    control.append(...media.childNodes);
    control.querySelectorAll('video').forEach(video => { video.controls = false; video.tabIndex = -1; });
    media.replaceWith(control);
  });
  modal.classList.add('is-project');
  modal.inert = false;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalClose.focus({preventScroll:true});
  setBackgroundInert(true);
  modalDialog.scrollTop = 0;
}
function archiveOpen(card) {
  if (card.closest('.slider-track')?._dragState?.suppressClick) return;
  activeProject = -1;
  modal.classList.remove('is-project', 'theme-seamood', 'theme-select-busan');
  projectDetailOpen = false;
  projectDetailToolbar.hidden = true;
  projectGallery.hidden = false;
  modalDynamicBody.hidden = false;
  viewerDescription.hidden = true;
  projectScope.hidden = true;
  viewerYear.hidden = false;
  pagination.hidden = true;
  viewerTitle.textContent = card.dataset.modalTitle;
  viewerCategory.textContent = card.dataset.modalRole;
  viewerYear.textContent = '2026';
  viewerIndex.textContent = 'VISUAL ARCHIVE';
  openModal(card);
  applyMediaPreference();
  modalDialog.scrollTop = 0;
}
document.querySelectorAll('[data-project-open]').forEach(button => button.addEventListener('click', () => openProject(Number(button.dataset.projectOpen), button)));
document.getElementById('prevProject').addEventListener('click', () => openProject(activeProject - 1));
document.getElementById('nextProject').addEventListener('click', () => openProject(activeProject + 1));
document.querySelectorAll('.archive-item').forEach(card => {
  card.setAttribute('aria-label', `${card.dataset.modalTitle} 상세 보기`);
  card.addEventListener('click', () => archiveOpen(card));

});
modalClose.addEventListener('click', closeModal);
modalPrev.addEventListener('click', () => {stepModalSlide(-1); applyMediaPreference();});
modalNext.addEventListener('click', () => {stepModalSlide(1); applyMediaPreference();});
modalHeroMedia.addEventListener('touchstart', event => {modalTouchStartX = event.touches[0].clientX; modalTouchDeltaX = 0; modalTouchStartY = event.touches[0].clientY; modalTouchDeltaY = 0;}, {passive:true});
modalHeroMedia.addEventListener('touchmove', event => {modalTouchDeltaX = event.touches[0].clientX - modalTouchStartX; modalTouchDeltaY = event.touches[0].clientY - modalTouchStartY;}, {passive:true});
modalHeroMedia.addEventListener('touchend', () => {if (Math.abs(modalTouchDeltaX) > 50 && Math.abs(modalTouchDeltaX) > Math.abs(modalTouchDeltaY)) stepModalSlide(modalTouchDeltaX < 0 ? 1 : -1); applyMediaPreference();});
window.addEventListener('keydown', event => {
  if (!modal.classList.contains('is-open')) return;
  if (event.key === 'Escape') {event.preventDefault(); if (projectDetailOpen) returnToProjectOverview(); else closeModal();}
  if ((activeProject < 0 || projectDetailOpen) && event.key === 'ArrowLeft') {stepModalSlide(-1); applyMediaPreference();}
  if ((activeProject < 0 || projectDetailOpen) && event.key === 'ArrowRight') {stepModalSlide(1); applyMediaPreference();}
  if (event.key === 'Tab') {
    const focusable = [...(projectDetailOpen ? detailViewer : modalDialog).querySelectorAll('button,a[href],[tabindex="0"],video[controls]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  }
});
// One motion preference for both ambient films and optional archive hover playback.
function applyMediaPreference() {
  document.querySelectorAll('video').forEach(video => {
    if (video.closest('.project-team-archive,.overview-image')) {
      video.autoplay = false;
      video.controls = !video.closest('.project-media-action');
      if (motionPaused) video.pause();
      return;
    }
    if (motionPaused) {video.pause(); video.autoplay = false; video.controls = !video.closest('.archive-item');}
    else {
      video.controls = !!video.closest('.modal');
      if (video.closest('.hero,.profile-film,.modal.is-open')) {video.autoplay = true; video.play().catch(() => {});}
    }
  });
}
motionPreference.addEventListener('change', event => {motionPaused = event.matches; applyMediaPreference();});
applyMediaPreference();
document.querySelectorAll('.archive-item video').forEach(video => {
  const card = video.closest('.archive-item');
  card.addEventListener('mouseenter', () => {if (!motionPaused) video.play().catch(() => {});});
  card.addEventListener('mouseleave', () => video.pause());
  card.addEventListener('focus', () => {if (!motionPaused) video.play().catch(() => {});});
  card.addEventListener('blur', () => video.pause());
});
// Compact mobile menu; closed links are removed from the keyboard sequence by CSS.
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.getElementById('primaryNav');
// A single decorative bar follows the existing aria-current state.
const navIndicator = document.createElement('span');
navIndicator.className = 'nav-indicator';
navIndicator.setAttribute('aria-hidden', 'true');
navLinks.append(navIndicator);
const desktopHover = matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
let previewNavLink = null;
let observedSectionId = null;
const navHero = document.getElementById('hero');
function updateNavIndicator() {
  // Hero membership is independent of the header's glass threshold.
  const inHero = window.scrollY < navHero.offsetTop + navHero.offsetHeight;
  navLinks.querySelectorAll('a').forEach(link => {
    if (!inHero && link.hash === `#${observedSectionId}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const active = navLinks.querySelector('a[aria-current="location"]');
  const state = !desktopHover.matches ? 'hidden' : previewNavLink ? 'hover-preview' : active ? 'active-section' : 'hidden';
  navIndicator.dataset.state = state;
  navIndicator.classList.toggle('is-shown', state !== 'hidden');
  if (state === 'hidden') return;
  const link = state === 'hover-preview' ? previewNavLink : active;
  const width = link.offsetWidth * .7;
  navIndicator.style.setProperty('--indicator-width', `${width}px`);
  navIndicator.style.setProperty('--indicator-x', `${link.offsetLeft + (link.offsetWidth - width) / 2}px`);
}
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('mouseenter', () => {
    if (desktopHover.matches) { previewNavLink = link; updateNavIndicator(); }
  });
  link.addEventListener('focus', updateNavIndicator);
});
navLinks.addEventListener('mouseleave', () => { previewNavLink = null; updateNavIndicator(); });
navLinks.addEventListener('focusout', () => requestAnimationFrame(updateNavIndicator));
desktopHover.addEventListener('change', () => { previewNavLink = null; updateNavIndicator(); });
new ResizeObserver(updateNavIndicator).observe(navLinks);
document.fonts.ready.then(updateNavIndicator);
function setMenu(open) {
  navLinks.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.innerHTML = open ? 'CLOSE <span aria-hidden="true">−</span>' : 'MENU <span aria-hidden="true">+</span>';
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  if (matchMedia('(max-width: 760px)').matches) {
    setMenu(false);
    const target = document.querySelector(link.hash);
    target.tabIndex = -1;
    target.focus({preventScroll:true});
  }
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {setMenu(false); menuToggle.focus();}
});
document.addEventListener('click', event => {if (!siteHeader.contains(event.target)) setMenu(false);});
matchMedia('(max-width: 760px)').addEventListener('change', () => setMenu(false));
const navObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    observedSectionId = entry.target.id;
  }
  updateNavIndicator();
}, {rootMargin:'-10% 0px -55% 0px'});
document.querySelectorAll('#about,#branding,#works,#contact').forEach(section => navObserver.observe(section));

// Transparent over the film, glass after the first 30 pixels.
function updateHeader() {
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 30);
  updateNavIndicator();
}
window.addEventListener('scroll', updateHeader, {passive:true});
updateHeader();
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

// Native touch/trackpad scrolling; mouse drag and keyboard-accessible arrows.
document.querySelectorAll('.slider-track').forEach(track => {
  const state = track._dragState = {suppressClick:false, down:false};
  const controls = track.closest('.archive-row').querySelectorAll('[data-rail-step]');
  function updateArrows() {
    controls[0].disabled = track.scrollLeft <= 1;
    controls[1].disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  }
  controls.forEach(button => button.addEventListener('click', () => {
    track.scrollBy({left:Number(button.dataset.railStep) * (track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap)), behavior:motionPreference.matches?'instant':'smooth'});
  }));
  track.addEventListener('scroll', updateArrows, {passive:true});
  new ResizeObserver(updateArrows).observe(track);
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    state.down = true; state.suppressClick = false;
    state.x = event.clientX; state.left = track.scrollLeft;
  });
  track.addEventListener('pointermove', event => {
    if (!state.down) return;
    const delta = event.clientX - state.x;
    if (Math.abs(delta) > 5) {
      state.suppressClick = true; track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId); track.scrollLeft = state.left - delta;
    }
  });
  function stopDrag() {
    state.down = false; track.classList.remove('is-dragging');
    setTimeout(() => { state.suppressClick = false; }, 0);
  }
  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);
  track.addEventListener('lostpointercapture', stopDrag);
  window.addEventListener('pointerup', () => { if (state.down) stopDrag(); });
  updateArrows();
});

// Wrap only existing text nodes so text, media paths and semantic structures stay intact.
function wrapMotionText(element, className) {
  [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()).forEach(node => {
    const span = document.createElement('span');
    span.className = className;
    node.replaceWith(span);
    span.append(node);
  });
}
document.querySelectorAll('.project-open,.contact-links a').forEach(el => wrapMotionText(el, 'motion-link-text'));
document.querySelectorAll('[data-rail-step]').forEach(el => wrapMotionText(el, 'rail-arrow'));
const contactLabel = document.getElementById('contactLabel');
// Match the other numbered labels without changing its visible text.
const contactNumber = document.createElement('span');
contactNumber.textContent = contactLabel.firstChild.textContent.slice(0, 2);
contactLabel.firstChild.textContent = contactLabel.firstChild.textContent.slice(2);
contactLabel.prepend(contactNumber);

// Progressive enhancement: content is visible without JS and in reduced motion.
// Each target is observed independently, so tall mobile sections never reveal off-screen groups early.
const revealTargets = new Set();
function addReveal(selector, delay = 0) {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', `${delay}ms`);
    revealTargets.add(el);
  });
}
addReveal('.section-label');
addReveal('.about-subtitle', 60);
addReveal('.profile-film,.profile-intro', 120);
addReveal('.profile-history', 180);
addReveal('.tools-list', 240);
['.project-category','.project-title','.project-description','.project-open','.project-image'].forEach((selector, i) => addReveal(selector, i * 60));
addReveal('.archive-intro', 60);
addReveal('.archive-category', 60);
addReveal('.slider-track', 120);
addReveal('.contact-title');
addReveal('.contact-copy', 60);
addReveal('.contact-links', 120);
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, {threshold:0, rootMargin:'0px 0px -24px 0px'});
function settleReducedMotion() {
  if (!motionPreference.matches) return;
  revealTargets.forEach(el => el.classList.add('is-visible'));
  revealObserver.disconnect();
}
revealTargets.forEach(el => revealObserver.observe(el));
settleReducedMotion();
motionPreference.addEventListener('change', settleReducedMotion);
// Keyboard navigation must never land on an invisible control.
document.addEventListener('focusin', event => {
  for (let el = event.target; el; el = el.parentElement) {
    if (revealTargets.has(el)) { el.classList.add('is-visible'); revealObserver.unobserve(el); }
  }
});
