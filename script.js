function getAdjustedLength(f, i, b) {
    var s = 0;
    for (var j = 0; j < b; j++) {
        s += f[i + j];
    }
    s = s / b;
    return Math.floor(s);
}

window.onload = function () {
    "use strict";

    var paths = document.getElementsByTagName('path');
    var visualizer = document.getElementById('visualizer');
    var mask = visualizer.getElementById('mask');
    var path;

    var report = 0;

    var soundAllowed = function (stream) {

        visualizer.setAttribute('viewBox', '0 0 255 255');

        window.persistAudioStream = stream;

        var audioContent = new AudioContext();
        var audioStream = audioContent.createMediaStreamSource(stream);
        var analyser = audioContent.createAnalyser();

        audioStream.connect(analyser);

        analyser.fftSize = 1024;

        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);

        for (var i = 0 ; i < 255; i++) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            mask.appendChild(path);
        }

        var doDraw = function () {

            requestAnimationFrame(doDraw);
            analyser.getByteFrequencyData(frequencyArray);

            var adjustedLength;
            var binSize = 51;
            var scale = 2;

            for (var i = 0 ; i < 255; i += binSize) {
                adjustedLength = getAdjustedLength(frequencyArray, i, binSize);
                adjustedLength = scale * adjustedLength;
                paths[i].setAttribute('d', 'M '+ (i) +',255 l 0,-' + adjustedLength);
            }
        }

        doDraw();
    }

    var soundNotAllowed = function (error) {
        window.alert("Microphone Access Required");
        console.log(error);
    }

    navigator.getUserMedia({audio:true}, soundAllowed, soundNotAllowed);
};
