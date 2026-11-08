import { test, expect } from '@playwright/test';
import { parseQuestionnaire, hasAnswers, questionnaireGuidance, emptyQuestionnaire, QUESTIONNAIRE_ERROR } from '../shared/questionnaire';
import { validatePdfReference, limitPdfText, MAX_PDF_TEXT_BYTES, MAX_PDF_BYTES, referenceFailure } from '../shared/referenceFiles';
import { starterComponents, starterRequest } from '../shared/starterComponents';

const pdfBytes = (body = '%PDF-1.4\n%%EOF') => new TextEncoder().encode(body);

test('questionnaire accepts known choices, normalizes colors and orders personality', () => {
  const answers = parseQuestionnaire(JSON.stringify({ theme: 'Dark', primaryColor: '#AABBCC', personality: ['Bold', 'Minimal'], notes: '  Use sentence case.  ' }));
  expect(answers.theme).toBe('Dark');
  expect(answers.primaryColor).toBe('#aabbcc');
  expect(answers.personality).toEqual(['Minimal', 'Bold']);
  expect(answers.notes).toBe('Use sentence case.');
  expect(hasAnswers(answers)).toBe(true);
  expect(hasAnswers(parseQuestionnaire(''))).toBe(false);
  expect(hasAnswers(emptyQuestionnaire())).toBe(false);
});

test('questionnaire rejects unknown keys, options, colors, duplicates and control characters', () => {
  for (const bad of [
    '{"theme":"Neon"}', '{"unknown":"x"}', '{"primaryColor":"red"}', '{"personality":["Bold","Bold"]}', '{"personality":["Gothic"]}',
    '{"audience":"a\\u0001b"}', JSON.stringify({ notes: 'x'.repeat(2001) }), '[]', 'not json', '{"theme":5}',
  ]) expect(() => parseQuestionnaire(bad), bad).toThrow(QUESTIONNAIRE_ERROR);
});

test('questionnaire answers become concrete guidance text and blanks stay blank', () => {
  const guidance = questionnaireGuidance(parseQuestionnaire(JSON.stringify({ corners: 'Rounded (8px)', primaryColor: '#123456', density: 'Compact', font: 'Inter' })));
  expect(guidance.style).toContain('Corner radius: Rounded (8px).');
  expect(guidance.colors).toBe('Primary color: #123456.');
  expect(guidance.spacing).toBe('Density: Compact.');
  expect(guidance.typography).toBe('Font family: Inter.');
  expect(guidance.accessibility).toBe('');
});

test('PDF references require PDF bytes, readable text and size limits', () => {
  expect(validatePdfReference('guide.pdf', pdfBytes(), 'Brand colors', 'design')).toBe('Brand colors');
  expect(() => validatePdfReference('guide.txt', pdfBytes(), 'x', 'design')).toThrow('Choose a PDF file (.pdf).');
  expect(() => validatePdfReference('guide.pdf', new TextEncoder().encode('hello world'), 'x', 'design')).toThrow('Choose a PDF file (.pdf).');
  expect(() => validatePdfReference('guide.pdf', pdfBytes(), '   ', 'design')).toThrow('No readable text');
  expect(() => validatePdfReference('guide.pdf', pdfBytes(), 'x'.repeat(MAX_PDF_TEXT_BYTES + 1), 'design')).toThrow('too long');
  expect(() => validatePdfReference('guide.pdf', new Uint8Array(MAX_PDF_BYTES + 1), 'x', 'design')).toThrow('at most 2 MiB');
  expect(() => validatePdfReference('../guide.pdf', pdfBytes(), 'x', 'design')).toThrow('filename');
  expect(() => validatePdfReference('guide.pdf', pdfBytes(), 'x', 'unknown')).toThrow('reference purpose');
  expect(referenceFailure(new Error('PDF files must be at most 2 MiB.'))).toBe('PDF files must be at most 2 MiB.');
});

test('extracted PDF text is cleaned and truncated within the stored limit', () => {
  expect(limitPdfText('a\u0000b  \n\n\n\nc')).toBe('a b\n\nc');
  const long = limitPdfText('é'.repeat(MAX_PDF_TEXT_BYTES));
  expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(MAX_PDF_TEXT_BYTES);
  expect(long.endsWith('[Text truncated to the first 32 KiB.]')).toBe(true);
});

test('starter catalog names are valid component names and requests are directive', () => {
  expect(starterComponents.map(item => item.name)).toEqual(['Button', 'TextInput', 'KpiCard', 'Modal']);
  for (const item of starterComponents) {
    expect(item.name).toMatch(/^[a-zA-Z0-9_-]{1,80}$/);
    const request = starterRequest(item.id);
    expect(request).toContain('generate_component_changes');
    expect(request.length).toBeLessThanOrEqual(4000);
  }
  expect(() => starterRequest('carousel')).toThrow('Unknown starter component.');
});
