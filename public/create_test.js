function initCreateTestPage() {
  if (!document.getElementById('typeSelector')) return;

  const user = JSON.parse(sessionStorage.getItem('forge_user') || '{}');
  if (!user.name) { window.location.href = 'index.html'; return; }

  wireNavBar(user);

  if (!canCreate(user.position)) {
    document.getElementById('permDeniedBanner').style.display = 'flex';
    document.getElementById('formCard').style.cssText = 'opacity:0.4;pointer-events:none;';
    return;
  }

  const tcId = generateUUID();
  const now = nowISO();
  document.getElementById('displayTcId').textContent = tcId;
  document.getElementById('metaTcId').textContent = tcId;
  document.getElementById('metaCreatedBy').textContent = user.employeeId || user.name;
  document.getElementById('metaTimestamp').textContent = fmtDate(now);

  const projectSelect = document.getElementById('tc-project');
  fetch(`${API_BASE}/projects`)
    .then(r => r.json())
    .then(data => {
      if (data.success) data.projects.forEach(p => {
        const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; projectSelect.appendChild(o);
      });
    })
    .catch(() => {
      [{ id: 'PRJ-001', name: 'Project Alpha' }, { id: 'PRJ-002', name: 'Project Beta' }, { id: 'PRJ-003', name: 'Project Gamma' }]
        .forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; projectSelect.appendChild(o); });
    });

  const typeGrid = document.getElementById('typeSelector');
  let selectedType = null;
  TESTING_TYPES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'type-card'; card.dataset.type = t.id;
    card.innerHTML = `<span class="type-card-icon">${t.icon}</span><div class="type-card-name">${t.label}</div>`;
    card.addEventListener('click', () => {
      typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedType = t.id;
      document.getElementById('hint-tc-type').style.display = 'none';
      renderDynamicFields(t.id);
    });
    typeGrid.appendChild(card);
  });

  const tagWrapper = document.getElementById('tagWrapper');
  const tagInput = document.getElementById('tagInput');
  const tags = [];
  function addTag(raw) {
    const v = raw.trim().replace(/,/g, '');
    if (!v || tags.includes(v)) return;
    tags.push(v);
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${v}<button class="tag-chip-remove" title="Remove">×</button>`;
    chip.querySelector('button').addEventListener('click', () => { tags.splice(tags.indexOf(v), 1); chip.remove(); });
    tagWrapper.insertBefore(chip, tagInput);
  }
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); addTag(tagInput.value); tagInput.value = '';
    } else if (e.key === 'Backspace' && !tagInput.value && tags.length) {
      tags.pop(); tagWrapper.querySelector('.tag-chip:last-of-type')?.remove();
    }
  });
  tagWrapper.addEventListener('click', () => tagInput.focus());

  function renderDynamicFields(typeId) {
    const section = document.getElementById('dynamicSection');
    const config = DYNAMIC_FIELD_CONFIGS[typeId];
    if (!config) { section.innerHTML = ''; return; }
    let html = `<div class="dynamic-section"><div class="dynamic-section-title">⚗️ ${config.label}</div>`;
    config.fields.forEach(f => {
      const req = f.required ? `<span style="color:var(--error)"> *</span>` : '';
      const hintId = `hint-dyn-${f.id}`;
      if (f.type === 'textarea') {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><textarea id="dyn-${f.id}" class="forge-textarea" placeholder="${f.placeholder}" rows="3"></textarea><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      } else if (f.type === 'select') {
        const opts = f.options.map(o => `<option value="${o}">${o}</option>`).join('');
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><div class="select-wrapper"><select id="dyn-${f.id}" class="forge-select"><option value="">— Select —</option>${opts}</select><span class="select-arrow">▾</span></div><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      } else if (f.type === 'steps') {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><div class="steps-list" id="steps-${f.id}"><div class="step-row"><span class="step-number">1.</span><input type="text" class="step-input" placeholder="${f.placeholder}" /><button class="step-remove" title="Remove">×</button></div></div><button class="add-step-btn" data-steps-id="${f.id}">＋ Add Step</button><span class="field-hint" id="${hintId}">At least one step is required.</span></div>`;
      } else {
        html += `<div class="form-group" data-field="${f.id}"><label>${f.label}${req}</label><input type="text" id="dyn-${f.id}" class="forge-input" placeholder="${f.placeholder}" /><span class="field-hint" id="${hintId}">${f.label} is required.</span></div>`;
      }
    });
    html += '</div>';
    section.innerHTML = html;
    section.querySelectorAll('.step-remove').forEach(btn => btn.addEventListener('click', () => removeStep(btn.closest('.step-row'))));
    section.querySelectorAll('.add-step-btn').forEach(btn => btn.addEventListener('click', () => addStep(btn.dataset.stepsId)));
  }

  function addStep(sid) {
    const list = document.getElementById(`steps-${sid}`);
    const num = list.children.length + 1;
    const row = document.createElement('div'); row.className = 'step-row';
    row.innerHTML = `<span class="step-number">${num}.</span><input type="text" class="step-input" placeholder="Step ${num}…" /><button class="step-remove" title="Remove">×</button>`;
    row.querySelector('.step-remove').addEventListener('click', () => removeStep(row));
    list.appendChild(row);
    row.querySelector('input').focus();
  }

  function removeStep(row) {
    const list = row.parentElement;
    if (list.children.length <= 1) return;
    row.remove();
    list.querySelectorAll('.step-number').forEach((n, i) => { n.textContent = `${i + 1}.`; });
  }

  function collectDynamicData() {
    if (!selectedType) return { data: {}, valid: true };
    const config = DYNAMIC_FIELD_CONFIGS[selectedType];
    const dynData = {}; let valid = true;
    config.fields.forEach(f => {
      const hintEl = document.getElementById(`hint-dyn-${f.id}`);
      if (f.type === 'steps') {
        const steps = Array.from(document.querySelectorAll(`#steps-${f.id} .step-input`)).map(i => i.value.trim()).filter(Boolean);
        dynData[f.id] = steps;
        if (f.required && !steps.length) valid = false;
        if (steps.some(step => !textRules(step).valid)) {
          if (hintEl) {
            hintEl.textContent = 'Each step must contain at least 10 characters.';
            hintEl.classList.add('visible');
          }
          valid = false;
        }
      } else {
        const el = document.getElementById(`dyn-${f.id}`);
        const val = el ? el.value.trim() : '';
        dynData[f.id] = val;
        if (val) {
          if (NUMERIC_FIELDS.includes(f.id)) {
            if (!numericRules(val).valid) {
              el.classList.add('input-error');
              if (hintEl) {
                hintEl.textContent = numericRules(val).message;
                hintEl.classList.add('visible');
              }
              valid = false;
            }
          } else if (!['httpMethod', 'cvssScore'].includes(f.id)) {
            if (!textRules(val).valid) {
              el.classList.add('input-error');
              if (hintEl) {
                hintEl.textContent = textRules(val).message;
                hintEl.classList.add('visible');
              }
              valid = false;
            }
          }
        }
      }
    });
    return { data: dynData, valid };
  }

  function validateCommonFields() {
    let valid = true;
    const fields = [
      { el: document.getElementById('tc-name'), hint: document.getElementById('hint-tc-name'), msg: 'Test Case Name is required.' },
      { el: document.getElementById('tc-desc'), hint: document.getElementById('hint-tc-desc'), msg: 'Description is required.' },
      { el: document.getElementById('tc-project'), hint: document.getElementById('hint-tc-project'), msg: 'Please select a project.' },
      { el: document.getElementById('tc-priority'), hint: document.getElementById('hint-tc-priority'), msg: 'Please select a priority.' },
      { el: document.getElementById('tc-env'), hint: document.getElementById('hint-tc-env'), msg: 'Please select an environment.' },
    ];
    fields.forEach(({ el, hint, msg }) => {
      if (!el.value.trim()) { setInputState(el, hint, 'error', msg); valid = false; }
      else setInputState(el, hint, 'success');
    });
    const typeHint = document.getElementById('hint-tc-type');
    if (!selectedType) { typeHint.textContent = 'Please select a testing type.'; typeHint.style.display = 'block'; typeHint.classList.add('visible'); valid = false; }
    else { typeHint.classList.remove('visible'); typeHint.style.display = 'none'; }
    const name = document.getElementById('tc-name').value.trim();
    const desc = document.getElementById('tc-desc').value.trim();
    if (!textRules(name).valid) {
      setInputState(document.getElementById('tc-name'), document.getElementById('hint-tc-name'), 'error', 'Test Case Name must contain at least 10 characters.');
      valid = false;
    }
    if (!textRules(desc).valid) {
      setInputState(document.getElementById('tc-desc'), document.getElementById('hint-tc-desc'), 'error', 'Description must contain at least 10 characters.');
      valid = false;
    }
    return valid;
  }

  function resetForm() {
    ['tc-name', 'tc-desc', 'tc-project', 'tc-priority', 'tc-env'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    tagInput.value = ''; tags.splice(0);
    document.getElementById('tagWrapper').querySelectorAll('.tag-chip').forEach(c => c.remove());
    typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    selectedType = null;
    document.getElementById('dynamicSection').innerHTML = '';
    document.querySelectorAll('.input-error, .input-success').forEach(el => el.classList.remove('input-error', 'input-success'));
    document.querySelectorAll('.field-hint.visible').forEach(h => h.classList.remove('visible'));
  }

  document.getElementById('btnReset').addEventListener('click', () => { if (confirm('Reset all fields?')) resetForm(); });

  document.getElementById('btnSubmit').addEventListener('click', async () => {
    const commonOk = validateCommonFields();
    const dynResult = collectDynamicData();
    if (!commonOk || !dynResult.valid) { showToast('⚠ Please fix the highlighted fields.', 'error'); return; }
    const tsNow = nowISO();
    const payload = {
      testCaseId: tcId,
      testCaseName: document.getElementById('tc-name').value.trim(),
      description: document.getElementById('tc-desc').value.trim(),
      projectId: document.getElementById('tc-project').value,
      testingType: TESTING_TYPES.find(t => t.id === selectedType)?.label || selectedType,
      testingTypeId: selectedType,
      priority: document.getElementById('tc-priority').value,
      environment: document.getElementById('tc-env').value,
      tags: [...tags],
      status: 'Draft',
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      version: 1,
      createdBy: user.employeeId || user.email,
      createdByName: user.name,
      createdTimestamp: tsNow,
      updatedTimestamp: tsNow,
      dynamicData: dynResult.data || {}
    };
    const btn = document.getElementById('btnSubmit');
    setLoading(btn, true);
    try {
      const res = await fetch(`${API_BASE}/test-cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, userPosition: user.position, employeeId: user.employeeId }) });
      const data = await res.json();
      setLoading(btn, false, '＋ Create Test Case');
      if (data.success) {
        document.getElementById('formCard').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';
        document.getElementById('spTcId').textContent = tcId;
        showToast('✅ Test case saved!', 'success');
      } else {
        showToast(`✗ ${data.message}`, 'error');
      }
    } catch {
      setLoading(btn, false, '＋ Create Test Case');
      showToast('⚠ Server unreachable. Is the server running?', 'error');
    }
  });

  document.getElementById('btnCreateAnother')?.addEventListener('click', () => window.location.reload());
}

document.addEventListener('DOMContentLoaded', initCreateTestPage);
