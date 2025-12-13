/**
 * API Client Tests
 * Tests for error message parsing and API response handling
 * @vitest-environment jsdom
 */

import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateImage, getErrorMessage, upscaleImage } from '../api'

describe('getErrorMessage', () => {
  describe('authentication errors', () => {
    it('should return user-friendly message for AUTH_REQUIRED', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.AUTH_REQUIRED,
        message: 'Token required',
        details: { provider: 'Gitee AI' },
      })
      expect(result).toContain('Gitee AI')
      expect(result).toContain('token')
    })

    it('should return generic message when provider not specified', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.AUTH_REQUIRED,
        message: 'Token required',
      })
      expect(result).toContain('API')
      expect(result).toContain('token')
    })

    it('should handle AUTH_INVALID', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.AUTH_INVALID,
        message: 'Invalid token',
        details: { provider: 'HuggingFace' },
      })
      expect(result).toContain('Invalid')
      expect(result).toContain('HuggingFace')
    })

    it('should handle AUTH_EXPIRED', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.AUTH_EXPIRED,
        message: 'Token expired',
        details: { provider: 'Gitee AI' },
      })
      expect(result).toContain('expired')
      expect(result).toContain('Gitee AI')
    })
  })

  describe('rate limit errors', () => {
    it('should handle RATE_LIMITED with retryAfter', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.RATE_LIMITED,
        message: 'Rate limited',
        details: { retryAfter: 60 },
      })
      expect(result).toContain('60 seconds')
    })

    it('should handle RATE_LIMITED without retryAfter', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.RATE_LIMITED,
        message: 'Rate limited',
      })
      expect(result).toContain('wait')
      expect(result).toContain('moment')
    })

    it('should handle QUOTA_EXCEEDED', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.QUOTA_EXCEEDED,
        message: 'Quota exceeded',
        details: { provider: 'Gitee AI' },
      })
      expect(result).toContain('quota')
      expect(result).toContain('Gitee AI')
    })
  })

  describe('validation errors', () => {
    it('should handle INVALID_PROMPT', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.INVALID_PROMPT,
        message: 'Prompt is too long',
      })
      expect(result).toBe('Prompt is too long')
    })

    it('should use default message for INVALID_PROMPT without message', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.INVALID_PROMPT,
        message: '',
      })
      expect(result).toContain('Invalid prompt')
    })
  })

  describe('provider errors', () => {
    it('should handle PROVIDER_ERROR with upstream message', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.PROVIDER_ERROR,
        message: 'Provider error',
        details: { upstream: 'Model overloaded' },
      })
      expect(result).toBe('Model overloaded')
    })

    it('should handle TIMEOUT', () => {
      const result = getErrorMessage({
        code: ApiErrorCode.TIMEOUT,
        message: 'Request timed out',
        details: { provider: 'HuggingFace' },
      })
      expect(result).toContain('timed out')
      expect(result).toContain('HuggingFace')
    })
  })

  describe('unknown errors', () => {
    it('should return message for unknown error code', () => {
      const result = getErrorMessage({
        code: undefined,
        message: 'Something went wrong',
      })
      expect(result).toBe('Something went wrong')
    })

    it('should return default message when no message provided', () => {
      const result = getErrorMessage({
        code: undefined,
        message: '',
      })
      expect(result).toContain('error occurred')
    })
  })
})

describe('generateImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return success response on successful generation', async () => {
    const mockResponse = {
      imageDetails: {
        url: 'https://example.com/image.png',
        provider: 'HuggingFace',
        model: 'z-image-turbo',
        dimensions: '1024 x 1024 (1:1)',
        duration: '5.2s',
        seed: 12345,
        steps: 9,
        prompt: 'a cat',
        negativePrompt: '',
      },
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await generateImage(
      {
        provider: 'huggingface',
        prompt: 'a cat',
        width: 1024,
        height: 1024,
      },
      {}
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageDetails.url).toBe('https://example.com/image.png')
    }
  })

  it('should return error response on API error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid prompt',
        code: 'INVALID_PROMPT',
      }),
    } as Response)

    const result = await generateImage(
      {
        provider: 'huggingface',
        prompt: '',
        width: 1024,
        height: 1024,
      },
      {}
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid prompt')
    }
  })

  it('should handle network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await generateImage(
      {
        provider: 'huggingface',
        prompt: 'a cat',
        width: 1024,
        height: 1024,
      },
      {}
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Network error')
    }
  })

  it('should include auth header for authenticated providers', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ imageDetails: { url: 'https://example.com/img.png' } }),
    } as Response)

    await generateImage(
      {
        provider: 'gitee',
        prompt: 'a cat',
        width: 1024,
        height: 1024,
      },
      { token: 'my-gitee-token' }
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'my-gitee-token',
        }),
      })
    )
  })
})

describe('upscaleImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return upscaled image URL on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://example.com/upscaled.png' }),
    } as Response)

    const result = await upscaleImage('https://example.com/original.png', 4)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.url).toBe('https://example.com/upscaled.png')
    }
  })

  it('should include HF token in headers when provided', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://example.com/upscaled.png' }),
    } as Response)

    await upscaleImage('https://example.com/original.png', 4, 'hf-token')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-HF-Token': 'hf-token',
        }),
      })
    )
  })

  it('should handle upscale error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid image URL',
        code: 'INVALID_PARAMS',
      }),
    } as Response)

    const result = await upscaleImage('invalid-url', 4)

    expect(result.success).toBe(false)
  })
})
