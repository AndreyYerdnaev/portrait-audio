import { portraits, portraitForTarget, siteRoot, targetFile } from './catalog.js';
import { checkFile } from './files.js';

const startButton = document.querySelector('#start-camera');
const siteStatus = document.querySelector('#site-status');
const stage = document.querySelector('#scanner');
const cameraStatus = document.querySelector('#camera-status');
let phase = 'idle';
let scene;
let arSystem;
let startupTimer;
let loadPromise;

function secureCameraError() {
  if (!window.isSecureContext) return 'Для камеры откройте сайт по HTTPS. На этом компьютере также подходит http://localhost:8080/.';
  if (!navigator.mediaDevices?.getUserMedia) return 'В этом браузере нет доступа к камере. Откройте ссылку в Safari на iPhone или Chrome на Android.';
  return '';
}

async function checkReadiness() {
  if (location.protocol === 'file:') {
    siteStatus.textContent = 'Сайт открыт как файл. Откройте его через локальный сервер или опубликуйте по инструкции.';
    startButton.textContent = 'Нужен адрес сайта';
    return;
  }
  const assets = [
    { label: 'Распознавание', path: 'assets/targets/targets.mind' },
    ...portraits.map((portrait) => ({ label: portrait.title, path: portrait.audio })),
  ];
  const checks = await Promise.all(assets.map(async (asset) => ({ ...asset, ...await checkFile(new URL(asset.path, siteRoot)) })));
  const list = document.querySelector('#asset-list');
  for (const check of checks) {
    const item = document.createElement('li');
    item.className = check.ok ? 'file-ok' : 'file-missing';
    const label = document.createElement('span');
    label.textContent = `${check.ok ? '✓' : '○'} ${check.label}`;
    const detail = document.createElement('small');
    detail.textContent = check.ok ? `${check.path} · доступен` : `${check.path} · ${check.reason}`;
    item.append(label, detail);
    list.append(item);
  }
  const missing = checks.filter((check) => !check.ok).length;
  if (missing) {
    siteStatus.textContent = 'Добавьте недостающие материалы и обновите страницу. Сканирование станет доступно после загрузки всех четырёх файлов.';
    startButton.textContent = 'Ожидаем материалы';
    return;
  }
  const cameraError = secureCameraError();
  siteStatus.textContent = cameraError || 'Все четыре файла доступны. Можно открыть камеру. Количество портретов в targets.mind проверится при запуске.';
  startButton.disabled = Boolean(cameraError);
  startButton.textContent = cameraError ? 'Камера недоступна' : 'Навести камеру ↗';
}

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, siteRoot).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Не загрузились библиотеки камеры. Проверьте папку assets/vendor и подключение к сайту.'));
    document.head.append(script);
  });
}

function loadLibraries() {
  loadPromise ??= (async () => {
    await loadScript('assets/vendor/aframe-1.6.0.min.js');
    await loadScript('assets/vendor/mindar-image-aframe-1.2.5.prod.js');
    if (!window.AFRAME?.systems['mindar-image-system']) throw new Error('MindAR не запустился. Обновите страницу или попробуйте другой браузер.');
  })();
  return loadPromise;
}

function releaseCamera() {
  clearTimeout(startupTimer);
  try { arSystem?.controller?.stopProcessVideo(); } catch (error) { console.warn(error); }
  for (const video of stage.querySelectorAll('video')) {
    video.pause();
    video.srcObject?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  try { arSystem?.controller?.dispose(); } catch (error) { console.warn(error); }
  arSystem?.controller?.worker?.terminate();
  scene?.pause();
}

function fail(message) {
  if (phase === 'error' || phase === 'closed' || phase === 'navigating') return;
  phase = 'error';
  cameraStatus.textContent = message;
  document.querySelector('#stop-camera').textContent = 'Вернуться и повторить';
  // arReady посылается до processVideo; остановка выполняется после его обработчика.
  queueMicrotask(releaseCamera);
}

function openPortrait(index) {
  if (phase !== 'tracking') return;
  const portrait = portraitForTarget(index);
  if (!portrait) return;
  phase = 'navigating';
  cameraStatus.textContent = `${portrait.title} распознан. Открываем аудиозапись…`;
  releaseCamera();
  window.location.assign(new URL(portrait.page, siteRoot).href);
}

async function startCamera() {
  if (phase !== 'idle') return;
  const cameraError = secureCameraError();
  if (cameraError) { siteStatus.textContent = cameraError; return; }
  phase = 'starting';
  startButton.disabled = true;
  stage.hidden = false;
  document.body.classList.add('scanning');
  cameraStatus.textContent = 'Загружаем распознавание. Затем разрешите браузеру доступ к камере.';
  startupTimer = setTimeout(() => fail('Запуск занял слишком много времени. Проверьте разрешение камеры, файл targets.mind и соединение. Вернитесь и повторите запуск.'), 90000);
  try {
    await loadLibraries();
    if (phase !== 'starting') return;
    scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('mindar-image', `imageTargetSrc: ${targetFile.href}; autoStart: false; maxTrack: 1; warmupTolerance: 8; uiLoading: no; uiScanning: no; uiError: no`);
    scene.setAttribute('renderer', 'colorManagement: true; alpha: true');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('xr-mode-ui', 'enabled: false');
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
    const camera = document.createElement('a-camera');
    camera.setAttribute('position', '0 0 0');
    camera.setAttribute('look-controls', 'enabled: false');
    camera.setAttribute('wasd-controls', 'enabled: false');
    scene.append(camera);
    for (const portrait of portraits) {
      const target = document.createElement('a-entity');
      target.setAttribute('mindar-image-target', `targetIndex: ${portrait.targetIndex}`);
      target.addEventListener('targetFound', () => openPortrait(portrait.targetIndex));
      scene.append(target);
    }
    scene.addEventListener('arReady', () => {
      if (phase !== 'starting') return;
      const count = arSystem.controller.markerDimensions.length;
      if (count !== portraits.length) {
        fail(`В targets.mind найдено изображений: ${count}. Для этого сайта нужен один файл ровно с тремя портретами в правильном порядке.`);
        return;
      }
      clearTimeout(startupTimer);
      phase = 'tracking';
      cameraStatus.textContent = 'Наведите камеру на печатный портрет';
    });
    scene.addEventListener('arError', () => fail('Не удалось включить камеру. Разрешите доступ в настройках браузера, закройте другие приложения с камерой и повторите запуск.'));
    scene.addEventListener('renderstart', () => {
      if (phase !== 'starting') return;
      arSystem = scene.systems['mindar-image-system'];
      // В закреплённой MindAR 1.2.5 start() не возвращает Promise от _startAR().
      // Оборачиваем запуск, чтобы показать ошибку файла и остановить поздно выданный поток.
      const originalStartAR = arSystem._startAR.bind(arSystem);
      arSystem._startAR = async () => {
        if (phase !== 'starting') { releaseCamera(); return; }
        try { await originalStartAR(); }
        catch (error) {
          console.error(error);
          fail('Не удалось прочитать targets.mind или запустить распознавание. Проверьте файл, обновите браузер и повторите запуск.');
        }
      };
      cameraStatus.textContent = 'Разрешите доступ к камере. Первая подготовка распознавания может занять некоторое время.';
      arSystem.start();
    }, { once: true });
    stage.prepend(scene);
  } catch (error) {
    console.error(error);
    fail(error.message || 'Не удалось запустить камеру. Вернитесь и повторите запуск.');
  }
}

startButton.addEventListener('click', startCamera);
document.querySelector('#stop-camera').addEventListener('click', () => {
  phase = 'closed';
  releaseCamera();
  location.replace(new URL('index.html', siteRoot).href);
});
window.addEventListener('pagehide', () => { phase = 'closed'; releaseCamera(); });
window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['starting', 'tracking'].includes(phase)) fail('Камера остановлена, потому что страница была свёрнута. Вернитесь и запустите её снова.');
});
window.addEventListener('unhandledrejection', (event) => {
  if (phase === 'starting') {
    console.error(event.reason);
    fail('Ошибка запуска распознавания. Проверьте targets.mind и попробуйте обновить браузер.');
  }
});
checkReadiness();
