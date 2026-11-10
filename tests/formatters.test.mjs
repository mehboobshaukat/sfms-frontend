import test from 'node:test';
import assert from 'node:assert/strict';
import { configureCurrency, formatCurrency, getCurrency } from '../src/lib/formatters.js';

test('legacy backend account displays PKR rather than hard-coded USD', () => {
  configureCurrency(null);
  assert.equal(formatCurrency(1000), 'Rs 1,000.00');
});
test('US and UK account symbol are sourced from backend user', () => {
  configureCurrency({ currency_code: 'USD', currency_symbol: '$' });
  assert.equal(formatCurrency(1234.5), '$1,234.50');
  configureCurrency({ currency_code: 'GBP', currency_symbol: '£' });
  assert.equal(formatCurrency(-50), '-£50.00');
});
test('zero decimal JPY and three decimal KWD formats', () => {
  configureCurrency({ currency_code: 'JPY', currency_symbol: '¥' });
  assert.equal(formatCurrency(2400), '¥2,400');
  configureCurrency({ currency_code: 'KWD', currency_symbol: 'د.ك' });
  assert.equal(formatCurrency(12.345), 'د.ك12.345');
});
test('invalid numbers are not misleadingly shown as zero', () => {
  configureCurrency({ currency_code: 'PKR', currency_symbol: 'Rs' });
  assert.equal(formatCurrency('not a number'), '—');
});
test('profile change updates shared formatting and logout resets it', () => {
  configureCurrency({ currency_code: 'EUR', currency_symbol: '€' });
  assert.equal(getCurrency().code, 'EUR');
  configureCurrency(null);
  assert.equal(getCurrency().code, 'PKR');
});
