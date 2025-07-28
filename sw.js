const CACHE_NAME = 'minha-biblia-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css', // Se você tiver um arquivo CSS separado
  '/script.js',  // Se você tiver um arquivo JS separado (além do inline em index.html)
  '/icons/icon-192x192.png', // Certifique-se de que os ícones do manifest existam
  '/icons/icon-512x512.png'
  // Adicione aqui outros arquivos estáticos que você deseja cachear
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Falha ao cachear durante a instalação:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Para requisições da mesma origem, tente o cache primeiro, depois a rede
  // Para requisições de API (gemini), vá direto para a rede
  const url = new URL(event.request.url);

  // Excluir a API do Gemini do cache, sempre buscar da rede
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para outros recursos, tente o cache primeiro
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna a resposta do cache, se encontrada
        if (response) {
          console.log('Service Worker: Servindo do cache:', event.request.url);
          return response;
        }

        // Se não estiver no cache, busque da rede
        console.log('Service Worker: Buscando da rede:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Se a resposta da rede for válida, clone-a e adicione ao cache
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('Service Worker: Erro ao buscar da rede:', event.request.url, error);
            // Opcional: retornar uma página offline aqui se desejar
            // return caches.match('/offline.html');
          });
      })
  );
});