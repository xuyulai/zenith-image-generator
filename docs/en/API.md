# API Reference

## Base URL

API endpoints after deployment:
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

## `GET /api/`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "message": "Z-Image API is running",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## `GET /api/providers`

Get all available providers.

**Response:**

```json
{
  "providers": [
    {
      "id": "gitee",
      "name": "Gitee AI",
      "requiresAuth": true,
      "authHeader": "X-API-Key"
    },
    {
      "id": "huggingface",
      "name": "HuggingFace",
      "requiresAuth": false,
      "authHeader": "X-HF-Token"
    },
    {
      "id": "modelscope",
      "name": "ModelScope",
      "requiresAuth": true,
      "authHeader": "X-MS-Token"
    }
  ]
}
```

## `GET /api/providers/:provider/models`

Get models supported by a specific provider.

**Path Parameters:**

| Parameter  | Type   | Description                                    |
| ---------- | ------ | ---------------------------------------------- |
| `provider` | string | Provider ID: `gitee`, `huggingface`, `modelscope` |

**Response:**

```json
{
  "provider": "gitee",
  "models": [
    {
      "id": "z-image-turbo",
      "name": "Z-Image Turbo",
      "features": ["fast", "high-quality"]
    }
  ]
}
```

## `GET /api/models`

Get all available models.

**Response:**

```json
{
  "models": [
    {
      "id": "z-image-turbo",
      "name": "Z-Image Turbo",
      "provider": "gitee",
      "features": ["fast", "high-quality"]
    }
  ]
}
```

## `POST /api/generate`

Unified image generation endpoint supporting multiple AI providers.

**Headers:**

```
Content-Type: application/json
X-API-Key: your-gitee-ai-api-key      # Gitee AI
X-HF-Token: your-huggingface-token    # HuggingFace (optional)
X-MS-Token: your-modelscope-token     # ModelScope (optional)
```

**Request Body:**

```json
{
  "provider": "gitee",
  "prompt": "A beautiful sunset over mountains",
  "negative_prompt": "low quality, blurry",
  "model": "z-image-turbo",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 9
}
```

**Response (Success):**

```json
{
  "imageDetails": {
    "url": "https://example.com/generated-image.png",
    "provider": "Gitee AI",
    "model": "Z-Image Turbo",
    "dimensions": "1024 x 1024 (1:1)",
    "duration": "5.2s",
    "seed": 12345,
    "steps": 9,
    "prompt": "A beautiful sunset over mountains",
    "negativePrompt": "low quality, blurry"
  }
}
```

**Response (Error):**

```json
{
  "error": "Invalid prompt",
  "code": "INVALID_PROMPT",
  "details": {
    "field": "prompt"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | API token is required |
| `AUTH_INVALID` | 401 | Invalid API token |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | API quota exceeded |
| `INVALID_PROMPT` | 400 | Invalid prompt |
| `INVALID_DIMENSIONS` | 400 | Invalid width/height |
| `PROVIDER_ERROR` | 502 | Upstream provider error |
| `TIMEOUT` | 504 | Request timed out |

**Parameters:**

| Field                 | Type   | Required | Default         | Description                         |
| --------------------- | ------ | -------- | --------------- | ----------------------------------- |
| `provider`            | string | No       | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | Yes      | -               | Image description (max 10000 chars) |
| `negativePrompt`      | string | No       | `""`            | What to avoid (or use `negative_prompt`) |
| `model`               | string | No       | `z-image-turbo` | Model name                          |
| `width`               | number | No       | `1024`          | Image width (256-2048)              |
| `height`              | number | No       | `1024`          | Image height (256-2048)             |
| `steps`               | number | No       | `9`             | Generation steps (1-50), or use `num_inference_steps` |
| `seed`                | number | No       | random          | Random seed for reproducibility     |
| `guidanceScale`       | number | No       | -               | Guidance scale, controls prompt influence on output |

## Providers

### Gitee AI
- **Header**: `X-API-Key`
- **Models**: `z-image-turbo`
- **Get API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **Header**: `X-HF-Token` (optional, rate limited without token)
- **Models**: `flux-schnell`, `stable-diffusion-3.5-large`
- **Get Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **Header**: `X-MS-Token`
- **Models**: `flux-schnell`
- **Get Token**: [modelscope.cn](https://modelscope.cn)

## `POST /api/generate-hf` (Legacy)

HuggingFace-specific endpoint (backward compatible).

**Headers:**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token (optional)
```

## `POST /api/upscale`

Upscale an image 4x using RealESRGAN.

**Request Body:**

```json
{
  "url": "https://example.com/image.png",
  "scale": 4
}
```

## Usage Examples

### cURL

```bash
# Gitee AI
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "provider": "gitee",
    "prompt": "a cute cat",
    "width": 1024,
    "height": 1024
  }'

# HuggingFace
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-HF-Token: your-hf-token" \
  -d '{
    "provider": "huggingface",
    "model": "flux-schnell",
    "prompt": "a cute cat"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://your-project.pages.dev/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-gitee-api-key',
  },
  body: JSON.stringify({
    provider: 'gitee',
    prompt: 'a beautiful landscape',
    width: 1024,
    height: 1024,
  }),
});

const data = await response.json();
console.log(data.imageDetails.url);
```

### Python

```python
import requests

response = requests.post(
    'https://your-project.pages.dev/api/generate',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-gitee-api-key',
    },
    json={
        'provider': 'gitee',
        'prompt': 'a beautiful landscape',
        'width': 1024,
        'height': 1024,
    }
)

data = response.json()
print(data['imageDetails']['url'])
```

## Supported Aspect Ratios

| Ratio | Dimensions                             |
| ----- | -------------------------------------- |
| 1:1   | 256×256, 512×512, 1024×1024, 2048×2048 |
| 4:3   | 1152×896, 2048×1536                    |
| 3:4   | 768×1024, 1536×2048                    |
| 3:2   | 2048×1360                              |
| 2:3   | 1360×2048                              |
| 16:9  | 1024×576, 2048×1152                    |
| 9:16  | 576×1024, 1152×2048                    |

## Security

### API Key Storage

Your Gitee AI API key is stored securely in the browser using **AES-256-GCM encryption**:

- The key is encrypted before being saved to localStorage
- Encryption key is derived using PBKDF2 (100,000 iterations) from browser fingerprint
- Even if localStorage is accessed, the API key cannot be read without the same browser environment
- Changing browsers or clearing browser data will require re-entering the API key

**Implementation details** (`src/lib/crypto.ts`):

- Uses Web Crypto API (native browser cryptography)
- AES-256-GCM for authenticated encryption
- Random IV for each encryption operation
- Browser fingerprint includes: User-Agent, language, screen dimensions

**Note**: While this provides protection against casual access and XSS attacks reading raw values, for maximum security in shared environments, consider:

- Using a private/incognito window
- Clearing browser data after use
- Self-hosting with server-side API key storage

## Troubleshooting

### API Key not saving

- Make sure your browser allows localStorage
- Check if you're in private/incognito mode

### CORS errors

- For Cloudflare Pages: Should work automatically
- For separate deployments: Update `CORS_ORIGINS` in `apps/api/wrangler.toml`

### Build failures

- Ensure Node.js 18+ and pnpm 9+ are installed
- Run `pnpm install` to update dependencies
