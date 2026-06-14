(function () {
  'use strict';

  const form         = document.getElementById('rsvpForm');
  const guestSection = document.getElementById('guestSection');
  const guestNames   = document.getElementById('guestNamesSection');
  const nameFields   = document.getElementById('guestNameFields');
  const addGuestBtn  = document.getElementById('addGuestBtn');
  const submitBtn    = document.getElementById('submitBtn');
  const successState = document.getElementById('successState');
  const emailInput   = document.getElementById('email');
  const replyto      = document.getElementById('replyto');

  // Stepper state
  const state = { adults: 1, children: 0 };

  const adultValEl   = document.getElementById('adultVal');
  const childValEl   = document.getElementById('childVal');
  const adultInput   = document.getElementById('adultCount');
  const childInput   = document.getElementById('childCount');
  const totalEl      = document.getElementById('totalGuests');
  const totalInput   = document.getElementById('totalGuestCount');

  function updateTotals() {
    adultValEl.textContent  = state.adults;
    childValEl.textContent  = state.children;
    adultInput.value        = state.adults;
    childInput.value        = state.children;
    const total             = state.adults + state.children;
    totalEl.textContent     = total;
    totalInput.value        = total;

    // Dec buttons disabled at min
    document.querySelector('#adultStepper [data-action="dec"]').disabled  = state.adults  <= 1;
    document.querySelector('#childStepper [data-action="dec"]').disabled  = state.children <= 0;
  }

  document.getElementById('adultStepper').addEventListener('click', (e) => {
    const btn = e.target.closest('.step-btn');
    if (!btn) return;
    if (btn.dataset.action === 'inc') state.adults = Math.min(state.adults + 1, 20);
    if (btn.dataset.action === 'dec') state.adults = Math.max(state.adults - 1, 1);
    updateTotals();
    updateGuestUI();
  });

  document.getElementById('childStepper').addEventListener('click', (e) => {
    const btn = e.target.closest('.step-btn');
    if (!btn) return;
    if (btn.dataset.action === 'inc') state.children = Math.min(state.children + 1, 20);
    if (btn.dataset.action === 'dec') state.children = Math.max(state.children - 1, 0);
    updateTotals();
  });

  // Mirror email into hidden _replyto for Formspree
  emailInput.addEventListener('input', () => {
    replyto.value = emailInput.value;
  });

  function updateGuestUI() {
    const attending = form.querySelector('input[name="attending"]:checked');
    const accepts   = attending && attending.value === 'Joyfully Accepts';

    guestSection.style.display = accepts ? '' : 'none';
    guestNames.style.display   = (accepts && state.adults > 1) ? '' : 'none';

    if (accepts && state.adults > 1) {
      syncGuestNameFields(state.adults - 1);
    }
  }

  function syncGuestNameFields(needed) {
    const current = nameFields.querySelectorAll('.guest-input-wrap').length;
    if (current < needed) {
      for (let i = current; i < needed; i++) addGuestField(i + 1);
    } else if (current > needed) {
      const wraps = nameFields.querySelectorAll('.guest-input-wrap');
      for (let i = needed; i < current; i++) wraps[i].remove();
    }
  }

  function addGuestField(num) {
    const wrap = document.createElement('div');
    wrap.className = 'guest-input-wrap';

    const input = document.createElement('input');
    input.type        = 'text';
    input.name        = `guest_${num}`;
    input.placeholder = `Guest ${num} Full Name`;
    input.autocomplete = 'off';

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'btn-remove-guest';
    removeBtn.innerHTML = '×';
    removeBtn.title     = 'Remove guest';
    removeBtn.addEventListener('click', () => {
      wrap.remove();
      state.adults = Math.max(state.adults - 1, 1);
      updateTotals();
      reindexGuestFields();
      updateGuestUI();
    });

    wrap.appendChild(input);
    wrap.appendChild(removeBtn);
    nameFields.appendChild(wrap);
  }

  function reindexGuestFields() {
    nameFields.querySelectorAll('.guest-input-wrap').forEach((wrap, i) => {
      const input       = wrap.querySelector('input');
      input.name        = `guest_${i + 1}`;
      input.placeholder = `Guest ${i + 1} Full Name`;
    });
  }

  addGuestBtn.addEventListener('click', () => {
    state.adults = Math.min(state.adults + 1, 20);
    updateTotals();
    updateGuestUI();
  });

  form.querySelectorAll('input[name="attending"]').forEach(r =>
    r.addEventListener('change', updateGuestUI)
  );

  // ── Validation ──
  function validateField(input) {
    const errorEl = document.getElementById(input.id + 'Error');
    let msg = '';
    if (input.required && !input.value.trim()) {
      msg = 'This field is required.';
    } else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      msg = 'Please enter a valid email address.';
    }
    if (errorEl) errorEl.textContent = msg;
    input.classList.toggle('invalid', !!msg);
    input.classList.toggle('valid', !msg && !!input.value.trim());
    return !msg;
  }

  ['name', 'email'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('blur',  () => validateField(el));
    el.addEventListener('input', () => { if (el.classList.contains('invalid')) validateField(el); });
  });

  function validateAttending() {
    const checked = form.querySelector('input[name="attending"]:checked');
    const err     = document.getElementById('attendingError');
    if (!checked) { err.textContent = 'Please let us know if you can attend.'; return false; }
    err.textContent = '';
    return true;
  }

  // ── Submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameOk   = validateField(document.getElementById('name'));
    const emailOk  = validateField(document.getElementById('email'));
    const attendOk = validateAttending();

    if (!nameOk || !emailOk || !attendOk) {
      form.querySelector('.invalid')?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (res.ok) {
        form.style.display          = 'none';
        successState.style.display  = '';
        document.getElementById('confirmedEmail').textContent = emailInput.value;
        window.scrollTo({ top: successState.offsetTop - 60, behavior: 'smooth' });
      } else {
        const json = await res.json().catch(() => ({}));
        const msg  = (json.errors || []).map(e => e.message).join(', ') || 'Something went wrong. Please try again.';
        showFormError(msg);
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    } catch {
      showFormError('Unable to submit. Please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });

  function showFormError(msg) {
    let banner = document.getElementById('formErrorBanner');
    if (!banner) {
      banner = document.createElement('p');
      banner.id = 'formErrorBanner';
      banner.style.cssText = 'color:#c87a95;font-style:italic;font-size:.9rem;margin-bottom:12px;text-align:center;';
      submitBtn.before(banner);
    }
    banner.textContent = msg;
  }

  // Init
  updateTotals();
  updateGuestUI();
})();
