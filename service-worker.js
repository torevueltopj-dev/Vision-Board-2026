// service-worker.js - WORKER DE NOTIFICACIONES PUSH
const CACHE_NAME = 'vision-board-v1';
const API_BASE = 'https://vision-board-apk.torevueltopj.workers.dev';

// Archivos para cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// INSTALAR - Cachear recursos
self.addEventListener('install', event => {
  console.log('✅ Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando recursos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVAR - Limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH - Servir desde cache o red
self.addEventListener('fetch', event => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          console.log('📂 Sirviendo desde cache:', event.request.url);
          return response;
        }
        
        // Si no, hacer fetch y cachear para próxima vez
        console.log('🌐 Fetching desde red:', event.request.url);
        return fetch(event.request).then(response => {
          // Solo cachear respuestas exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar respuesta para cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// PUSH - Manejar notificaciones push
self.addEventListener('push', event => {
  console.log('📨 Notificación push recibida');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Vision Board 2026', body: '¡Tienes una nueva tarea!' };
  }
  
  const options = {
    body: data.body || 'Tienes una nueva tarea pendiente',
    icon: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view-task',
        title: '📝 Ver Tarea',
        icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png'
      },
      {
        action: 'dismiss',
        title: '❌ Cerrar',
        icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828666.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || '🎯 Vision Board 2026',
      options
    )
  );
});

// NOTIFICATION CLICK - Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('🖱️ Notificación clickeada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view-task') {
    // Abrir la tarea específica
    const taskId = event.notification.data?.taskId;
    const url = taskId ? `/?task=${taskId}` : '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Si ya hay una ventana abierta, enfocarla
          for (const client of windowClients) {
            if (client.url.includes('/') && 'focus' in client) {
              return client.navigate(url).then(client => client.focus());
            }
          }
          
          // Si no, abrir nueva ventana
          return clients.openWindow(url);
        })
    );
  } else if (event.action === 'dismiss') {
    // Solo cerrar
    console.log('Notificación descartada');
  } else {
    // Click en el cuerpo de la notificación
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// SYNC - Sincronización en background
self.addEventListener('sync', event => {
  console.log('🔄 Sincronización en background:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasksWithServer());
  }
});

// Función para sincronizar tareas
async function syncTasksWithServer() {
  console.log('🔄 Sincronizando tareas...');
  // Aquí iría la lógica de sincronización
}

// PERIODIC SYNC - Sincronización periódica (solo en Chrome)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-tasks') {
    console.log('⏰ Sincronización periódica');
    event.waitUntil(updateTasks());
  }
});

async function updateTasks() {
  // Lógica para actualizar tareas periódicamente
  const response = await fetch(`${API_BASE}/apk/health`);
  console.log('Estado del servidor:', await response.json());
}
