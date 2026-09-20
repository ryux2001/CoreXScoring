import type { ChatMessage } from './types';

export type AiResponseLanguage = 'en' | 'es';

const SPANISH_MARKERS = [
  ' el ', ' la ', ' los ', ' las ', ' que ', ' para ', ' con ', ' una ', ' este ', ' esta ',
  ' quiero ', ' puedes ', ' necesito ', ' tengo ', ' dame ', ' precio ', ' comparar ', ' componente ',
  ' del ', ' tus ', ' instrucciones ', ' revela ', ' sistema ',
];

const ENGLISH_MARKERS = [
  ' the ', ' this ', ' that ', ' with ', ' from ', ' what ', ' how ', ' can ', ' want ', ' need ',
  ' show ', ' compare ', ' component ', ' price ', ' build ', ' please ',
];

function normalize(value: string): string {
  return ` ${value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

function detectTextLanguage(value: string): AiResponseLanguage | null {
  const normalized = normalize(value);
  if (!normalized.trim()) return null;

  const spanishScore = SPANISH_MARKERS.reduce((score, marker) => score + (normalized.includes(marker) ? 1 : 0), 0);
  const englishScore = ENGLISH_MARKERS.reduce((score, marker) => score + (normalized.includes(marker) ? 1 : 0), 0);

  if (spanishScore === 0 && englishScore === 0) return null;
  return spanishScore >= englishScore ? 'es' : 'en';
}

export function detectResponseLanguage(messages: ChatMessage[]): AiResponseLanguage {
  const userMessages = messages.filter((message) => message.role === 'user');
  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    const detected = detectTextLanguage(userMessages[index]?.content ?? '');
    if (detected) return detected;
  }
  return 'en';
}

export function responseLanguageInstruction(language: AiResponseLanguage): string {
  return language === 'es'
    ? 'Responde en español, el idioma del último mensaje del usuario.'
    : 'Respond in English, the language of the latest user message.';
}

export function localizedAiText(
  language: AiResponseLanguage,
  key: 'draftTitle' | 'needDetails' | 'priceFailure' | 'buildFailure' | 'priceUpdated' | 'draftUpdated',
  values: Record<string, string> = {},
): string {
  const messages: Record<typeof key, { en: string; es: string }> = {
    draftTitle: { en: 'What title would you like to give this {entity}?', es: '¿Qué título quieres ponerle a este {entity}?' },
    needDetails: { en: 'I need you to clarify some details before completing the operation.', es: 'Necesito que concretes algún dato antes de completar la operación.' },
    priceFailure: { en: 'I could not update the price evaluation: {error}', es: 'No pude actualizar la evaluación de precio: {error}' },
    buildFailure: { en: 'I could not prepare the build: {error}', es: 'No pude preparar la build: {error}' },
    priceUpdated: { en: 'I updated the evaluated price for this component.', es: 'He actualizado el precio evaluado de este componente.' },
    draftUpdated: { en: 'I updated the draft. You can ask me for more changes or tell me you want to save it.', es: 'He actualizado el borrador. Puedes pedirme más cambios o indicar que quieres guardarlo.' },
  };

  return messages[key][language].replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);
}
