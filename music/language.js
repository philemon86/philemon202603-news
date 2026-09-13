/* OpenCC 1.4.2 is vendored locally; source catalogue strings remain unchanged. */
(() => {
  const convert = OpenCC.Converter({ from: 'tw', to: 'cn' });
  let language = 'zh-Hant';
  try { if (localStorage.getItem('philemon-language') === 'zh-Hans') language = 'zh-Hans'; } catch {}
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const title = document.title;
  let observer;
  const display = text => language === 'zh-Hans' ? convert(text) : text;
  function refresh() {
    observer?.disconnect();
    document.documentElement.lang = language;
    document.title = display(title);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,[data-no-convert]')) continue;
      let record = originals.get(node);
      if (!record || node.nodeValue !== record.output) record = { source: node.nodeValue };
      record.output = display(record.source);
      if (node.nodeValue !== record.output) node.nodeValue = record.output;
      originals.set(node, record);
    }
    for (const element of document.querySelectorAll('[aria-label],[placeholder],[title]')) {
      if (element.closest('[data-no-convert]')) continue;
      const records = attributes.get(element) || {};
      for (const key of ['aria-label', 'placeholder', 'title']) {
        if (!element.hasAttribute(key)) continue;
        const value = element.getAttribute(key);
        let record = records[key];
        if (!record || value !== record.output) record = { source: value };
        record.output = display(record.source);
        if (value !== record.output) element.setAttribute(key, record.output);
        records[key] = record;
      }
      attributes.set(element, records);
    }
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    observer?.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label','placeholder','title'] });
  }
  window.PhilemonLanguage = {
    text: display,
    normalize: text => convert(String(text).normalize('NFKC')).toLowerCase(),
    get current() { return language; },
    refresh
  };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.language;
    try { localStorage.setItem('philemon-language', language); } catch {}
    refresh();
  }));
  observer = new MutationObserver(refresh);
  refresh();
})();
