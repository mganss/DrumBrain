inlets = 1;
outlets = 1;
autowatch = 1;

include("model.js");

var temperature = 1.0;
var patternLength = 32;
var maxContext = 32;
var numInstruments = 12;
var style = "house";
var clipLength = 32;

function bang() {
    generateAll();
}

function setStyle(s) {
    style = s.toLowerCase();
}

function setLength(l) {
    clipLength = l;
}

function setContext(c) {
    maxContext = c;
}

function generateAll() {
    callPresetStorageDump();
    for (var i = 0; i < numInstruments; i++) {
        generate(i, false);
    }
    clipOut();
}

function generate(i, dumpStorage) {
    if (dumpStorage === undefined || dumpStorage)
        callPresetStorageDump();

    var dict = model[style][i];
    var text = getTextToContinue(i);
    var pattern = [];

    while (pattern.length < patternLength) {
        if (((text.length - 1) % 5) === 4) {
            text = text + "-";
            continue;
        }

        var context = text.slice(-maxContext);

        while (!dict.hasOwnProperty(context)) {
            context = context.slice(1);
        }

        var dist = dict[context];
        var x = Math.random();

        for (var k in dist) {
            if (dist.hasOwnProperty(k)) {
                var p = dist[k];
                x = x - p;
                if (x <= 0.0) {
                    text = text + k;
                    pattern.push(parseInt(k));
                    break;
                }
            }
        }
    }

    outlet(0, i, "pitch", 1, pattern);

    if (dumpStorage === undefined || dumpStorage)
        clipOut();
}

var storage = {};

function getTextToContinue(i) {
    if (i > 0 && storage["cont"] === 1) {
        var track = new LiveAPI("this_device canonical_parent");
        var clipSlots = track.getcount("clip_slots");

        for (var clipSlotNum = 0; clipSlotNum < clipSlots; clipSlotNum++) {
            var clipSlot = new LiveAPI("this_device canonical_parent clip_slots " + clipSlotNum);
            var hasClip = clipSlot.get("has_clip").toString() !== "0";
            if (hasClip) {
                var firstClip = new LiveAPI("this_device canonical_parent clip_slots " + clipSlotNum + " clip");
                var notes = getClipNotes(firstClip);
                var clipLength = firstClip.get("length");
                var texts = getTextFromMidi(notes, clipLength);
                return texts[i - 1];
            }
        }
    }

    return "^";
}

function createClip() {
    var track = new LiveAPI("this_device canonical_parent");
    var clipSlots = track.getcount("clip_slots");
    var clipSlot;

    var firstClip = null;

    for (var clipSlotNum = 0; clipSlotNum < clipSlots; clipSlotNum++) {
        clipSlot = new LiveAPI("this_device canonical_parent clip_slots " + clipSlotNum);
        var hasClip = clipSlot.get("has_clip").toString() !== "0";
        if (!hasClip) break;
    }

    if (clipSlotNum === clipSlots) {
        // have to create new clip slot (scene)
        var set = new LiveAPI("live_set");
        set.call("create_scene", -1);
        clipSlot = new LiveAPI("this_device canonical_parent clip_slots " + clipSlotNum);
    }

    var beats = Math.ceil(clipLength / 4);
    clipSlot.call("create_clip", beats);
    var clip = new LiveAPI("this_device canonical_parent clip_slots " + clipSlotNum + " clip");
    var notes = generateMidi();

    setNotes(clip, notes);
}

function Note(pitch, start, duration, velocity, muted) {
    this.Pitch = pitch;
    this.Start = start;
    this.Duration = duration;
    this.Velocity = velocity;
    this.Muted = muted;
}

function setNotes(clip, notes) {
    clip.call("set_notes");
    clip.call("notes", notes.length);

    for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        clip.call("note", note.Pitch, note.Start.toFixed(4), note.Duration.toFixed(4), note.Velocity, note.Muted);
    }

    clip.call("done");
}

function callPresetStorageDump() {
    var presetStorage = this.patcher.getnamed("presetStorage");
    presetStorage.message("dump");
}

var instruments = ["bd", "sd", "lt", "mt", "ht", "rs", "cp", "cb", "cy", "oh", "ch"];

function generateMidi() {
    callPresetStorageDump();

    var swing = parseInt(storage["swing"]);
    var flam = storage["flam"] === 1;
    var flamAmount = parseInt(storage["flamAmount"]);
    var accent = storage["accent"] === 1;
    var accentVel = parseInt(storage["accentVel"]);
    var tempo = parseFloat(new LiveAPI("live_set").getstring("tempo"));
    var beatsPerMs = tempo / (60.0 * 1000.0);
    var notes = [];

    for (var i = 0; i < instruments.length; i++) {
        var instrument = instruments[i];
        var toggle = storage[instrument + "::toggle"] === 1;
        if (!toggle) continue;
        var pitch = parseInt(storage[instrument + "::pitch"]);
        var velLow = parseInt(storage[instrument + "::velLow"]);
        var velHigh = parseInt(storage[instrument + "::velHigh"]);
        for (var s = 0; s < clipLength; s++) {
            var idx = 11 + s * 5;
            var step = parseInt(storage[instrument + "::step"][idx]);
            if (step === 0) continue;
            var accentStep = parseInt(storage["ac::step"][idx]);
            var delay = (s % 2) * (1.0 / 8.0) * (swing - 50.0) / 25.0;
            var start = (s / 4.0) + delay;
            var acVel = accent && accentStep > 0 ? accentVel : 0;
            var velLo = Math.min(127, velLow + acVel);
            var velHi = Math.min(127, velHigh + acVel);
            if (flam && step === 5) {
                var note1 = new Note(pitch, start, 10.0 * beatsPerMs, velLo, 0);
                var note2 = new Note(pitch, start + flamAmount * beatsPerMs, 10.0 * beatsPerMs, velHi, 0);
                notes.push(note1, note2);
            } else {
                var note = new Note(pitch, start, 1.0 / 8.0, step > 1 ? velHi : velLo, 0);
                notes.push(note);
            }
        }
    }

    return notes;
}

function dumpPreset(path) {
    var args = Array.prototype.slice.call(arguments).slice(1);
    storage[path] = args.length > 1 ? args : args[0];
}

function getClipNotes(clip) {
    var len = clip.get("length");
    var data = clip.call("get_notes", 0, 0, len, 128);
    var notes = [];

    for (var i = 2; i < (data.length - 1); i += 6) {
        var pitch = data[i + 1];
        var start = data[i + 2];
        var duration = data[i + 3];
        var velocity = data[i + 4];
        var muted = data[i + 5];
        var note = new Note(pitch, start, duration, velocity, muted);
        notes.push(note);
    }

    return notes;
}

function getTextFromMidi(notes, clipLength) {
    var instrumentValues = [];
    var steps = [];

    for (var i = 0; i < instruments.length; i++) {
        var instrument = instruments[i];
        var pitch = parseInt(storage[instrument + "::pitch"]);
        var velLow = parseInt(storage[instrument + "::velLow"]);
        var velHigh = parseInt(storage[instrument + "::velHigh"]);
        instrumentValues[pitch] = [i, velLow, velHigh];
        steps[i] = [];
    }

    for (i = 0; i < notes.length; i++) {
        var note = notes[i];
        if (note.Muted === 1) continue;
        var vals = instrumentValues[note.Pitch];
        
        if (vals) {
            var step = Math.floor(note.Start * 4.0);
            var idx = vals[0];
            var hi = vals[2];
            var val = note.Velocity >= hi ? "2" : "1";

            steps[idx][step] = steps[idx][step] ? "5" : val;
        }
    }

    var texts = [];

    for (i = 0; i < instruments.length; i++) {
        var text = "^";
        for (var s = 0; s < (clipLength * 4); s++) {
            if (s > 0 && (s % 4) === 0) text += "-";
            text += steps[i][s] || "0";
        }
        texts[i] = text;
    }

    return texts;
}

var clips = {
    out: null
};
var ids = {
    out: 0
};
var init = false;

function liveInit() {
    init = true;
    if (ids.out !== 0) {
        setOut(ids.out);
    }
}

function setClip(name, id) {
    if (!init) {
        ids[name] = id;
        return;
    }
    if (id === 0) {
        clips[name] = null;
        return;
    }
    var clipId = "id " + id;
    clips[name] = new LiveAPI(clipId);
}

function setOut(id) {
    setClip("out", id);
    clipOut();
}

function clipOut() {
    if (clips.out !== null) {
        var outClip = clips.out;
        var stepNotes = generateMidi();
        if (stepNotes === undefined) stepNotes = [];
        replaceAllNotes(outClip, stepNotes);
    }
}

function replaceAllNotes(clip, notes) {
    clip.call("select_all_notes");
    clip.call("replace_selected_notes");
    clip.call("notes", notes.length);

    for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        callNote(clip, note);
    }

    clip.call("done");
}

function callNote(clip, note) {
    clip.call("note", note.Pitch, note.Start.toFixed(4), note.Duration.toFixed(4), note.Velocity, note.Muted);
}
