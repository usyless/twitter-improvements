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
    const logoContainer = document.createElement('div');
    const mainText = document.createElement('h1');
    const lowerText = document.createElement('p');
    const continueButton = document.createElement('button');

    let lastAnimFrame;
    const animateLogo = (startY) => {
        logoContainer.style.setProperty('--x', `-20deg`);
        let prevTime, prevY = startY || 0, forwards = true;
        const anim = (timestamp) => {
            if (prevTime == null) prevTime = timestamp;
            else {
                let delta = timestamp - prevTime;
                if (delta < 100) { // for tabbing out
                    delta /= 1000;
                    if (prevY >= 120) forwards = false;
                    else if (prevY <= -120) forwards = true;

                    if (forwards) prevY += (delta * 50);
                    else prevY -= (delta * 50);
                    logoContainer.style.setProperty('--y', `${prevY}deg`);
                }
                prevTime = timestamp;
            }
            lastAnimFrame = requestAnimationFrame(anim);
        }
        lastAnimFrame = requestAnimationFrame(anim);
    }
    {
        const logos = [];
        for (let i = -10; i <= 20; i += 5) {
            const l = document.createElement('img');
            l.src = '/icons/icon-96.png';
            l.style.setProperty('--pos', `${i}px`);
            logos.push(l);
        }
        logoContainer.classList.add('logo');
        logoContainer.append(...logos);
        const logo = logos[logos.length - 1];
        logo.addEventListener('pointermove', (e) => {
            cancelAnimationFrame(lastAnimFrame);
            const rect = logo.getBoundingClientRect();
            logoContainer.style.setProperty('--y', `${(e.clientX - rect.left) - (rect.width / 2)}deg`);
            logoContainer.style.setProperty('--x', `${(rect.height / 2) - (e.clientY - rect.top)}deg`);
        });

        const reset = () => {
            logoContainer.style.removeProperty('--x');
            animateLogo(Number(logoContainer.style.getPropertyValue('--y').match(/\d+/)[0]));
        }

        logo.addEventListener('pointerout', reset);
        logo.addEventListener('pointerleave', reset);
        logo.addEventListener('pointercancel', reset);
        logo.addEventListener('dragstart', (e) => e.preventDefault());
    }
    mainText.textContent = 'Thank you for downloading Improvements for Twitter!';
    lowerText.textContent = 'Please adjust the settings to your preferences, and remember to check the settings occasionally for new features, or new elements to hide.'
    overlay.append(logoContainer, mainText, lowerText, continueButton);
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
        window.addEventListener('pointerup', onExit, {once: true, signal: controller.signal});
        window.addEventListener('pointercancel', onExit, {once: true, signal: controller.signal});
        try {
            window.addEventListener('pointermove', (ev) => {
                overlay.style.marginTop = `${ev.clientY - e.clientY}px`;
            }, {signal: AbortSignal.any([moveController.signal, controller.signal])});
        } catch {console.error("AbortSignal.any not supported, ignoring dragging");}
    }, {signal: controller.signal});

    animateLogo();
}