// The 24 routes at the Gilford wall, taken from gilford.pdf.
// The wall is split into 8 panels, left to right, with 3 routes on each.
//
// Shared by the tick list app and the endurance app, so there is one copy to
// update when the wall is re-set rather than two that can drift apart.
const routes = [
    { "id" : 1,  "section" : 1, "colour" : "Yellow", "grade" : "4"   },
    { "id" : 2,  "section" : 1, "colour" : "Orange", "grade" : "5+"  },
    { "id" : 3,  "section" : 1, "colour" : "Green",  "grade" : "6b"  },
    { "id" : 4,  "section" : 2, "colour" : "White",  "grade" : "4"   },
    { "id" : 5,  "section" : 2, "colour" : "Grey",   "grade" : "4+"  },
    { "id" : 6,  "section" : 2, "colour" : "Black",  "grade" : "5+"  },
    { "id" : 7,  "section" : 3, "colour" : "Yellow", "grade" : "4+"  },
    { "id" : 8,  "section" : 3, "colour" : "Orange", "grade" : "6a+" },
    { "id" : 9,  "section" : 3, "colour" : "Green",  "grade" : "6c"  },
    { "id" : 10, "section" : 4, "colour" : "Red",    "grade" : "5+"  },
    { "id" : 11, "section" : 4, "colour" : "Pink",   "grade" : "6a+" },
    { "id" : 12, "section" : 4, "colour" : "Blue",   "grade" : "7a"  },
    { "id" : 13, "section" : 5, "colour" : "White",  "grade" : "5"   },
    { "id" : 14, "section" : 5, "colour" : "Yellow", "grade" : "6a+" },
    { "id" : 15, "section" : 5, "colour" : "Black",  "grade" : "7a+" },
    { "id" : 16, "section" : 6, "colour" : "Yellow", "grade" : "5"   },
    { "id" : 17, "section" : 6, "colour" : "Grey",   "grade" : "5+"  },
    { "id" : 18, "section" : 6, "colour" : "Green",  "grade" : "7b"  },
    { "id" : 19, "section" : 7, "colour" : "Red",    "grade" : "4"   },
    { "id" : 20, "section" : 7, "colour" : "Blue",   "grade" : "6a"  },
    { "id" : 21, "section" : 7, "colour" : "White",  "grade" : "6c"  },
    { "id" : 22, "section" : 8, "colour" : "Yellow", "grade" : "4+"  },
    { "id" : 23, "section" : 8, "colour" : "Green",  "grade" : "6a+" },
    { "id" : 24, "section" : 8, "colour" : "Orange", "grade" : "6b"  }
];

// Easiest to hardest, used to work out the hardest climb of a session
const gradeOrder = ["4", "4+", "5", "5+", "6a", "6a+", "6b", "6c", "7a", "7a+", "7b"];

function getRoute(id){
    return routes.find(route => route.id === id);
}

// Sport grades as a climber counts them, easiest first. A plus is a shade of the
// grade below it rather than a grade of its own, so 6a+ is still 6a and the next
// grade up is 6b. The endurance app steps down this list when it picks climbs
// a number of grades below a climber's max.
const gradeSteps = [
    ["4", "4+"],
    ["5", "5+"],
    ["6a", "6a+"],
    ["6b"],
    ["6c"],
    ["7a", "7a+"],
    ["7b"]
];

// How far up that list a grade sits, so one grade below 7b is 7a and two is 6c
function gradeStep(grade){
    return gradeSteps.findIndex(step => step.includes(grade));
}
