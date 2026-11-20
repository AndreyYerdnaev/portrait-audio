# Сторонние библиотеки

Библиотеки скачаны в проект 20 ноября 2026 года. Версии закреплены и совпадают с сочетанием из официального примера MindAR на момент подготовки проекта.

| Библиотека | Версия | Локальный файл | Источник | Лицензия |
|---|---|---|---|---|
| A-Frame | 1.6.0 | `assets/vendor/aframe-1.6.0.min.js` | https://aframe.io/releases/1.6.0/aframe.min.js | MIT, `assets/vendor/LICENSE-aframe.txt` |
| MindAR | 1.2.5 | `assets/vendor/mindar-image-aframe-1.2.5.prod.js` | https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js | MIT, `assets/vendor/LICENSE-mindar.txt` |

Уведомления вложенных зависимостей сохранены внутри исходных сборок. Файлы библиотек не изменены. Система не обращается к этим CDN при работе: скрипты загружаются с того же сайта.

Сканер использует API A-Frame/MindAR: `mindar-image-system`, `start`, `arReady`, `arError`, `mindar-image-target`, `targetFound`. Для обработки ошибок запуска и отмены позднего разрешения камеры обёрнут `_startAR` версии 1.2.5; число изображений берётся из `controller.markerDimensions`. При обновлении MindAR эти два обращения нужно проверить по исходному коду.
