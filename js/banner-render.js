/**
 * 首页 Banner 渲染与轮播
 */
import { BANNER_SLIDES } from './banner-data.js';

/**
 * @param {string} str
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} str
 */
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

/**
 * @param {import('./banner-data.js').BannerButton} btn
 */
function renderButton(btn) {
  if (!btn?.text || !btn?.url) return '';
  const cls =
    btn.style === 'outline-light'
      ? 'btn btn--outline btn--outline-light'
      : 'btn btn--accent';
  return `<a href="${escapeAttr(btn.url)}" class="${cls}">${escapeHtml(btn.text)}</a>`;
}

/**
 * @param {import('./banner-data.js').BannerSlide} slide
 * @param {number} index
 */
function renderSlide(slide, index) {
  const active = index === 0 ? ' is-active' : '';
  const buttons = (slide.buttons || []).map(renderButton).join('\n              ');
  return `
      <div class="hero-carousel__slide${active}">
        <div class="hero-carousel__bg" style="background-image: url('${escapeAttr(slide.image)}')"></div>
        <div class="hero-carousel__content">
          <div class="hero-carousel__text">
            ${slide.tag ? `<span class="hero-carousel__tag">${escapeHtml(slide.tag)}</span>` : ''}
            <h1 class="hero-carousel__title">${escapeHtml(slide.title || '')}</h1>
            ${slide.subtitle ? `<p class="hero-carousel__subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
            ${buttons ? `<div class="hero-carousel__actions">\n              ${buttons}\n            </div>` : ''}
          </div>
        </div>
      </div>`;
}

/**
 * 渲染首页轮播并初始化交互
 */
export function initHeroBanner() {
  const carousel = document.querySelector('.hero-carousel');
  const slides = BANNER_SLIDES.filter((slide) => slide.enabled !== false);
  if (!carousel) return;

  if (!slides.length) {
    carousel.remove();
    document.body.classList.add('no-hero-banner');
    return;
  }

  const track = carousel.querySelector('.hero-carousel__track');
  const dotsWrap = carousel.querySelector('.hero-carousel__dots');
  if (!track || !dotsWrap) return;

  track.innerHTML = slides.map(renderSlide).join('');
  dotsWrap.innerHTML = slides.map(
    (_, i) =>
      `<button type="button" class="hero-carousel__dot${i === 0 ? ' active' : ''}" aria-label="第${i + 1}张"></button>`
  ).join('');

  bindCarousel(carousel);
}

/**
 * @param {HTMLElement} carousel
 */
function bindCarousel(carousel) {
  const track = carousel.querySelector('.hero-carousel__track');
  const slides = carousel.querySelectorAll('.hero-carousel__slide');
  const dots = carousel.querySelectorAll('.hero-carousel__dot');
  const prevBtn = carousel.querySelector('.hero-carousel__arrow--prev');
  const nextBtn = carousel.querySelector('.hero-carousel__arrow--next');
  if (!track || !slides.length) return;

  let current = 0;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;

  /**
   * @param {number} index
   */
  const goTo = (index) => {
    current = (index + slides.length) % slides.length;
    const width = carousel.clientWidth;
    track.style.transform = `translateX(-${current * width}px)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
  };

  const next = () => goTo(current + 1);
  const startAuto = () => {
    clearInterval(timer);
    timer = setInterval(next, 6000);
  };

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startAuto();
    });
  });

  prevBtn?.addEventListener('click', () => {
    goTo(current - 1);
    startAuto();
  });

  nextBtn?.addEventListener('click', () => {
    next();
    startAuto();
  });

  goTo(0);
  startAuto();
  window.addEventListener('resize', () => goTo(current), { passive: true });
}
