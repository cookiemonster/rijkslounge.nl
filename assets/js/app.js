$(document).ready(function() {

    console.log("Document ready");

    //
    // Slideshow Background.
    //

    (function() {

        let delay = 10000;
        let wrapper = $("#header-bg__wrapper");
        let bgs = wrapper.find(".header-bg__image");
        $(wrapper.find(".header-bg__image")[0]).addClass("top");
        $(wrapper.find(".header-bg__image")[0]).addClass("visible");
        $(wrapper.find(".header-bg__image")[0]).addClass("first-visible");

        let currentIndex = 0;

        window.setInterval(function () {
            console.log("looping");

            let lastIndex = currentIndex;

            currentIndex += 1;
            if (currentIndex == bgs.length) currentIndex = 0;
            console.log("last: ", lastIndex, "current", currentIndex);

            let currentImage = $(wrapper.find(".header-bg__image")[currentIndex]);
            let lastImage = $(wrapper.find(".header-bg__image")[lastIndex]);

            if (lastImage.hasClass("first-visible")) lastImage.removeClass("first-visible");
            lastImage.removeClass("top");
            currentImage.addClass("top");
            currentImage.addClass("visible");

            setTimeout(function () {
                lastImage.removeClass("visible");
            }, (delay / 3 * 2));

        }.bind(this), delay);

    })();

    //
    // Feedback page
    //

    // $("#copy-template-button").click(function () {
    //     console.log("Clicked copy template to clipboard button");
    //     let text = $("#feedback-template").text().replace('\t', '');
    //     console.log("text: ", text);
    //     copyToClipboard(text);
    // });

    // const copyToClipboard = str => {
    //     const el = document.createElement('textarea');
    //     el.value = str;
    //     document.body.appendChild(el);
    //     el.select();
    //     document.execCommand('copy');
    //     document.body.removeChild(el);
    // };

});