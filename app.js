(function () {
  'use strict';

  const form         = document.getElementById('rsvpForm');
  const guestCount   = document.getElementById('guestCount');
  const guestSection = document.getElementById('guestSection');
  const guestNames   = document.getElementById('guestNamesSection');
  const nameFields   = document.getElementById('guestNameFields');
  const addGuestBtn  = document.getElementById('addGuestBtn');
  const submitBtn    = document.getElementById('submitBtn');
  const successState = document.getElementById('successState');
  const emailInput   = document.getElementById('email');
  const replyto      = document.getElementById('replyto');

  // Mirror email into hidden _replyto for Formspree
  emailInput.addEventListener('input', () => {
    replyto.value = emailInput.value;
  });

  // Show/hide guest name fields based on attending radio + count
  function updateGuestUI() {
    const attending = form.querySelector('input[name="attending"]:checked');
    const accepts = attending && attending.value === 'Joyfully Accepts';
    const count = parseInt(guestCount.value, 10);

    guestSection.style.display = accepts ? '' : 'none';
    guestNames.style.display   = (accepts && count > 1) ? '' : 'none';

    if (accepts && count > 1) {
      syncGuestNameFields(count - 1);
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
    input.type = 'text';
    input.name = `guest_${num}`;
    input.placeholder = `Guest ${num} Full Name`;
    input.autocomplete = 'off';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-guest';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove guest';
    removeBtn.addEventListener('click', () => {
      wrap.remove();
      // Sync count select down by 1
      const cur = parseInt(guestCount.value, 10);
      if (cur > 1) guestCount.value = String(cur - 1);
      reindexGuestFields();
      updateGuestUI();
    });

    wrap.appendChild(input);
    wrap.appendChild(removeBtn);
    nameFields.appendChild(wrap);
  }

  function reindexGuestFields() {
    nameFields.querySelectorAll('.guest-input-wrap').forEach((wrap, i) => {
      const input = wrap.querySelector('input');
      input.name = `guest_${i + 1}`;
      input.placeholder = `Guest ${i + 1} Full Name`;
    });
  }

  addGuestBtn.addEventListener('click', () => {
    const cur = parseInt(guestCount.value, 10);
    const next = Math.min(cur + 1, 6);
    guestCount.value = String(next);
    updateGuestUI();
  });

  form.querySelectorAll('input[name="attending"]').forEach(r =>
    r.addEventListener('change', updateGuestUI)
  );
  guestCount.addEventListener('change', updateGuestUI);

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
    el.addEventListener('blur', () => validateField(el));
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) validateField(el);
    });
  });

  function validateAttending() {
    const checked = form.querySelector('input[name="attending"]:checked');
    const err = document.getElementById('attendingError');
    if (!checked) {
      err.textContent = 'Please let us know if you can attend.';
      return false;
    }
    err.textContent = '';
    return true;
  }

  // ── Submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameOk  = validateField(document.getElementById('name'));
    const emailOk = validateField(document.getElementById('email'));
    const attendOk = validateAttending();

    if (!nameOk || !emailOk || !attendOk) {
      form.querySelector('.invalid')?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    const data = new FormData(form);

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });

      if (res.ok) {
        form.style.display = 'none';
        successState.style.display = '';
        document.getElementById('confirmedEmail').textContent = emailInput.value;
        window.scrollTo({ top: successState.offsetTop - 60, behavior: 'smooth' });
      } else {
        const json = await res.json().catch(() => ({}));
        const msg = (json.errors || []).map(e => e.message).join(', ') || 'Something went wrong. Please try again.';
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
  updateGuestUI();
})();
