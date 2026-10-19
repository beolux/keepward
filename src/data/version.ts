/**
 * Build tag from the play URL (?v=…). One bundle serves every tag; behaviour
 * that is still awaiting Nick's approval is gated on its tag so ?v=night3
 * (and the bare URL) keep playing exactly as night3.
 */
function readTag(): string {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('v') ?? '';
  } catch {
    return '';
  }
}

export const BUILD_TAG = readTag();

/** survey2: Chief's Survey v1 brief (Oct 19). */
export const SURVEY_V2 = BUILD_TAG === 'survey2';
