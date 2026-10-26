// The routes on Dan's loft wall, easiest first. start and end are [x, y] on the
// floor plan in dansloft/index.html, null until placed with ?edit, and path the
// points between them the route passes through. An id is what a saved session
// holds, so a new route takes the next one up wherever it sits in the list.
//
// Shared by the app, the progress page and common/records.js.
const loftRoutes = [
    { "id" : 1,   "grade" : "V0",  "colour" : "Yellow",               "holds" : "yellow",
      "start" : [239, 868], "end" : [152, 672],
      "path" : [[621, 859], [627, 564], [627, 521], [572, 607], [378, 597], [182, 519], [154, 478]],
      "notes" : "Sit Start · Low Traverse · High Traverse Back · 60 Degree Wall Option V1" },
    { "id" : 2,   "grade" : "V1",  "colour" : "Green & White",        "holds" : "green-white",
      "start" : [631, 848], "end" : [635, 310],
      "path" : [[637, 470], [533, 303], [633, 379]],
      "notes" : "Sit Start · Match Finish · White Volume In" },
    { "id" : 3,   "grade" : "V2",  "colour" : "Grey",                 "holds" : "grey",
      "start" : [288, 102], "end" : [608, 858],
      "path" : [[351, 106], [617, 97], [627, 261], [631, 363], [470, 305], [239, 297], [215, 605], [239, 840]],
      "notes" : "Sit Start" },
    { "id" : 4,   "grade" : "V2",  "colour" : "Sky Blue",             "holds" : "sky-blue",
      "start" : [54, 120], "end" : [615, 310],
      "path" : [[256, 138], [286, 258], [180, 293], [178, 658], [207, 838], [482, 825], [615, 579]],
      "notes" : "Sit Start" },
    { "id" : 16,  "grade" : "V2",  "colour" : "Yellow Cave Start",    "holds" : "yellow",
      "start" : [38, 89], "end" : [227, 295],
      "path" : [[160, 93], [509, 126], [515, 285], [349, 297], [207, 307], [192, 505], [223, 727], [280, 838], [488, 852], [584, 825], [615, 601], [584, 350], [437, 320], [221, 318]],
      "notes" : "Sit Start · Full Circuit" },
    { "id" : 5,   "grade" : "V3",  "colour" : "Orange",               "holds" : "orange",
      "start" : [612, 61], "end" : [217, 275],
      "path" : [[604, 134], [560, 301], [608, 399], [613, 709], [613, 840], [311, 848], [170, 699], [168, 350]],
      "notes" : "Sit Start · No Arête" },
    { "id" : 6,   "grade" : "V3+", "colour" : "French Flags",         "holds" : "french-flags",
      "start" : [152, 97], "end" : [619, 611],
      "path" : [[282, 163], [303, 279], [199, 377], [211, 572], [382, 344], [519, 383]],
      "notes" : "Lying Start" },
    { "id" : 7,   "grade" : "V4",  "colour" : "Pale Pink",            "holds" : "pale-pink",
      "start" : [164, 411], "end" : [627, 422],
      "path" : [[172, 469], [195, 772], [364, 836], [574, 829], [631, 623]],
      "notes" : "Sit Start" },
    { "id" : 8,   "grade" : "V4",  "colour" : "White",                "holds" : "white",
      "start" : [172, 316], "end" : [164, 432],
      "path" : [[199, 281], [301, 269], [610, 273], [621, 809], [207, 842], [166, 721]],
      "notes" : "Sit Start · White Volume Start · Both White Volumes In · Continuous Circuits Possible" },
    { "id" : 15,  "grade" : "V4",  "colour" : "Fluro Pink",           "holds" : "fluro-pink",
      "start" : [606, 49], "end" : [168, 572],
      "path" : [[608, 821], [288, 860], [117, 744], [42, 785], [223, 854], [176, 666]],
      "notes" : "Sit Start" },
    { "id" : 9,   "grade" : "V4+", "colour" : "Yellow Blue Swirls",   "holds" : "swirls",
      "start" : [60, 740], "end" : [596, 858],
      "path" : [[129, 750], [211, 728], [170, 520], [178, 283], [612, 265]],
      "notes" : "Sit Start" },
    { "id" : 10,  "grade" : "V5",  "colour" : "Red",                  "holds" : "red",
      "start" : [623, 108], "end" : [160, 375],
      "path" : [[502, 112], [260, 124], [268, 283], [612, 275], [621, 827], [262, 858], [164, 703], [176, 401]],
      "notes" : "Sit Start · Finger Tape Helps · Match Finish" },
    { "id" : 11,  "grade" : "V5",  "colour" : "Brown",                "holds" : "brown",
      "start" : [23, 840], "end" : [247, 850],
      "path" : [[38, 746], [156, 742], [190, 501], [172, 287], [604, 279], [615, 827]],
      "notes" : "Sit Start · Small White Crack Volume In · Wood Crack In · Continuous Circuits Possible" },
    { "id" : 12,  "grade" : "V5+", "colour" : "Blue",                 "holds" : "blue",
      "start" : [392, 91], "end" : [617, 383],
      "path" : [[374, 258], [345, 829], [598, 825]],
      "notes" : "Sit Start · Match Finish" },
    { "id" : 13,  "grade" : "V6",  "colour" : "Purple",               "holds" : "purple",
      "start" : [309, 862], "end" : [237, 858],
      "path" : [[612, 855], [619, 371], [213, 318], [176, 658]],
      "notes" : "Sit Start · Continuous Circuits Possible" },
    { "id" : 14,  "grade" : "V7",  "colour" : "Black",                "holds" : "black",
      "start" : [580, 848], "end" : [498, 852],
      "path" : [[627, 789], [615, 318], [288, 297], [168, 379], [195, 599], [254, 764]],
      "notes" : "Sit Start · Continuous Circuits Possible" }
];

const loftGradeOrder = ["V0", "V1", "V2", "V3", "V3+", "V4", "V4+", "V5", "V5+", "V6", "V7"];

function getLoftRoute(id){
    return loftRoutes.find(route => route.id === id);
}

// A plus is a shade of its grade, so on the charts and records V3+ is a V3
function loftBoulderGrade(id){
    let route = getLoftRoute(id);
    return route ? route.grade.replace("+", "") : undefined;
}
