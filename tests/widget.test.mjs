import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(width = 1280, height = 800, org = 'customer', path = '/') {
  const elements = [];
  function element(tag) {
    const listeners = {};
    const el = { tag, style: {}, attrs: {}, children: [],
      setAttribute(k, v) { this.attrs[k] = v; },
      appendChild(child) { this.children.push(child); },
      addEventListener(k, fn) { (listeners[k] ||= []).push(fn); },
      emit(k, event) { for (const fn of listeners[k] || []) fn(event); },
      focus() {}, attachShadow() { this.shadow = element('shadow'); return this.shadow; },
    };
    if (tag === 'iframe') el.contentWindow = { postMessage(data) { el.lastMessage = data; } };
    elements.push(el);
    return el;
  }
  const window = Object.assign(element('window'), { innerWidth: width, innerHeight: height,
    location: { pathname: path }, visualViewport: Object.assign(element('viewport'), { width, height, offsetTop: 0, offsetLeft: 0 }) });
  const document = Object.assign(element('document'), { body: element('body'), createElement: element,
    currentScript: { src: 'https://widget.example/widget.js', getAttribute: k => ({ 'data-org': org, 'data-key': 'key' })[k] } });
  let appearance = { widgetColor: '#abcdef', widgetPosition: 'bottom-left' };
  let fail = false;
  const requests = [];
  let poll;
  vm.runInNewContext(source, { window, document, URL, AbortController, console: { warn() {} },
    setTimeout: () => 1, clearTimeout() {}, setInterval: fn => { poll = fn; },
    fetch: async (url, options) => { requests.push({ url, options }); if (fail) throw Error('offline'); return { ok: true, json: async () => appearance }; } });
  const button = elements.find(e => e.tag === 'button');
  const iframe = elements.find(e => e.tag === 'iframe');
  const panel = elements.find(e => e.children.includes(iframe));
  return { window, button, panel, iframe, requests, poll: () => poll(),
    save: value => { appearance = value; }, fail: () => { fail = true; },
    message: (data, trusted = true) => window.emit('message', { source: iframe.contentWindow, origin: trusted ? 'https://widget.example' : 'https://attacker.example', data }) };
}

test('saved appearance refreshes both launcher and open panel; failures retain it', async () => {
  const app = setup(); await settle();
  assert.equal(app.button.style.background, '#abcdef');
  assert.equal(app.button.style.left, '16px');
  assert.equal(app.requests[0].options.cache, 'no-store');
  assert.equal(app.requests[0].options.credentials, 'omit');
  app.button.emit('click'); await settle();
  app.save({ widgetColor: '#ff0000', widgetPosition: 'bottom-right' });
  app.poll(); await settle();
  assert.equal(app.button.style.background, '#ff0000');
  assert.equal(app.button.style.left, '1208px');
  assert.equal(app.panel.style.left, '888px');
  assert.equal(app.iframe.lastMessage.position, 'bottom-right');
  app.fail(); app.poll(); await settle();
  assert.equal(app.button.style.background, '#ff0000');
  assert.equal(app.button.style.left, '1208px');
});

test('in-app support launcher leaves room for the Chat composer after navigation', async () => {
  const app = setup(390, 844, 'hamrochatbot-support', '/dashboard/chat'); await settle();
  assert.ok(parseFloat(app.button.style.top) + 56 <= 844 - 72);
  app.window.location.pathname = '/dashboard/widget';
  app.window.emit('resize');
  assert.equal(parseFloat(app.button.style.top), 844 - 76);
});

test('visitor side choice survives refresh; untrusted messages cannot move widget', async () => {
  const app = setup(); await settle();
  app.message({ type: 'easy-re-widget-position', position: 'bottom-right' }, false);
  assert.equal(app.button.style.left, '16px');
  app.message({ type: 'easy-re-widget-position', position: 'bottom-right' });
  app.poll(); await settle();
  assert.equal(app.button.style.left, '1208px');
});

test('panel fits phones, short desktops, expanded views and keyboard viewport', async () => {
  for (const [width, height] of [[320, 568], [390, 844], [768, 500], [1440, 900]]) {
    const app = setup(width, height); await settle();
    app.button.emit('click'); await settle();
    app.message({ type: 'easy-re-widget-expand', expanded: true });
    for (const keyboard of [false, true]) {
      const v = app.window.visualViewport;
      if (keyboard) { v.height = 280; v.offsetTop = 20; v.emit('resize'); }
      assert.ok(parseFloat(app.panel.style.width) <= v.width - 24);
      assert.ok(parseFloat(app.panel.style.top) >= v.offsetTop);
      assert.ok(parseFloat(app.panel.style.top) + parseFloat(app.panel.style.height) <= v.offsetTop + v.height);
    }
    app.message({ type: 'easy-re-widget-close' });
    assert.equal(app.panel.style.display, 'none');
    assert.equal(app.button.attrs['aria-expanded'], 'false');
  }
});
