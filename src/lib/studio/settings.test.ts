import { describe, expect, it } from 'vitest';

import { customLook } from '@/lib/projector/looks';
import { DEFAULT_TEMPLATE, startingTemplate } from '@/lib/projector/template';

import { newTemplateName, templateOf, templatesFor, type CustomTemplate, type Settings } from './settings';

const template = (id: string, target: CustomTemplate['target'], name: string): CustomTemplate => ({
  id,
  target,
  name,
  template: { ...startingTemplate(target), elements: [] },
});

const settings = (customTemplates: CustomTemplate[]) => ({ customTemplates }) as Settings;

describe('the template library', () => {
  const drawn = settings([
    template('a', 'verses', 'Christmas'),
    template('b', 'verses', 'Sunday'),
    template('c', 'lyrics', 'Christmas'),
  ]);

  it('keeps each kind to itself', () => {
    expect(templatesFor(drawn, 'verses').map(row => row.name)).toEqual(['Christmas', 'Sunday']);
    expect(templatesFor(drawn, 'stream')).toEqual([]);
  });

  it('finds the one a look names', () => {
    expect(templateOf(drawn, 'verses', customLook('b'))).toBe(drawn.customTemplates[1].template);
  });

  it('sends nothing for a shipped look', () => {
    expect(templateOf(drawn, 'verses', 'plate')).toBeNull();
  });

  it('falls through when the template a look names has been deleted', () => {
    expect(templateOf(drawn, 'verses', customLook('gone'))).toBeNull();
  });

  it('reads a bare custom — a row written before the library — as the first of its kind', () => {
    expect(templateOf(drawn, 'verses', 'custom')).toBe(drawn.customTemplates[0].template);
    expect(templateOf(settings([]), 'verses', 'custom')).toBeNull();
  });

  it('names a new one past the ones already drawn, and after its own kind', () => {
    expect(newTemplateName(settings([]), 'verses')).toBe('Layout');
    expect(newTemplateName(settings([template('a', 'verses', 'Layout')]), 'verses')).toBe('Layout 2');
    expect(newTemplateName(settings([template('a', 'verses', 'Layout')]), 'stream')).toBe('Strap');
  });
});

describe('a template that has never been drawn', () => {
  it('starts from the kind it is for', () => {
    expect(startingTemplate('verses')).toBe(DEFAULT_TEMPLATE);
    expect(startingTemplate('stream')).not.toBe(DEFAULT_TEMPLATE);
  });
});
