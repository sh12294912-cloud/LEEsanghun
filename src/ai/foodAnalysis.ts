import Anthropic from '@anthropic-ai/sdk';
import type { PreparedImage } from '../lib/image';

export const MODEL = 'claude-opus-5-5';

export interface AnalyzedFood {
  name: string;
  portion: string; // 사람이 읽는 양 (예: "1공기 (약 210g)")
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  items: AnalyzedFood[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

const num = { type: 'number' } as const;

/** Claude 응답을 이 형식의 JSON으로 강제 (structured outputs) */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'confidence', 'notes'],
  properties: {
    items: {
      type: 'array',
      description: '사진에 보이는, 실제로 먹는 음식 하나하나',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'portion', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
        properties: {
          name: { type: 'string', description: '한국어 음식 이름' },
          portion: { type: 'string', description: '눈에 보이는 양, 예: "1공기 (약 210g)"' },
          grams: num,
          kcal: num,
          protein: { type: 'number', description: 'g' },
          carbs: { type: 'number', description: 'g' },
          fat: { type: 'number', description: 'g' },
        },
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string', description: '추정 근거나 불확실한 점, 한국어 1~2문장' },
  },
} as const;

const SYSTEM = `당신은 한국 음식에 밝은 임상 영양사입니다. 사용자가 먹기 직전에 찍은 음식 사진을 보고 영양 성분을 추정합니다.

- 사진에 보이는 음식을 각각 따로 항목으로 나눕니다 (예: 밥, 국, 반찬 각각). 같은 음식이 여러 개면 하나로 합칩니다.
- 그릇·수저·손 크기 등을 기준으로 실제로 보이는 양을 추정하고, 그 양에 대한 열량과 탄수화물·단백질·지방(g)을 계산합니다.
- 소스, 기름, 드레싱처럼 열량에 크게 영향을 주는 것도 반영합니다.
- 숫자는 정수(열량) 또는 소수 첫째 자리(영양소)로 반올림합니다.
- 사용자 메모가 있으면 사진보다 메모를 우선합니다 (예: "반만 먹음").
- 음식이 보이지 않는 사진이면 items를 빈 배열로 두고 notes에 이유를 적습니다.`;

export class FoodAnalysisError extends Error {}

function clean(n: unknown, digits = 1): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export async function analyzeFoodPhoto(
  apiKey: string,
  image: PreparedImage,
  hint?: string,
): Promise<FoodAnalysis> {
  // 개인용 앱: 키는 사용자의 브라우저에만 저장되고 Anthropic API로 직접 요청함
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // 안전 분류기가 거절하면 서버에서 다른 모델로 재시도
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            {
              type: 'text',
              text: hint?.trim()
                ? `이 음식의 영양 성분을 분석해 주세요.\n사용자 메모: ${hint.trim()}`
                : '이 음식의 영양 성분을 분석해 주세요.',
            },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new FoodAnalysisError('Claude API 키가 올바르지 않습니다. 설정에서 확인해 주세요.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new FoodAnalysisError('이 API 키로는 사용할 수 없습니다. Console에서 키 권한을 확인해 주세요.');
    if (e instanceof Anthropic.RateLimitError) throw new FoodAnalysisError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    if (e instanceof Anthropic.BadRequestError) throw new FoodAnalysisError(`요청 오류: ${e.message} (크레딧 잔액이 부족해도 이 오류가 납니다)`);
    if (e instanceof Anthropic.APIConnectionError) throw new FoodAnalysisError('네트워크에 연결할 수 없습니다.');
    if (e instanceof Anthropic.APIError) throw new FoodAnalysisError(`Claude API 오류 (${e.status ?? '알 수 없음'}). 잠시 후 다시 시도해 주세요.`);
    throw e;
  }

  if (response.stop_reason === 'refusal') throw new FoodAnalysisError('이 사진은 분석할 수 없습니다.');
  if (response.stop_reason === 'max_tokens') throw new FoodAnalysisError('응답이 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.');

  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let raw: FoodAnalysis;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new FoodAnalysisError('분석 결과를 읽을 수 없습니다. 다시 시도해 주세요.');
  }

  return {
    confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    items: (Array.isArray(raw.items) ? raw.items : []).map((it) => ({
      name: String(it.name ?? '음식'),
      portion: String(it.portion ?? ''),
      grams: clean(it.grams, 0),
      kcal: clean(it.kcal, 0),
      protein: clean(it.protein),
      carbs: clean(it.carbs),
      fat: clean(it.fat),
    })),
  };
}
