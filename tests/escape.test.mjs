import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

function escFrom(html) {
  const source = html.match(/function esc\(value\) \{[\s\S]*?\n\}/);
  assert.ok(source, 'page defines esc()');
  return new Function(`${source[0]}; return esc;`)();
}

function decode(text) {
  return text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

const PAYLOADS = [
  '<script>window.__xss=1</script>',
  '</td><img src=x onerror="window.__xss=1">',
  '"><svg/onload=window.__xss=1>',
  "');window.__xss=1;//",
  "' onmouseover='window.__xss=1",
  '" autofocus onfocus="window.__xss=1',
  '`-window.__xss=1-`',
  '${window.__xss=1}',
  'javascript:window.__xss=1',
  'data:text/html,<script>window.__xss=1</script>',
  'x" onerror="window.__xss=1" x="',
  '&lt;script&gt;already escaped&lt;/script&gt;',
  "O'Brien & Sons <VIP>",
];

for (const name of ['contracts.html', 'affiliate-dashboard.html', 'affiliate-portal.html']) {
  test(`${name}: esc() neutralises every payload in text and attribute positions`, () => {
    const esc = escFrom(page(name));
    for (const payload of PAYLOADS) {
      const out = esc(payload);
      assert.doesNotMatch(out, /[<>"'`]/, `markup characters survive in ${out}`);
      assert.equal(decode(out), payload, 'the escaped value still reads as the original text');
    }
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(0), '0');
  });

  test(`${name}: no template interpolation inside an inline event handler`, () => {
    const html = page(name);
    assert.doesNotMatch(html, /\son[a-z]+="[^"]*\$\{/);
  });
}

test('contracts.html: the signature is rendered only for a clean PNG data URL', () => {
  const html = page('contracts.html');
  const literal = html.match(/const SIGNATURE_PNG = (\/.*\/);/);
  assert.ok(literal, 'page defines SIGNATURE_PNG');
  const SIGNATURE_PNG = new Function(`return ${literal[1]};`)();
  assert.match(html, /SIGNATURE_PNG\.test\(c\.signature_data \|\| ''\) \? `<img/);

  assert.ok(SIGNATURE_PNG.test('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));
  for (const hostile of [
    'javascript:window.__xss=1',
    'data:image/png;base64,AAAA" onerror="window.__xss=1',
    'data:image/png;base64,AAAA"><script>window.__xss=1</script>',
    'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,',
    'data:image/png;base64,AAAA\n" onerror="x',
    ' data:image/png;base64,AAAA',
    'https://evil.example/x.png',
    'x" onerror="window.__xss=1',
  ]) {
    assert.equal(SIGNATURE_PNG.test(hostile), false, hostile);
  }
});
