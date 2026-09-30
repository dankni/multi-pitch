/* Grade conversions, for the gym session's ladder and the progress page's table
   of them. Conversions are approximate and argued over; they are only ever
   displayed - a session stores its grade in one system. */

/* Bouldering in the three systems a UK wall labels in, following the usual UK
   gym tables. Font grades carry their f so a tile can't be read as the French
   sport grade. */
const boulderGradeTable = [
    { "v" : "V0",  "font" : "f4",   "brit" : "4a" },
    { "v" : "V1",  "font" : "f5",   "brit" : "4b" },
    { "v" : "V2",  "font" : "f5+",  "brit" : "4c" },
    { "v" : "V3",  "font" : "f6A",  "brit" : "5a" },
    { "v" : "V4",  "font" : "f6B",  "brit" : "5b" },
    { "v" : "V5",  "font" : "f6C",  "brit" : "5c" },
    { "v" : "V6",  "font" : "f7A",  "brit" : "6a" },
    { "v" : "V7",  "font" : "f7A+", "brit" : "6b" },
    { "v" : "V8",  "font" : "f7B",  "brit" : "6b" },
    { "v" : "V9",  "font" : "f7C",  "brit" : "6c" },
    { "v" : "V10", "font" : "f7C+", "brit" : "7a" },
    { "v" : "V11", "font" : "f8A",  "brit" : "7a" },
    { "v" : "V12", "font" : "f8A+", "brit" : "7b" },
    { "v" : "V13", "font" : "f8B",  "brit" : "7b" },
    { "v" : "V14", "font" : "f8B+", "brit" : "7b" },
    { "v" : "V15", "font" : "f8C",  "brit" : "7c" },
    { "v" : "V16", "font" : "f8C+", "brit" : "7c" },
    { "v" : "V17", "font" : "f9A",  "brit" : "7c" }
];

/* The gym session's sport ladder: French, as a UK wall labels its routes, and
   all on the progress page's sport ladder. With "split out low grades" on, 4 to
   5+ are 4a to 5c, as the chart counts them - see ukc.sportGrade. */
const gymSportHigher = ["6a", "6b", "6c", "7a", "7b", "7c", "8a", "8b", "8c", "9a", "9b", "9c"];
const gymSportGrades = ["4", "4+", "5", "5+"].concat(gymSportHigher);
const gymSportGradesSplit = ["4a", "4b", "4c", "5a", "5b", "5c"].concat(gymSportHigher);
// both in one order, to find the hardest of a session with either in it
const gymSportOrder = ["4", "4a", "4b", "4+", "4c", "5", "5a", "5b", "5+", "5c"].concat(gymSportHigher);

/* Routes, a row per British adjectival grade, each other system as the range
   it spans - [easiest, hardest], or one grade. D to E2 are the table on
   /climbing-grades/ (its E2 row stops at the table's end, so E2's harder end is
   the published tables'); E3 to E11 follow the commonly published tables. */
const routeGradeTable = [
    { "uk" : "D",   "tech" : ["3a", "3b"], "uiaa" : ["II", "III"],     "french" : ["3a", "3c"],   "yds" : ["5.3", "5.4"],     "nordic" : ["2", "4"] },
    { "uk" : "VD",  "tech" : ["3b", "3c"], "uiaa" : "III",             "french" : ["3c", "4a"],   "yds" : ["5.4", "5.5"],     "nordic" : ["4", "4+"] },
    { "uk" : "S",   "tech" : ["3c", "4a"], "uiaa" : ["III", "IV"],     "french" : ["4a", "4b"],   "yds" : ["5.5", "5.6"],     "nordic" : ["4+", "5-"] },
    { "uk" : "HS",  "tech" : ["3c", "4b"], "uiaa" : ["IV", "V-"],      "french" : ["4b", "4c"],   "yds" : ["5.6", "5.7"],     "nordic" : ["5-", "5"] },
    { "uk" : "VS",  "tech" : ["4b", "5a"], "uiaa" : ["V-", "V+"],      "french" : ["4c", "5b"],   "yds" : ["5.7", "5.8"],     "nordic" : ["5", "5+"] },
    { "uk" : "HVS", "tech" : ["4c", "5b"], "uiaa" : ["V+", "VI-"],     "french" : ["5b", "5c"],   "yds" : ["5.8", "5.10a"],   "nordic" : ["5+", "6-"] },
    { "uk" : "E1",  "tech" : ["5a", "5c"], "uiaa" : ["VI-", "VI+"],    "french" : ["5c", "6a+"],  "yds" : ["5.10a", "5.10c"], "nordic" : ["6-", "6"] },
    { "uk" : "E2",  "tech" : "5c",         "uiaa" : ["VI+", "VII"],    "french" : ["6a+", "6b"],  "yds" : ["5.10c", "5.10d"], "nordic" : "6" },
    { "uk" : "E3",  "tech" : ["5c", "6a"], "uiaa" : ["VII", "VII+"],   "french" : ["6b+", "6c"],  "yds" : ["5.11a", "5.11b"], "nordic" : ["6+", "7-"] },
    { "uk" : "E4",  "tech" : "6a",         "uiaa" : "VIII-",           "french" : ["6c+", "7a"],  "yds" : ["5.11c", "5.11d"], "nordic" : ["7-", "7"] },
    { "uk" : "E5",  "tech" : ["6a", "6b"], "uiaa" : ["VIII", "VIII+"], "french" : ["7a+", "7b"],  "yds" : ["5.12a", "5.12b"], "nordic" : ["7+", "8-"] },
    { "uk" : "E6",  "tech" : ["6b", "6c"], "uiaa" : ["VIII+", "IX-"],  "french" : ["7b+", "7c"],  "yds" : ["5.12c", "5.12d"], "nordic" : ["8-", "8"] },
    { "uk" : "E7",  "tech" : ["6c", "7a"], "uiaa" : ["IX", "IX+"],     "french" : ["7c+", "8a"],  "yds" : ["5.13a", "5.13b"], "nordic" : ["8+", "9-"] },
    { "uk" : "E8",  "tech" : "7a",         "uiaa" : ["X-", "X"],       "french" : ["8a+", "8b"],  "yds" : ["5.13c", "5.13d"], "nordic" : ["9-", "9"] },
    { "uk" : "E9",  "tech" : ["7a", "7b"], "uiaa" : ["X+", "XI-"],     "french" : ["8b+", "8c"],  "yds" : ["5.14a", "5.14b"], "nordic" : ["9+", "10-"] },
    { "uk" : "E10", "tech" : "7b",         "uiaa" : ["XI", "XI+"],     "french" : ["8c+", "9a"],  "yds" : ["5.14c", "5.14d"], "nordic" : ["10-", "10"] },
    { "uk" : "E11", "tech" : ["7b", "7c"], "uiaa" : ["XI+", "XII-"],   "french" : ["9a+", "9b"],  "yds" : ["5.15a", "5.15b"], "nordic" : ["10", "10+"] }
];
