$(document).ready(function() {

    console.log("PAGE READY");
    
    $("#copy-template-button").click(function() {

        console.log("Clicked copy template to clipboard button");

        let text = $("#feedback-template").text().replace('\t', '');
        console.log("text: ", text);
        copyToClipboard(text);

    });

    const copyToClipboard = str => {
        const el = document.createElement('textarea');
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };

});