import { portraits, siteRoot } from './catalog.js';
import { checkFile } from './files.js';

const portrait = portraits.find((item) => item.id === document.body.dataset.portrait);
const player = document.querySelector('audio');
const status = document.querySelector('#audio-status');
const directLink = document.querySelector('#audio-link');

if (portrait) {
  const audioURL = new URL(portrait.audio, siteRoot);
  document.title = `${portrait.title} · Аудиоистория`;
  document.querySelector('h1').textContent = portrait.title;
  player.addEventListener('loadedmetadata', () => {
    status.textContent = 'Запись готова. Нажмите кнопку воспроизведения.';
  });
  player.addEventListener('error', () => {
    status.textContent = 'Не удалось воспроизвести запись. Проверьте соединение и убедитесь, что файл — настоящий MP3. Можно попробовать открыть его отдельно.';
  });
  if (location.protocol === 'file:') {
    status.textContent = 'Откройте сайт через локальный сервер или по опубликованной ссылке. Порядок запуска описан в инструкции.';
  } else {
    const result = await checkFile(audioURL);
    if (result.ok) {
      player.src = audioURL.href;
      player.hidden = false;
      directLink.href = audioURL.href;
      directLink.hidden = false;
      status.textContent = 'Нажмите кнопку воспроизведения. Звук не запускается автоматически.';
    } else {
      status.textContent = `Запись пока недоступна: ${portrait.audio} — ${result.reason}. Добавьте файл по инструкции и обновите страницу.`;
    }
  }
} else {
  status.textContent = 'Не удалось определить страницу портрета. Вернитесь на главную страницу.';
}
