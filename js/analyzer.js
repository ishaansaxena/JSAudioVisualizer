var handleSoundAllowed = function(stream) {
    
    /**
     * Constants
     */

    let SCALE = 1.0;                    // Visual Scaling Factor
    let MAX_FREQUENCY_INDEX = 1024;     // Frequency Bins => FFTSize = 2048
    let FREQUENCY_RANGE = 24000;        // Frequency Range of Bins => Bin_0 = [0, ~23.4]


    /**
     * Bin Sizes
     * These sizes are upper limits in Hertz, but will be changed to indices
     */

    var BIN_UPPER_LIMITS = [60, 250, 500, 2000, 4000, 6000, 24000];


    /**
     * WebAudio API Elements
     */

    var audioContext, audioStream, analyser, frequencyArray;


    /**
     * Method defintions
     */

    var initalizeAnalyser = function(stream) {
        // Make AudioStream persist throughout the session
        window.persistAudioStream = true;
        
        // Initialize stream and analyser
        audioContext = new AudioContext();
        audioStream = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();

        // Configure analyser
        analyser.fftSize = MAX_FREQUENCY_INDEX * 2;
        audioStream.connect(analyser);

        // Create frequency array
        frequencyArray = new Uint8Array(analyser.frequencyBinCount);
    
        // Change bins from Hertz to array indices
        var binSum = 0;
        for (var i = 0; i < BIN_UPPER_LIMITS.length; i++) {
            BIN_UPPER_LIMITS[i] = Math.floor(BIN_UPPER_LIMITS[i]/(FREQUENCY_RANGE/MAX_FREQUENCY_INDEX))
            binSum += BIN_UPPER_LIMITS;
        }
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
        binIntensity = Math.floor(binIntensity / (upperFrequencyIndex - lowerFrequencyIndex) * SCALE);
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

        var consoleStr = new String();

        // For each bin, get the intensities
        var lower = 0;
        BIN_UPPER_LIMITS.forEach(upper => {
            var binIntensity = getTrueBinIntensity(lower, upper);
            consoleStr += binIntensity + " ";
            lower = upper;
        });
        
        console.log("> " + consoleStr);
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

    navigator.getUserMedia(
        {audio:true},
        handleSoundAllowed,
        handleSoundNotAllowed
    );
}