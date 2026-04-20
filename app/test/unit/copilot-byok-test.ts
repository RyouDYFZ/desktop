import assert from 'node:assert'
import { afterEach, describe, it } from 'node:test'
import {
  encodeModelKey,
  loadBYOKProviders,
  parseModelKey,
  saveBYOKProviders,
  type IBYOKProvider,
} from '../../src/lib/copilot/byok'

const StorageKey = 'copilot-byok-providers'

const sampleProvider: IBYOKProvider = {
  id: 'p1',
  name: 'OpenAI',
  type: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  wireApi: 'completions',
  authKind: 'apiKey',
  models: [{ id: 'gpt-4o', name: 'GPT-4o', reasoningEffort: 'medium' }],
}

afterEach(() => localStorage.clear())

describe('byok storage', () => {
  it('round-trips providers through localStorage', () => {
    saveBYOKProviders([sampleProvider])
    const loaded = loadBYOKProviders()
    assert.deepStrictEqual(loaded, [sampleProvider])
  })

  it('returns an empty list when no providers have been stored', () => {
    assert.deepStrictEqual(loadBYOKProviders(), [])
  })

  it('removes the storage entry when saving an empty list', () => {
    saveBYOKProviders([sampleProvider])
    saveBYOKProviders([])
    assert.strictEqual(localStorage.getItem(StorageKey), null)
  })

  it('returns an empty list when the stored value is malformed', () => {
    localStorage.setItem(StorageKey, '{not json')
    assert.deepStrictEqual(loadBYOKProviders(), [])
  })

  it('filters out entries that fail validation', () => {
    localStorage.setItem(
      StorageKey,
      JSON.stringify([
        sampleProvider,
        { id: 'x', name: 'Bad', type: 'openai' }, // missing baseUrl, models
      ])
    )
    assert.deepStrictEqual(loadBYOKProviders(), [sampleProvider])
  })

  it('migrates legacy supportsReasoningEffort: true to a default reasoningEffort', () => {
    localStorage.setItem(
      StorageKey,
      JSON.stringify([
        {
          ...sampleProvider,
          models: [
            {
              id: 'gpt-4o',
              name: 'GPT-4o',
              supportsReasoningEffort: true,
            },
          ],
        },
      ])
    )
    const [loaded] = loadBYOKProviders()
    assert.strictEqual(loaded.models[0].reasoningEffort, 'low')
  })
})

describe('encode/parseModelKey', () => {
  it('round-trips copilot keys', () => {
    const key = { kind: 'copilot' as const, modelId: 'gpt-5-mini' }
    assert.deepStrictEqual(parseModelKey(encodeModelKey(key)), key)
  })

  it('round-trips byok keys', () => {
    const key = {
      kind: 'byok' as const,
      providerId: 'abc',
      modelId: 'llama3',
    }
    assert.deepStrictEqual(parseModelKey(encodeModelKey(key)), key)
  })

  it('treats legacy bare strings as copilot model IDs', () => {
    assert.deepStrictEqual(parseModelKey('claude-sonnet'), {
      kind: 'copilot',
      modelId: 'claude-sonnet',
    })
  })

  it('handles model IDs that contain colons', () => {
    const key = {
      kind: 'byok' as const,
      providerId: 'p',
      modelId: 'llama3:latest',
    }
    assert.deepStrictEqual(parseModelKey(encodeModelKey(key)), key)
  })

  it('falls back to an empty copilot model on a malformed BYOK key', () => {
    assert.deepStrictEqual(parseModelKey('byok:'), {
      kind: 'copilot',
      modelId: '',
    })
    assert.deepStrictEqual(parseModelKey('byok:onlyone'), {
      kind: 'copilot',
      modelId: '',
    })
  })
})
