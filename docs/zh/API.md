# API 参考

## 基础 URL

部署后的 API 地址：
- Cloudflare Pages: `https://your-project.pages.dev/api`
- Vercel: `https://your-project.vercel.app/api`
- Netlify: `https://your-project.netlify.app/api`

## `GET /api/`

健康检查端点。

**响应：**

```json
{
  "status": "ok",
  "message": "Z-Image API is running",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## `GET /api/providers`

获取所有可用的 Provider 列表。

**响应：**

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

获取指定 Provider 支持的模型列表。

**路径参数：**

| 参数       | 类型   | 描述                                       |
| ---------- | ------ | ------------------------------------------ |
| `provider` | string | Provider ID: `gitee`, `huggingface`, `modelscope` |

**响应：**

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

获取所有可用的模型列表。

**响应：**

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

统一的图片生成接口，支持多个 AI Provider。

**请求头：**

```
Content-Type: application/json
X-API-Key: your-gitee-ai-api-key      # Gitee AI
X-HF-Token: your-huggingface-token    # HuggingFace (可选)
X-MS-Token: your-modelscope-token     # ModelScope (可选)
```

**请求体：**

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

**响应（成功）：**

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

**响应（错误）：**

```json
{
  "error": "Invalid prompt",
  "code": "INVALID_PROMPT",
  "details": {
    "field": "prompt"
  }
}
```

**错误码：**

| 错误码 | HTTP 状态码 | 描述 |
|--------|-------------|------|
| `AUTH_REQUIRED` | 401 | 需要 API Token |
| `AUTH_INVALID` | 401 | 无效的 API Token |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `QUOTA_EXCEEDED` | 429 | API 配额已用尽 |
| `INVALID_PROMPT` | 400 | 无效的提示词 |
| `INVALID_DIMENSIONS` | 400 | 无效的宽度/高度 |
| `PROVIDER_ERROR` | 502 | 上游服务错误 |
| `TIMEOUT` | 504 | 请求超时 |

**参数：**

| 字段                  | 类型   | 必填 | 默认值          | 描述                                |
| --------------------- | ------ | ---- | --------------- | ----------------------------------- |
| `provider`            | string | 否   | `gitee`         | Provider: `gitee`, `huggingface`, `modelscope` |
| `prompt`              | string | 是   | -               | 图片描述 (最多 10000 字符)          |
| `negativePrompt`      | string | 否   | `""`            | 负面提示词 (或使用 `negative_prompt`) |
| `model`               | string | 否   | `z-image-turbo` | 模型名称                            |
| `width`               | number | 否   | `1024`          | 图片宽度 (256-2048)                 |
| `height`              | number | 否   | `1024`          | 图片高度 (256-2048)                 |
| `steps`               | number | 否   | `9`             | 生成步数 (1-50)，也可使用 `num_inference_steps` |
| `seed`                | number | 否   | 随机            | 随机种子，用于复现结果              |
| `guidanceScale`       | number | 否   | -               | 引导比例，控制提示词对生成结果的影响程度 |

## Providers

### Gitee AI
- **请求头**: `X-API-Key`
- **模型**: `z-image-turbo`
- **获取 API Key**: [ai.gitee.com](https://ai.gitee.com)

### HuggingFace
- **请求头**: `X-HF-Token` (可选，无 token 有速率限制)
- **模型**: `flux-schnell`, `stable-diffusion-3.5-large`
- **获取 Token**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### ModelScope
- **请求头**: `X-MS-Token`
- **模型**: `flux-schnell`
- **获取 Token**: [modelscope.cn](https://modelscope.cn)

## `POST /api/generate-hf` (旧版)

HuggingFace 专用接口（向后兼容）。

**请求头：**

```
Content-Type: application/json
X-HF-Token: your-huggingface-token (可选)
```

## `POST /api/upscale`

使用 RealESRGAN 进行 4x 图片放大。

**请求体：**

```json
{
  "url": "https://example.com/image.png",
  "scale": 4
}
```

## 使用示例

### cURL

```bash
# Gitee AI
curl -X POST https://your-project.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gitee-api-key" \
  -d '{
    "provider": "gitee",
    "prompt": "一只可爱的猫",
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
    "prompt": "一只可爱的猫"
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
    prompt: '美丽的风景',
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
        'prompt': '美丽的风景',
        'width': 1024,
        'height': 1024,
    }
)

data = response.json()
print(data['imageDetails']['url'])
```

## 支持的宽高比

| 比例  | 尺寸                                   |
| ----- | -------------------------------------- |
| 1:1   | 256×256, 512×512, 1024×1024, 2048×2048 |
| 4:3   | 1152×896, 2048×1536                    |
| 3:4   | 768×1024, 1536×2048                    |
| 3:2   | 2048×1360                              |
| 2:3   | 1360×2048                              |
| 16:9  | 1024×576, 2048×1152                    |
| 9:16  | 576×1024, 1152×2048                    |

## 安全

### API Key 存储

您的 API Key 使用 **AES-256-GCM 加密** 安全存储在浏览器中：

- Key 在保存到 localStorage 前会被加密
- 加密密钥使用 PBKDF2 (100,000 次迭代) 从浏览器指纹派生
- 即使 localStorage 被访问，没有相同的浏览器环境也无法读取 API Key
- 更换浏览器或清除浏览器数据需要重新输入 API Key

## 故障排除

### API Key 无法保存

- 确保浏览器允许 localStorage
- 检查是否在隐私/无痕模式

### CORS 错误

- Cloudflare Pages：应自动工作
- 独立部署：更新 `apps/api/wrangler.toml` 中的 `CORS_ORIGINS`

### 构建失败

- 确保安装了 Node.js 18+ 和 pnpm 9+
- 运行 `pnpm install` 更新依赖
