/* Spotix — small progressive enhancements. The site works without this file:
   navigation, the FAQ (<details>), the rate card, the generic schedule and
   the inquiry form (plain POST to Formspree) all function without JS.
   No libraries: the one animation (the chosen spot resizing) uses the
   Web Animations API and is skipped when reduced motion is requested. */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNav();
    initSchedule();
    initStickyCta();
    initSpotChoice();
    initInquiryForm();
  });

  /* Header: hairline under the bar once the page has scrolled. */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* Mobile navigation disclosure. */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    var setOpen = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (!open && returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* The published monthly cycle: book by the 15th, approve the proof by the
     20th, mailed by the 1st of the following month. After the 15th, the next
     cycle is next month's. Dates are targets (Terms s.9). */
  function cycle(now) {
    var today = now || new Date();
    var open = today.getDate() <= 15;
    var y = today.getFullYear();
    var m = today.getMonth() + (open ? 0 : 1);
    return {
      deadline: new Date(y, m, 15),
      proof: new Date(y, m, 20),
      mailing: new Date(y, m + 1, 1),
      isToday: today.getDate() === 15
    };
  }
  var fmt = function (opts) { return new Intl.DateTimeFormat('en-CA', opts); };

  /* Real dates for the schedule: the deadline sentence, the step tiles and a
     weekday-aligned calendar of the booking month. Without JS the generic
     "15th / 20th / 1st" version stays. */
  function initSchedule() {
    if (!window.Intl) return;
    var c = cycle();
    var long = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
    var monthDay = fmt({ month: 'long', day: 'numeric' });

    var el = document.getElementById('next-deadline');
    if (el) {
      var date = document.createElement('strong');
      date.textContent = (c.isToday ? 'today, ' : '') + long.format(c.deadline);
      el.textContent = '';
      el.append('Next booking deadline: ', date, ', for the card mailed by ' + monthDay.format(c.mailing) + '.');
    }

    var dates = { '15th': c.deadline, '20th': c.proof, '1st': c.mailing };
    var wd = fmt({ weekday: 'short' });
    var mon = fmt({ month: 'short' });
    document.querySelectorAll('[data-step-day]').forEach(function (n) {
      var d = dates[n.getAttribute('data-step-day')];
      n.textContent = wd.format(d).replace('.', '') + ' ' + mon.format(d).replace('.', '');
    });
    document.querySelectorAll('[data-step-when]').forEach(function (n) {
      n.textContent = 'By ' + long.format(dates[n.getAttribute('data-step-when')]) + ': ';
    });

    var cal = document.getElementById('calendar');
    var days = cal && cal.querySelector('.calendar__days');
    if (!days) return;
    var month = document.getElementById('calendar-month');
    if (month) month.textContent = fmt({ month: 'long', year: 'numeric' }).format(c.deadline);
    var head = document.createElement('ol');
    head.className = 'calendar__wd';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) {
      var li = document.createElement('li'); li.textContent = d.charAt(0); head.appendChild(li);
    });
    days.parentNode.insertBefore(head, days);
    days.textContent = '';
    var y = c.deadline.getFullYear(), m = c.deadline.getMonth();
    var lead = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday-first
    var count = new Date(y, m + 1, 0).getDate();
    var cell = function (text, cls, note) {
      var li = document.createElement('li');
      li.textContent = text;
      if (cls) li.className = cls;
      if (note) { var b = document.createElement('b'); b.textContent = note; li.appendChild(b); }
      days.appendChild(li);
    };
    for (var i = 0; i < lead; i++) cell('', 'is-blank');
    for (var d = 1; d <= count; d++) {
      if (d === 15) cell(d, 'is-you', 'Book');
      else if (d === 20) cell(d, 'is-you', 'Proof');
      else cell(d);
    }
    cell(1, 'is-us is-next', 'Mailed');
    var legend = cal.querySelector('.calendar__legend span + span');
    if (legend) legend.textContent = 'Mailing, ' + monthDay.format(c.mailing);
  }

  /* Choosing a size. The rate card, the form's select, the "Your spot"
     summary in the form and the mobile bar all show the same choice. Size
     data is read from the rate card, so prices live in one place. */
  function initSpotChoice() {
    var select = document.getElementById('f-spot');
    if (!select) return;
    var sizes = {};
    document.querySelectorAll('.size[data-size]').forEach(function (li) {
      sizes[li.getAttribute('data-size')] = {
        el: li, name: li.getAttribute('data-name'),
        fraction: li.getAttribute('data-fraction'), price: li.getAttribute('data-price')
      };
    });
    var CELLS = { solo: 1, duo: 2, full: 4, custom: 8 };
    var box = document.getElementById('choice');
    var plan = document.getElementById('choice-plan');
    var when = document.getElementById('choice-when');
    var bar = document.querySelector('.sticky-cta p');
    var barDefault = bar ? bar.innerHTML : '';

    var drawPlan = function (value) {
      var before = plan.querySelector('b');
      var from = before && before.getBoundingClientRect();
      var cells = CELLS[value] || 0;
      plan.className = 'plan' + (cells ? ' plan--' + (value === 'custom' ? 'page' : value) : '');
      plan.textContent = '';
      if (cells) plan.appendChild(document.createElement('b'));
      for (var i = cells; i < 8; i++) plan.appendChild(document.createElement('i'));
      var after = plan.querySelector('b');
      // Grow or shrink the orange block from its previous size, so the
      // difference between sizes is seen, not just stated.
      if (from && after && !reduceMotion.matches && after.animate) {
        var to = after.getBoundingClientRect();
        if (to.width && to.height) {
          after.style.transformOrigin = '0 0';
          after.animate([
            { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + from.width / to.width + ',' + from.height / to.height + ')' },
            { transform: 'none' }
          ], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      }
    };

    var render = function () {
      var value = select.value;
      var s = sizes[value];
      Object.keys(sizes).forEach(function (k) {
        var on = k === value;
        sizes[k].el.classList.toggle('is-selected', on);
        var link = sizes[k].el.querySelector('[data-package]');
        if (link) { if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); }
      });
      if (plan) drawPlan(value);
      if (when) {
        var text = s ? s.fraction + '. ' : 'We’ll suggest a size when we reply. ';
        if (window.Intl) {
          var c = cycle();
          text += 'For the card mailed by ' + fmt({ month: 'long', day: 'numeric' }).format(c.mailing) +
            '. Book by ' + (c.isToday ? 'today, ' : '') + fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(c.deadline) + '.';
        }
        when.textContent = text;
      }
      if (bar) {
        if (s) {
          bar.textContent = '';
          var strong = document.createElement('strong');
          strong.textContent = s.name;
          bar.append(strong, ' ' + s.price);
        } else {
          bar.innerHTML = barDefault;
        }
      }
    };

    var choose = function (value, fromLink) {
      if (!value) return;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
          select.value = value;
          render();
          if (fromLink && box && !reduceMotion.matches) {
            box.classList.remove('is-flash');
            void box.offsetWidth;
            box.classList.add('is-flash');
          }
          return;
        }
      }
    };

    select.addEventListener('change', render);
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-package]');
      if (link) choose(link.getAttribute('data-package'), true);
    });
    render();
    choose(new URLSearchParams(window.location.search).get('spot'));
  }

  /* Mobile bar: appears after the hero, stays out of the way near the form. */
  function initStickyCta() {
    var bar = document.querySelector('.sticky-cta');
    var hero = document.querySelector('.hero');
    var inquiry = document.getElementById('inquire');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;

    var pastHero = false;
    var nearForm = false;
    var render = function () {
      var show = pastHero && !nearForm;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', String(!show));
      var link = bar.querySelector('a');
      if (link) link.tabIndex = show ? 0 : -1;
    };

    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      render();
    }).observe(hero);

    var footer = document.querySelector('.site-footer');
    var watched = [inquiry, footer].filter(Boolean);
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      nearForm = visible.size > 0;
      render();
    });
    watched.forEach(function (el) { io.observe(el); });
    render();
  }

  /* Inquiry form: inline validation and an in-page confirmation.
     Falls back to a normal POST if fetch is unavailable. */
  function initInquiryForm() {
    var form = document.getElementById('inquiry-form');
    if (!form || !window.fetch || !window.FormData) return;

    var status = document.getElementById('form-status');
    var success = document.getElementById('form-success');
    var button = form.querySelector('button[type="submit"]');
    form.setAttribute('novalidate', '');

    var messages = {
      name: 'Please enter your name.',
      email: 'Please enter an email address we can reply to, like name@business.ca.'
    };

    var check = function (field) {
      var error = document.getElementById(field.id + '-error');
      var ok = field.checkValidity();
      field.setAttribute('aria-invalid', String(!ok));
      if (error) {
        error.textContent = ok ? '' : (messages[field.name] || 'Please check this field.');
        error.classList.toggle('is-visible', !ok);
      }
      return ok;
    };

    form.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.value.trim() !== '' || field.getAttribute('aria-invalid') === 'true') check(field);
      });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') check(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.hidden = true;

      var firstInvalid = null;
      form.querySelectorAll('[required]').forEach(function (field) {
        if (!check(field) && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }
      }).catch(function () {
        button.disabled = false;
        button.textContent = label;
        if (status) {
          status.hidden = false;
          status.focus();
        }
      });
    });
  }
})();
