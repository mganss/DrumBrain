# DrumGen

![DrumGen Screenshot](https://github.com/mganss/DrumGen/raw/master/screenshot.png)

A Max for Live 808/909-style drum pattern generator and sequencer based on a [Lempel-Ziv](https://en.wikipedia.org/wiki/LZ77_and_LZ78) model. The device has a built-in model that was generated from ~250 existing drum patterns using the incremental parsing algorithm described in [Guessing the Composer's Mind: Applying Universal Prediction to Musical Style](http://articles.ircam.fr/textes/Assayag99a/index.pdf).

[Demo on YouTube](https://youtu.be/8KpjvNGndvg)

Download under [releases](https://github.com/mganss/DrumGen/releases) or at [maxforlive.com](http://maxforlive.com/library/device/5462/drumgen)

## Features

* Generate patterns specific to 11 different instruments
* Create MIDI clips
* Continue mode, continues an existing pattern 
* Patterns have low/high velocity 
* Additional total accent (configurable amount)
* Select pitch and low/high velocity for each instrument
* Shuffle
* Pattern length between 1 and 32 steps
* Select "House", "Breaks", or "All" style patterns (see below)
* 909-like flam (configurable amount)
* Presets
* Out clip (see below)

## Total accent

The total accent feature works similar to the 808/909 accent (AC). When it's enabled, the selected amount of velocity is added to some steps (depending on the generated AC pattern) for a maximum of 127. For example, if the high velocity for an instrument is 96 and it gets an accent of 40, the velocity will be 127.

## Flam

Flam is similar to 909 flam, i.e. steps for which the generated pattern has a flam will have two short successive hits. The duration of an individual hit is 10ms and the two hits occur at the selected interval. The default is 20ms, approx. like setting 11 or 12 on a 909 (see [here](http://www.e-licktronic.com/forum/viewtopic.php?f=25&t=1430) for measured timings on a real 909). In generated MIDI clips the duration is a bit longer, this seems to be a limitation of the Max for Live API.

## Styles

You can select between "House", "Breaks", or "All" style patterns. If you choose "House", the model is one where the existing drum patterns had bass drum hits on steps 1, 5, 9, and 13. The "Breaks" model was generated from patterns which did not follow this pattern.

## Create clip

If you click <kbd>Clip</kbd> a new clip with the current pattern is generated in the first empty clip slot of the current track. You might notice subtle timing differences when comparing recorded MIDI vs. created MIDI clips. This is a limitation of Max for Live.

## Out clip

Create an empty clip, select it, then click <kbd>Out</kbd> to permanently set this clip as DrumGen's output clip. 
Whenever the pattern changes, this clip will be updated.

## Continue

If the <kbd>Continue</kbd> toggle is activated, DrumGen will read MIDI notes from the first non-empty clip slot of the current track and continue the pattern. Notes are internally quantized to 16th notes (duration is irrelevant). Velocities that are equal to or higher than the selected high velocity are considered high, all others low. If more than one hit occurs in a 16th note interval, the step is considered a flam. If a clip is longer than two bars, only the last 32 steps are considered.

## Context

When a step is generated, the previous steps that are used to look up the possible next steps from the continuations dictionary are called the context. The maximum number of steps in the context can be selected within a range of 1 to 32. Lower numbers will result in more random output.

## Contribute

Contributions are welcome, in particular more existing 808/909 patterns in any machine readable format to improve the model.
