// HEAD не скачивает многомегабайтные записи при проверке готовности.
export async function checkFile(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    if (!response.ok) return { ok: false, reason: response.status === 404 ? 'файл не найден' : `ответ сервера ${response.status}` };
    if ((response.headers.get('content-type') || '').includes('text/html')) return { ok: false, reason: 'сервер вернул HTML вместо файла' };
    if (response.headers.get('content-length') === '0') return { ok: false, reason: 'файл пустой' };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.name === 'AbortError' ? 'сервер не ответил вовремя' : 'не удалось проверить; проверьте подключение' };
  } finally {
    clearTimeout(timer);
  }
}
