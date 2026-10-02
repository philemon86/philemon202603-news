(() => {
  'use strict';
  const reader = document.querySelector('.sample-reader');
  if (!reader) return;
  const toolbar = reader.querySelector('.reading-toolbar');
  const tabs = Array.from(reader.querySelectorAll('[data-chapter]'));
  const panels = Array.from(reader.querySelectorAll('.reading-panel'));
  const modes = Array.from(reader.querySelectorAll('[data-mode]'));
  const validIds = tabs.map(tab => tab.dataset.chapter);
  toolbar.hidden = false;
  reader.classList.add('reader-enhanced');

  function showChapter(id, updateHash = false) {
    if (!validIds.includes(id)) return;
    tabs.forEach(tab => {
      const selected = tab.dataset.chapter === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      panel.hidden = panel.id !== 'read-' + id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', panel.id.replace('read-', 'tab-'));
    });
    if (updateHash) history.replaceState(null, '', '#read-' + id);
  }

  function syncChapter() {
    const requested = location.hash.replace('#read-', '');
    showChapter(validIds.includes(requested) ? requested : validIds[0]);
  }
  syncChapter();
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#read-')) syncChapter();
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showChapter(tab.dataset.chapter, true));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      showChapter(tabs[next].dataset.chapter, true);
      tabs[next].focus();
    });
  });
  modes.forEach(button => {
    button.addEventListener('click', () => {
      reader.dataset.readerMode = button.dataset.mode;
      modes.forEach(mode => mode.setAttribute('aria-pressed', String(mode === button)));
    });
  });
  document.querySelectorAll('[data-chapter-link]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showChapter(link.dataset.chapterLink, true);
      reader.closest('section').scrollIntoView({behavior: 'auto', block: 'start'});
    });
  });
  document.querySelectorAll('[data-site-lang]').forEach(link => {
    link.addEventListener('click', () => {
      const url = new URL(link.getAttribute('href'), location.href);
      url.hash = location.hash;
      link.href = url.href;
    });
  });
})();
