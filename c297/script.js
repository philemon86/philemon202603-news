/* Reading comes first: everything remains visible if JavaScript is unavailable. */
(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 60px 0px', threshold: 0.06 });
  items.forEach(item => observer.observe(item));
  document.documentElement.classList.add('motion-ready');
  // Anchor jumps and browser page search should never land on invisible content.
  window.addEventListener('beforematch', event => event.target.closest('.reveal')?.classList.add('is-visible'));
})();
