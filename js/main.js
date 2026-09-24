/* Spotix — small progressive enhancements. The site works without this file:
   navigation links, the FAQ (<details>), the spot-size picker (CSS :has) and
   the inquiry form (plain POST to Formspree) all function without JS. */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initNav();
    initPackageLinks();
    initStickyCta();
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

  /* "Ask about this spot" links preselect the package in the inquiry form. */
  function initPackageLinks() {
    var select = document.getElementById('f-spot');
    if (!select) return;
    var choose = function (value) {
      if (!value) return;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) { select.value = value; return; }
      }
    };
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-package]');
      if (link) choose(link.getAttribute('data-package'));
    });
    var fromUrl = new URLSearchParams(window.location.search).get('spot');
    choose(fromUrl);
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
