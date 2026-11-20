// targetIndex соответствует порядку изображений при компиляции targets.mind.
// Все адреса считаются от папки сайта, включая публикацию в подпапке GitHub Pages.
export const siteRoot = new URL('../', import.meta.url);
export const targetFile = new URL('assets/targets/targets.mind', siteRoot);
export const portraits = Object.freeze([
  Object.freeze({ id: '1', targetIndex: 0, title: 'Кулагина Анастасия', page: 'portraits/1.html', audio: 'assets/audio/portrait-1.mp3' }),
  Object.freeze({ id: '2', targetIndex: 1, title: 'Барсукова', page: 'portraits/2.html', audio: 'assets/audio/portrait-2.mp3' }),
  Object.freeze({ id: '3', targetIndex: 2, title: 'Гладких Макар', page: 'portraits/3.html', audio: 'assets/audio/portrait-3.mp3' }),
]);

export function portraitForTarget(index) {
  return portraits.find((portrait) => portrait.targetIndex === index);
}
