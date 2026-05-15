/* ==========================================================================
   RDKHMCH — In-page visual editor
   - Click text to edit it
   - Drag photos onto image placeholders to swap them
   - Drop PDFs/files onto certificate, notice and quick-link buttons
   - "Download edited site" exports a new self-contained HTML with everything baked in
   - All edits auto-save to your browser's localStorage
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'rdkhmch-editor-v1';

  /* ---------------- 1. Auto-tag editable regions ---------------- */
  // Image slots — selector → key prefix
  const IMG_SLOTS = [
    { sel: '.brand__crest', key: 'logo' },
    { sel: '.hero__card--main', key: 'hero-image', innerTarget: '.illust' },
    { sel: '.hero__card--seal', key: 'hero-seal' },
    { sel: '.cert__seal', key: 'cert-seal' },
    { sel: '.fac__photo', key: 'faculty-photo' },
    { sel: '.infra__img', key: 'infra-image' },
    { sel: '.g', key: 'gallery-image', innerTarget: 'svg' },
    { sel: '.map-frame', key: 'map-image', innerTarget: 'svg' }
  ];

  // Document/file link slots — selector → key prefix
  const DOC_SLOTS = [
    { sel: '.cert__link', key: 'cert-doc' },
    { sel: '.notice > a', key: 'notice-doc' },
    { sel: '.quick-grid a', key: 'quick-doc' }
  ];

  // Text-editable selectors (only leaf-ish elements with visible text)
  const TEXT_SEL = [
    'main h1', 'main h2', 'main h3', 'main h4',
    'main p', 'main blockquote', 'main li', 'main address',
    'main dd', 'main dt', 'main time', 'main figcaption',
    'main .eyebrow', 'main .stat__num', 'main .stat__lbl',
    'main .step__num', 'main .badge', 'main .course__abbr',
    'main .fac__role', 'main .fac__qual', 'main .news__tag',
    'main .notice__cat', 'main .t-card footer', 'main .hero__cardfoot strong',
    'main .hero__cardfoot span',
    'footer h5', 'footer p', 'footer li', 'footer address',
    '.brand__name', '.brand__sub',
    '.topbar__list li span', '.topbar__list li strong',
    '.topbar__meta .badge'
  ].join(',');

  // 1a. tag image slots
  IMG_SLOTS.forEach(({ sel, key, innerTarget }) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      const slotKey = `${key}-${i + 1}`;
      el.dataset.imgSlot = slotKey;
      if (innerTarget) {
        const target = el.querySelector(innerTarget);
        if (target) target.dataset.imgChild = slotKey;
      }
    });
  });

  // 1b. tag doc slots
  DOC_SLOTS.forEach(({ sel, key }) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.dataset.docSlot = `${key}-${i + 1}`;
    });
  });

  // 1c. tag text leaves with stable keys (only if they contain only text + inline)
  let txtCounter = 0;
  document.querySelectorAll(TEXT_SEL).forEach((el) => {
    // skip if descendant has block children we'd also tag
    if (el.querySelector('h1,h2,h3,h4,p,li,blockquote,figcaption,address,dd,dt')) return;
    el.dataset.textKey = 't' + (++txtCounter);
  });

  /* ---------------- 2. Load saved state & hydrate ---------------- */
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    state = {};
  }
  state.texts = state.texts || {};
  state.images = state.images || {};
  state.docs = state.docs || {};

  function applyImage(key, dataURI, alt) {
    const slot = document.querySelector(`[data-img-slot="${key}"]`);
    if (!slot) return;
    const target = slot.querySelector(`[data-img-child="${key}"]`) || slot;
    // wipe inner SVG/content; insert <img>
    target.innerHTML = `<img src="${dataURI}" alt="${alt || ''}" data-uploaded="1" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  }

  function applyDoc(key, doc) {
    const link = document.querySelector(`[data-doc-slot="${key}"]`);
    if (!link) return;
    link.href = doc.dataURI;
    if (doc.name) {
      link.setAttribute('download', doc.name);
      link.dataset.docName = doc.name;
    }
    link.dataset.docAttached = '1';
  }

  // Apply saved text
  Object.entries(state.texts).forEach(([key, html]) => {
    const el = document.querySelector(`[data-text-key="${key}"]`);
    if (el) el.innerHTML = html;
  });
  // Apply saved images
  Object.entries(state.images).forEach(([key, dataURI]) => applyImage(key, dataURI));
  // Apply saved docs
  Object.entries(state.docs).forEach(([key, doc]) => applyDoc(key, doc));

  /* ---------------- 3. Editor toolbar ---------------- */
  const toolbar = document.createElement('div');
  toolbar.className = 'edx';
  toolbar.innerHTML = `
    <button class="edx__pill" data-act="open" type="button" aria-label="Open editor">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.99-1.67Z" fill="currentColor"/></svg>
      <span>Edit site</span>
    </button>

    <div class="edx__panel" hidden>
      <div class="edx__head">
        <strong>Site editor</strong>
        <button class="edx__close" data-act="close" type="button" aria-label="Close">×</button>
      </div>

      <label class="edx__switch">
        <input type="checkbox" data-act="toggle">
        <span>Edit mode</span>
      </label>

      <p class="edx__hint">
        With edit mode <em>on</em>:
        <br>• Click any text to edit
        <br>• Drag a photo onto any image
        <br>• Drag a PDF onto any “Download / Letter” link
        <br>• Changes auto-save in this browser
      </p>

      <div class="edx__row">
        <button class="edx__btn edx__btn--primary" data-act="export" type="button">⤓ Download edited site</button>
      </div>
      <div class="edx__row">
        <button class="edx__btn" data-act="import" type="button">↑ Import edits (.html)</button>
        <input type="file" hidden data-act="importInput" accept=".html,.htm">
      </div>
      <div class="edx__row">
        <button class="edx__btn edx__btn--danger" data-act="reset" type="button">Reset all edits</button>
      </div>

      <p class="edx__foot">
        Your files stay on this device — nothing is uploaded.
        <br><span data-act="status"></span>
      </p>
    </div>
  `;
  document.body.appendChild(toolbar);

  const panel = toolbar.querySelector('.edx__panel');
  const toggleInput = toolbar.querySelector('input[data-act="toggle"]');
  const statusEl = toolbar.querySelector('[data-act="status"]');
  const importInput = toolbar.querySelector('input[data-act="importInput"]');

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? '#b34040' : '';
    if (msg) clearTimeout(setStatus._t), setStatus._t = setTimeout(() => statusEl.textContent = '', 3500);
  }

  /* ---------------- 4. Edit mode ---------------- */
  let editMode = false;
  function setEditMode(on) {
    editMode = on;
    document.body.classList.toggle('edx-on', on);
    toggleInput.checked = on;
    document.querySelectorAll('[data-text-key]').forEach((el) => {
      if (on) el.contentEditable = 'true';
      else el.removeAttribute('contenteditable');
    });
  }

  /* ---------------- 5. Save handlers ---------------- */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      setStatus('Storage full — export your work then Reset.', true);
    }
  }

  // text save on blur (capture)
  document.addEventListener('blur', (e) => {
    const el = e.target;
    if (!editMode || !el.dataset || !el.dataset.textKey) return;
    state.texts[el.dataset.textKey] = el.innerHTML.trim();
    save();
    setStatus('Saved.');
  }, true);

  /* ---------------- 6. Drag & drop ---------------- */
  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => {
    if (!editMode) return;
    if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) {
      dragDepth++;
      document.body.classList.add('edx-dragging');
    }
  });
  document.addEventListener('dragleave', () => {
    if (!editMode) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove('edx-dragging');
  });
  document.addEventListener('dragover', (e) => {
    if (!editMode) return;
    if (e.target.closest('[data-img-slot], [data-doc-slot]')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });
  document.addEventListener('drop', (e) => {
    if (!editMode) return;
    dragDepth = 0;
    document.body.classList.remove('edx-dragging');
    const imgSlot = e.target.closest('[data-img-slot]');
    const docSlot = e.target.closest('[data-doc-slot]');
    if (!imgSlot && !docSlot) return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 8) {
      if (!confirm(`This file is ${sizeMB.toFixed(1)} MB. Browsers limit total stored data to ~5 MB; very large files may not save. Continue?`)) return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURI = ev.target.result;
      if (imgSlot) {
        const key = imgSlot.dataset.imgSlot;
        state.images[key] = dataURI;
        applyImage(key, dataURI, file.name);
        setStatus(`Image “${file.name}” attached.`);
      } else {
        const key = docSlot.dataset.docSlot;
        state.docs[key] = { name: file.name, dataURI };
        applyDoc(key, state.docs[key]);
        setStatus(`File “${file.name}” attached.`);
      }
      save();
    };
    reader.onerror = () => setStatus('Could not read file.', true);
    if (imgSlot && !/^image\//.test(file.type)) {
      setStatus('That slot expects an image (JPG/PNG/SVG/WebP).', true);
      return;
    }
    reader.readAsDataURL(file);
  });

  /* ---------------- 7. Toolbar actions ---------------- */
  toolbar.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
    if (!act) return;
    if (act === 'open')   { panel.hidden = false;  toolbar.classList.add('edx--open'); }
    if (act === 'close')  { panel.hidden = true;   toolbar.classList.remove('edx--open'); }
    if (act === 'export') exportHTML();
    if (act === 'import') importInput.click();
    if (act === 'reset') {
      if (confirm('Clear all your edits? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    }
  });
  toggleInput.addEventListener('change', () => setEditMode(toggleInput.checked));

  /* ---------------- 8. Export ---------------- */
  function exportHTML() {
    setEditMode(false);
    // clone <html>
    const clone = document.documentElement.cloneNode(true);
    // strip editor UI + any contentEditable artefacts
    clone.querySelectorAll('.edx').forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('body').forEach(b => b.classList.remove('edx-on', 'edx-dragging'));

    const html = '<!doctype html>\n' + clone.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RDKHMCH-website-edited.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Downloaded.');
  }

  /* ---------------- 9. Import ---------------- */
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const newState = { texts: {}, images: {}, docs: {} };

      doc.querySelectorAll('[data-text-key]').forEach((el) => {
        newState.texts[el.dataset.textKey] = el.innerHTML.trim();
      });
      doc.querySelectorAll('[data-img-slot]').forEach((slot) => {
        const img = slot.querySelector('img[data-uploaded="1"]');
        if (img && img.src) newState.images[slot.dataset.imgSlot] = img.src;
      });
      doc.querySelectorAll('[data-doc-slot]').forEach((a) => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('data:')) {
          newState.docs[a.dataset.docSlot] = {
            name: a.getAttribute('download') || a.dataset.docName || 'document',
            dataURI: href
          };
        }
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setStatus('Imported. Reloading…');
        setTimeout(() => location.reload(), 700);
      } catch (err) {
        setStatus('Imported file too large for storage.', true);
      }
    } catch (err) {
      setStatus('Could not parse file.', true);
    } finally {
      importInput.value = '';
    }
  });

  /* ---------------- 10. Keyboard shortcut ---------------- */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      panel.hidden = !panel.hidden;
      toolbar.classList.toggle('edx--open', !panel.hidden);
    }
  });
})();
