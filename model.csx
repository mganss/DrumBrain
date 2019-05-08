#! "netcoreapp2.2"
#r "nuget: Glob.cs, *"
#r "nuget: Newtonsoft.Json, *"

using Ganss.IO;
using System.Xml.Linq;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Linq;
using Newtonsoft.Json;

var instrumentCount = 12;
var dicts = new[] { "all", "house", "breaks" }
    .ToDictionary(k => k, k => Enumerable.Range(0, instrumentCount).Select(i => new Dictionary<string, int>()).ToList());

foreach (var file in Glob.ExpandNames("**/*.adm"))
{
    var ls = File.ReadAllLines(file).Select(l => l.Split());
    var head = ls.First();

    if (head.Last() == "0") // only 4/4 scale
        continue;

    var lines = ls.Skip(1).ToList();
    var beat = new string(lines.Select(l => l[1][0]).ToArray());
    var style = Regex.IsMatch(beat, "^([^0]...)+$") ? "house" : "breaks";

    for (int i = 0; i < instrumentCount; i++)
    {
        var text = new string(lines.Select(l => l[i][0]).ToArray());
        if (text.Any(c => c != '0'))
        {
            text = string.Join('-', Regex.Matches(text, ".{1,4}").Select(m => m.Value)); // split into beat blocks
            text = "^" + text; // prepend start symbol
            IPMotif(text, dicts[style][i]);
            IPMotif(text, dicts["all"][i]);
        }
    }
}

var continuations = dicts.ToDictionary(e => e.Key, e => e.Value.Select(d => IPContinuation(d)).ToList());
var json = JsonConvert.SerializeObject(continuations, Formatting.Indented);
File.WriteAllText("model.indented.json", json);
var js = "var model = " + JsonConvert.SerializeObject(continuations, Formatting.None) + ";";
File.WriteAllText("model.js", js);

void IPMotif(string text, Dictionary<string, int> dict)
{
    var motif = "";
    for (var i = 0; i < text.Length; i++)
    {
        motif += text[i];
        if (dict.TryGetValue(motif, out var val))
            dict[motif] = val + 1;
        else
        {
            dict[motif] = 1;
            motif = "";
        }
    }
}

Dictionary<string, Dictionary<char, double>> IPContinuation(Dictionary<string, int> dict1)
{
    var dict2 = new Dictionary<string, Dictionary<char, int>>();

    foreach (var pair in dict1)
    {
        var k = pair.Key.Last();
        if (k != '-' && k != '^')
        {
            var w = pair.Key.Substring(0, pair.Key.Length - 1);
            if (!dict2.TryGetValue(w, out var val))
                val = dict2[w] = new Dictionary<char, int> { [k] = pair.Value };
            else
            {
                if (!val.TryGetValue(k, out var counter))
                    val[k] = pair.Value;
                else
                    val[k] = counter + pair.Value;
            }
        }
    }

    var dict3 = dict2.ToDictionary(p => p.Key,
        p => p.Value.ToDictionary(v => v.Key, v => ((double)v.Value) / p.Value.Sum(w => w.Value)));

    return dict3;
}
