document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('flyer-trigger');
    const dialog = document.getElementById('flyer-dialog');
    const closeBtn = document.getElementById('flyer-close');
    if (!trigger || !dialog || !closeBtn) return;

    trigger.addEventListener('click', () => dialog.showModal());
    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
});
