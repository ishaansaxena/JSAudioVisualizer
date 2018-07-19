var handleSoundAllowed = function(stream) {

    /**
     * Constants
     */

    let SCALE = 100.0/255.0;            // Visual Scaling Factor
    let MAX_FREQUENCY_INDEX = 1024;     // Frequency Bins => FFTSize = 2048
    let MAX_DECIBALS = 255;             // Maximum dB value
    let FREQUENCY_RANGE = 24000;        // Frequency Range of Bins => Bin_0 = [0, ~23.4]
    var HIST_VALUE = 0;                 // Keep track of bass dB values
    var THRESHOLD = 60;
    var THRESHOLD_VARIANCE = 0;

    /**
     * Bin Sizes
     * These sizes are upper limits in Hertz, but will be changed to indices
     */

    var BIN_UPPER_LIMITS = [60, 250, 500, 2000, 4000, 6000, 24000];
    let BIN_LABELS = ["Sub-Bass", "True-Bass", "Lower-Mid", "Mid-Range", "Higher-Mid", "Presence", "Brilliance"];
    var BIN_ELEMENTS = new Array();
    var BIN_PARENTS = new Array();
    let BIN_WEIGHTS = [1, 0, 0, 0, 0, 0, 0];

    /**
     * WebAudio API Elements
     */

    var audioContext, audioStream, analyser, filter, filterAnalyser, frequencyArray, filteredArray;


    /**
     * Method defintions
     */

    var getLabeledElement = function(label) {

        var elOuter = document.createElement("div");
        elOuter.classList.add("monitor")
        elOuter.id = label;

        var elLabel = document.createElement("div");
        elLabel.classList.add("monitor-label");
        elLabel.innerHTML = label

        var elInner = document.createElement("div");
        elInner.classList.add("monitor-value");
        elInner.max = MAX_DECIBALS;
        elInner.value = 0;

        elOuter.appendChild(elInner);
        elOuter.appendChild(elLabel);

        return [elOuter, elInner];
    }

    var initializeDOM = function() {
        var parent = document.getElementById("container");
        for (var i = 0; i < BIN_LABELS.length; i++) {
            var elements = getLabeledElement(BIN_LABELS[i]);

            BIN_ELEMENTS.push(elements[1]);

            parent.appendChild(elements[0]);
            BIN_PARENTS.push(elements[0]);
        }
        cycleParentColor();
    }

    var inplaceHzToIndex = function() {
        // Change bins from Hertz to array indices
        var binSum = 0;
        for (var i = 0; i < BIN_UPPER_LIMITS.length; i++) {
            BIN_UPPER_LIMITS[i] = Math.floor(BIN_UPPER_LIMITS[i]/(FREQUENCY_RANGE/MAX_FREQUENCY_INDEX))
            binSum += BIN_UPPER_LIMITS;
        }
    }

    var initalizeAnalyser = function(stream) {
        // Make AudioStream persist throughout the session
        // window.persistAudioStream = true;

        // Initialize stream and analyser
        audioContext = new AudioContext();

        audioStream = audioContext.createMediaElementSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = MAX_FREQUENCY_INDEX * 2;

        filter = audioContext.createBiquadFilter();
        filter.type = "lowshelf";
        filter.frequency.setValueAtTime(1000, audioContext.currentTime);

        filterAnalyser = audioContext.createAnalyser()
        filterAnalyser.fftSize = MAX_FREQUENCY_INDEX * 2;

        // Set audio output
        audioStream.connect(audioContext.destination);

        // Configure connections
        audioStream.connect(analyser);
        analyser.connect(filter);
        filter.connect(filterAnalyser);

        // Create frequency array
        frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        filteredArray = new Uint8Array(analyser.frequencyBinCount);

        initializeDOM();
        inplaceHzToIndex();
    }

    var getRandomColorSet = function() {
        var index = Math.floor(Math.random() * COLORS.length);
        COLOR_INDEX = (index == COLOR_INDEX) ? index + 1: index;
        console.log(COLORS[COLOR_INDEX]);
        return COLOR_SET[COLORS[COLOR_INDEX]];
    }

    var getTrueIntensity = function(frequencyArray, frequencyIndex) {
        return frequencyArray[frequencyIndex];
    }

    var getAdjustedIntensity = function(frequencyArray, frequencyIndex) {
        return frequencyArray[frequencyIndex] * SCALE;
    }

    var getBinIntensity = function(frequencyArray, lowerFrequencyIndex, upperFrequencyIndex, intensityFunction) {
        var binIntensity = 0;
        for (var i = lowerFrequencyIndex; i < upperFrequencyIndex; i++) {
            binIntensity += intensityFunction(frequencyArray, i);
        }
        binIntensity = binIntensity / (upperFrequencyIndex - lowerFrequencyIndex);
        return binIntensity;
    }

    var getTrueBinIntensity = function(frequencyArray, lowerFrequencyIndex, upperFrequencyIndex) {
        return getBinIntensity(frequencyArray, lowerFrequencyIndex, upperFrequencyIndex, getTrueIntensity);
    }

    var getAdjustedBinIntensity = function(frequencyArray, lowerFrequencyIndex, upperFrequencyIndex) {
        return getBinIntensity(frequencyArray, lowerFrequencyIndex, upperFrequencyIndex, getAdjustedIntensity);
    }

    var cycleParentColor = function() {
        var colorSet = getRandomColorSet();
        var index = 0;
        // console.log(colorSet);
        BIN_PARENTS.forEach(parent => {
            parent.style.background = colorSet[index++];
        });
    }

    var isBeat = function(fftMeasure) {
        var intensity = 0;
        var isValidBeat = false;
        for (var i = 0; i < fftMeasure.length; i++) {
            intensity += fftMeasure[i] * BIN_WEIGHTS[i];
        }
        if (HIST_VALUE < THRESHOLD - THRESHOLD_VARIANCE && intensity > THRESHOLD) {
            isValidBeat = true;
        }
        HIST_VALUE = intensity;
        // console.log(HIST_VALUE)
        return isValidBeat;
    }

    var startAnalyser = function() {
        initalizeAnalyser(stream);
    }

    var updateAnalyser = function() {
        requestAnimationFrame(updateAnalyser);

        // Get frequency data from analyzer
        analyser.getByteFrequencyData(frequencyArray);
        filterAnalyser.getByteFrequencyData(filteredArray);

        // var consoleStr = new String();

        // For each bin, get the intensities
        var fftMeasure = new Array();
        var lower = 0;
        for (var i = 0; i < BIN_UPPER_LIMITS.length; i++) {
            var el = BIN_ELEMENTS[i];
            var upper = BIN_UPPER_LIMITS[i];

            var binIntensity = getAdjustedBinIntensity(frequencyArray, lower, upper);
            binIntensity = (binIntensity > 100) ? 100 : binIntensity;
            el.style.width = binIntensity + "vw";

            var filteredIntensity = getAdjustedBinIntensity(filteredArray, lower, upper);
            filteredIntensity = (filteredIntensity > 100) ? 100 : filteredIntensity;
            fftMeasure.push(filteredIntensity);

            lower = upper;
        }

        if (isBeat(fftMeasure)) {
            cycleParentColor();
        }

        // console.log("\n" + consoleStr);
    }


    /**
     * Run analyser
     */

    startAnalyser();
    updateAnalyser();
}

var handleSoundNotAllowed = function(error) {
    alert("Please provide access to microphone to use the visualizer.");
    window.location.reload(false);
}

window.onload = function() {
    'use strict';

    var audio = document.getElementById('audio');
    audio.crossOrigin = "anonymous";
    handleSoundAllowed(audio);

    // window.addEventListener("click", function() {
    //     if (audio.paused) {
    //         audio.play();
    //     } else {
    //         audio.pause();
    //     }
    // });

}
