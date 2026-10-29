(() => {
  fetch('/api/content').then(r => r.json()).then(({ content = {} }) => {
    document.querySelectorAll('[data-cms]').forEach(el => {
      const v = content[el.dataset.cms]; if (!v) return;
      el.textContent = '';
      v.split('\n').forEach((line, i) => {
        if (i) el.append(document.createElement('br'));
        line.split('*').forEach((part, j) => { if (j % 2) { const em = document.createElement('em'); em.textContent = part; el.append(em); } else el.append(part); });
      });
    });
  }).catch(() => {});
})();
