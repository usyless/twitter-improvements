'use strict';

if ((new URLSearchParams(window.location.search)).get('installed')) {
    const newURL = new URL(window.location.href);
    newURL.search = '';
    history.pushState(null, '', newURL.href);

    document.body.classList.add('introduction');
    window.scrollTo({top: 0, behavior: 'instant'});
    const settings = document.body.firstElementChild;
    settings.classList.add('nopointer');
    const overlay = document.createElement('div');
    overlay.classList.add('wrapper', 'intro-wrapper');
    const logo = document.createElement('img');
    const mainText = document.createElement('h1');
    const lowerText = document.createElement('p');
    const continueButton = document.createElement('button');
    logo.src = '/icons/icon-96.png';
    logo.addEventListener('dragstart', (e) => e.preventDefault());
    mainText.textContent = 'Thank you for downloading Improvements for Twitter!';
    lowerText.textContent = 'Please adjust the settings to your preferences, and remember to check occasionally for updates, through the popup.'
    overlay.append(logo, mainText, lowerText, continueButton);
    document.body.firstElementChild.before(overlay);

    const controller = new AbortController();
    const finishIntroduction = () => {
        controller.abort();

        overlay.classList.add('intro-end');

        overlay.addEventListener('transitionend', (e) => {
            if (e.target === e.currentTarget) {
                document.body.classList.remove('introduction');
                settings.classList.remove('nopointer');
                overlay.remove();
            }
        });
        overlay.style.marginTop = `-${overlay.clientHeight}px`;
    }

    continueButton.addEventListener('click', finishIntroduction);

    let scrollAmount = 0;
    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 0) scrollAmount += e.deltaY;
        else scrollAmount = 0;

        if (scrollAmount >= 250) finishIntroduction();
    }, {signal: controller.signal});


    window.addEventListener('pointerdown', (e) => {
        const moveController = new AbortController();
        const onExit = (ev) => {
            moveController.abort();
            overlay.style.transition = '';
            if (e.clientY - ev.clientY > 200) finishIntroduction();
            else overlay.style.marginTop = '';
        };
        overlay.style.transition = '0s';
        window.addEventListener('pointermove', (ev) => {
            overlay.style.marginTop = `${ev.clientY - e.clientY}px`;
        }, {signal: moveController.signal});
        window.addEventListener('pointerup', onExit, {once: true, signal: controller.signal});
        window.addEventListener('pointercancel', onExit, {once: true, signal: controller.signal});
    }, {signal: controller.signal});
}