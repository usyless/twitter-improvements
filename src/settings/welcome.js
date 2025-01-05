'use strict';

(() => {
    const getStorage = () => new Promise((resolve) => {
        chrome.storage.local.get(['introduction'], (result) => resolve(result.introduction ?? false));
    });

    const runIntroduction = () => {
        chrome.storage.local.set({introduction: true});
        document.body.classList.add('introduction');
        const settings = document.body.firstElementChild;
        settings.classList.add('nopointer');
        const overlay = document.createElement('div');
        overlay.classList.add('wrapper', 'intro-wrapper');
        const logo = document.createElement('img');
        const mainText = document.createElement('h1');
        const lowerText = document.createElement('p');
        const continueButton = document.createElement('button');
        logo.src = '/icons/icon-96.png';
        mainText.textContent = 'Thank you for downloading Improvements for Twitter!';
        lowerText.textContent = 'Please adjust the settings to your preferences, and remember to check occasionally for updates, through the popup.'
        overlay.append(logo, mainText, lowerText, continueButton);
        document.body.firstElementChild.before(overlay);

        const controller = new AbortController();
        const finishIntroduction = () => {
            console.log("Intro finished");
            controller.abort();

            overlay.classList.add('intro-end');
            settings.classList.add('intro-end');

            overlay.addEventListener('transitionend', (e) => {
                if (e.target === e.currentTarget) {
                    document.body.classList.remove('introduction');
                    settings.classList.remove('introend');
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
            const onExit = (ev) => {
                if (e.clientY - ev.clientY > 150) finishIntroduction();
            };
            window.addEventListener('pointerup', onExit, {once: true, signal: controller.signal});
            window.addEventListener('pointercancel', onExit, {once: true, signal: controller.signal});
        }, {signal: controller.signal});
    }

    getStorage().then(r => !r && runIntroduction());
})();