window.addEventListener('error', (event) => {
    fetch('http://localhost:3000/log-error', {
        method: 'POST',
        body: event.error.stack || event.message
    });
});
