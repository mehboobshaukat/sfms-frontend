import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('features and how-it-works lazy routes exist in public layout', () => {
  const app = read('src/App.jsx');
  for (const [name, route] of [['Features','/features'],['HowItWorks','/how-it-works']]) {
    assert.match(app, new RegExp(`const ${name} = lazy`));
    assert.ok(app.includes(`path="${route}"`));
    assert.ok(app.includes(`element={<${name} />}`));
  }
});

test('navigation includes all five public marketing pages on desktop and mobile', () => {
  const layout = read('src/components/layout/PublicLayout.jsx');
  for (const path of ['/', '/features', '/how-it-works', '/about', '/contact']) {
    assert.ok(layout.includes(`to: "${path}"`), `missing navigation entry ${path}`);
  }
  assert.match(layout, /aria-label="Mobile navigation"/);
  assert.match(layout, /aria-expanded=\{mobileOpen\}/);
  assert.match(layout, /aria-current=/);
});

test('each new page has SEO, working sign-up, and accurate illustrations', () => {
  for (const [component, route] of [['Features','/features'],['HowItWorks','/how-it-works']]) {
    const page = read(`src/pages/public/${component}.jsx`);
    assert.ok(page.includes(`path="${route}"`));
    assert.ok(page.includes('PrimaryMarketingLink'));
    assert.ok(/Illustrative|illustrative|Sample values/.test(page));
  }
});

test('homepage links to new pages and sitemap lists both paths', () => {
  const home=read('src/pages/public/Home.jsx');
  const sitemap=read('public/sitemap.xml');
  for (const route of ['/features','/how-it-works']) {
    assert.ok(home.includes(`to="${route}"`));
    assert.ok(sitemap.includes(`<loc>https://sfms.app${route}</loc>`));
  }
});

test('marketing CTA respects authentication state', () => {
  const component = read('src/components/marketing/MarketingCTA.jsx');
  assert.ok(component.includes('isAuthenticated ? "/dashboard" : "/register"'));
});
