export type PreviewDataState = 'data' | 'loading' | 'empty' | 'error';

const validStates: PreviewDataState[] = ['data', 'loading', 'empty', 'error'];
const queryState = new URLSearchParams(window.location.search).get('previewState');
const storedState = window.localStorage.getItem('previewState');

export const previewState: PreviewDataState = validStates.includes(queryState as PreviewDataState)
  ? (queryState as PreviewDataState)
  : validStates.includes(storedState as PreviewDataState)
    ? (storedState as PreviewDataState)
    : 'data';

export function setPreviewState(state: PreviewDataState): void {
  window.localStorage.setItem('previewState', state);
  window.location.reload();
}
