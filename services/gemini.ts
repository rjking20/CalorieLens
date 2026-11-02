import { NutritionInfo } from '@/utils/types';
import { clamp } from '@/utils/helpers';

export const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Extracts and parses a JSON object from raw response text, handling potential code blocks.
 */
const extractJsonFromResponse = (text: string): any => {
  const trimmed = text.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try stripping markdown code fences
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(stripped);
    } catch {
      // Find JSON object via regex matching outermost braces
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Unable to extract valid JSON from Gemini response.');
    }
  }
};

/**
 * Analyze a food image using Google's Gemini 2.0 Flash Vision API.
 * Estimates calorie count, macronutrients (protein, carbs, fat), portion size, and confidence.
 *
 * @param imageBase64 Base64-encoded image string (with or without data URI prefix)
 * @param apiKey Google Gemini API Key
 * @returns Promise<NutritionInfo>
 */
export const analyzeFood = async (
  imageBase64: string,
  apiKey: string
): Promise<NutritionInfo> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is required. Please provide a valid API key.');
  }

  if (!imageBase64 || !imageBase64.trim()) {
    throw new Error('Image data is required for food analysis.');
  }

  // Sanitize base64 and detect mime type if data URI was provided
  let mimeType = 'image/jpeg';
  let cleanBase64 = imageBase64.trim();

  if (cleanBase64.startsWith('data:')) {
    const dataUriMatch = cleanBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/s);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      cleanBase64 = dataUriMatch[2];
    } else {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.substring(commaIndex + 1);
      }
    }
  }

  // Remove any whitespace or newline characters from the base64 string
  cleanBase64 = cleanBase64.replace(/\s/g, '');

  const prompt = `Analyze this food image in detail.
Identify the food or dish present in the image and provide an accurate estimation of its nutritional values.
If there are multiple food items on a plate or in the meal, provide the aggregate/combined nutritional info for the entire meal and provide a comprehensive name for the dish.

You must respond ONLY with a valid JSON object matching the following structure:
{
  "foodName": "A concise, descriptive name of the food or meal",
  "calories": 350,
  "protein": 24.5,
  "carbs": 42.0,
  "fat": 11.2,
  "servingSize": "1 medium bowl (approx. 320g)",
  "confidence": 0.88
}

Guidelines:
- "foodName": descriptive name (string)
- "calories": total estimated energy in kcal (integer or float)
- "protein": estimated protein in grams (number)
- "carbs": estimated total carbohydrates in grams (number)
- "fat": estimated total dietary fat in grams (number)
- "servingSize": human-readable estimated portion or serving size description (string)
- "confidence": confidence level in the food identification between 0.0 and 1.0 (number)

Do not include any markdown formatting, preamble, or code fences. Return only the JSON object.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const url = `${GEMINI_API_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError: any) {
    throw new Error(
      `Network error connecting to Gemini API: ${networkError?.message || 'Please check your internet connection.'}`
    );
  }

  if (!response.ok) {
    let errorDetail = `Gemini API request failed with status ${response.status} (${response.statusText})`;
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        errorDetail = errorJson.error.message;
      }
    } catch {
      // Ignore JSON parse error on non-OK response
    }
    throw new Error(errorDetail);
  }

  const responseData = await response.json();
  const candidate = responseData?.candidates?.[0];

  if (!candidate) {
    const blockReason = responseData?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(
        `The image analysis was blocked by safety filters (${blockReason}). Please try a clearer food photo.`
      );
    }
    throw new Error('No analysis candidate was returned by Gemini API. Please try again.');
  }

  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Image analysis was blocked due to safety guidelines. Please try another food picture.');
  }

  const rawText = candidate.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response. Please try again.');
  }

  const parsed = extractJsonFromResponse(rawText);

  const nutritionInfo: NutritionInfo = {
    foodName:
      typeof parsed.foodName === 'string' && parsed.foodName.trim().length > 0
        ? parsed.foodName.trim()
        : 'Unknown Food',
    calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
    protein: Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10),
    servingSize:
      typeof parsed.servingSize === 'string' && parsed.servingSize.trim().length > 0
        ? parsed.servingSize.trim()
        : '1 serving',
    confidence: clamp(Number(parsed.confidence) || 0.8, 0, 1),
  };

  return nutritionInfo;
};
