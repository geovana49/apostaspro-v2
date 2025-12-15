// Force clear all caches and reload
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
        }
    });
}

if ('caches' in window) {
    caches.keys().then(function (names) {
        for (let name of names) {
            caches.delete(name);
        }
    });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

alert('Cache limpo! A página será recarregada.');
window.location.reload(true);
