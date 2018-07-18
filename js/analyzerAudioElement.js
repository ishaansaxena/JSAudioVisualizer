var handleSoundAllowed = function(stream) {
    
    /**
     * Constants
     */

    let SCALE = 1.0;                    // Visual Scaling Factor
    let MAX_FREQUENCY_INDEX = 1024;     // Frequency Bins => FFTSize = 2048
    let MAX_DECIBALS = 255;             // Maximum dB value
    let FREQUENCY_RANGE = 24000;        // Frequency Range of Bins => Bin_0 = [0, ~23.4]


    /**
     * Bin Sizes
     * These sizes are upper limits in Hertz, but will be changed to indices
     */

    var BIN_UPPER_LIMITS = [60, 250, 500, 2000, 4000, 6000, 24000];
    var BIN_LABELS = ["Sub-Bass", "True-Bass", "Lower-Mid", "Mid-Range", "Higher-Mid", "Presence", "Brilliance"];
    var BIN_ELEMENTS = new Array();


    /**
     * WebAudio API Elements
     */

    var audioContext, audioStream, analyser, frequencyArray;


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

        var elInner = document.createElement("progress");
        elInner.classList.add("monitor-value");
        elInner.max = MAX_DECIBALS;
        elInner.value = 0;

        elOuter.appendChild(elLabel);
        elOuter.appendChild(elInner);

        return [elOuter, elInner];
    }

    var initializeDOM = function() {
        var parent = document.getElementById("container");
        for (var i = 0; i < BIN_LABELS.length; i++) {
            var elements = getLabeledElement(BIN_LABELS[i]);
            parent.appendChild(elements[0]);
            BIN_ELEMENTS.push(elements[1]);
        }
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
        audioStream.connect(audioContext.destination);
        analyser.connect(audioContext.destination);

        // Configure analyser
        analyser.fftSize = MAX_FREQUENCY_INDEX * 2;
        audioStream.connect(analyser);

        // Create frequency array
        frequencyArray = new Uint8Array(analyser.frequencyBinCount);
    
        initializeDOM();
        inplaceHzToIndex();
    }

    var getTrueIntensity = function(frequencyIndex) {
        return frequencyArray[frequencyIndex];
    }

    var getAdjustedIntensity = function(frequencyIndex) {
        return frequencyArray[frequencyIndex]/SCALE;
    } 

    var getBinIntensity = function(lowerFrequencyIndex, upperFrequencyIndex, intensityFunction) {
        var binIntensity = 0;
        for (var i = lowerFrequencyIndex; i < upperFrequencyIndex; i++) {
            binIntensity += intensityFunction(i);
        }
        binIntensity = binIntensity / (upperFrequencyIndex - lowerFrequencyIndex);
        return binIntensity;
    }

    var getTrueBinIntensity = function(lowerFrequencyIndex, upperFrequencyIndex) {
        return getBinIntensity(lowerFrequencyIndex, upperFrequencyIndex, getTrueIntensity);
    }

    var getAdjustedBinIntensity = function(lowerFrequencyIndex, upperFrequencyIndex) {
        return getBinIntensity(lowerFrequencyIndex, upperFrequencyIndex, getAdjustedIntensity);
    }

    var startAnalyser = function() {
        initalizeAnalyser(stream);
    }

    var updateAnalyser = function() {
        requestAnimationFrame(updateAnalyser);

        // Get frequency data from analyzer
        analyser.getByteFrequencyData(frequencyArray);

        // var consoleStr = new String();

        // For each bin, get the intensities
        var lower = 0;
        for (var i = 0; i < BIN_UPPER_LIMITS.length; i++) {
            var el = BIN_ELEMENTS[i];
            var upper = BIN_UPPER_LIMITS[i];
            
            var binIntensity = getAdjustedBinIntensity(lower, upper);
            el.value = (binIntensity > MAX_DECIBALS) ? MAX_DECIBALS : binIntensity;

            lower = upper;
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

// window.onload = function() {
//     'use strict';

//     navigator.getUserMedia(
//         {audio:true},
//         handleSoundAllowed,
//         handleSoundNotAllowed
//     );
// }


window.onload = function() {
    'use strict';

    var audio = document.getElementById('audio');
    audio.crossOrigin = "anonymous";
    handleSoundAllowed(audio);
}