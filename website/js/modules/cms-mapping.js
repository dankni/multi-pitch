/** A JS VARIABLE TO MAP PAGE ELEMENTS TO THE CLIMB JSON **/

/**
 * "name" is the name from the climbData in localStorage & JSON files
 * "querySelector" is the querySelector for the editable on-page element that will be saved
 * "acceptsHTML" will prevent HTML stripping when set to true 
 * "groupSelector" will group hidden elements together for easy editing
 * 
 * "type" gets checked and cleaned before saving and can be: 
 *     'int' a number
 *     'float' a floating point number aka a decimal
 *     'text' a string of text
 *     'bool' can be null, true, false or 1 (TODO: fix this to true boolean).
 *     'array' a set of numbers in an array like monthly tempreture (will convert to int)
 *     'object' a nested set of items for use with guidebooks etc 
 * 
 * "hidden" when set to true will create hidden editable text boxs on the page for this value. For example dataGrade
 * "trigger" adds an event to the element specfied (via querySelectorAll) to open the "groupSelector" to allow editing of hidden elements
 * "visible" when set to false will add an normally invisable bit of data to the page. For example guidebook cover image url.
**/
export function cmsMapping() {
    const mapping = {
        "items" : [
            {
                "name" : "country",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#country",
                "trigger" : "h1",
                "hidden" : true,
                "groupSelector" : "#heading",
                "allClimbData" : true
            },
            {
                "name" : "county",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#county",
                "trigger" : "h1",
                "hidden" : true,
                "groupSelector" : "#heading",
                "allClimbData" : true
            },
            {
                "name" : "cliff",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#cliff",
                "trigger" : "h1",
                "hidden" : true,
                "groupSelector" : "#heading",
                "allClimbData" : true
            },
            {
                "name" : "routeName",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#routeName",
                "trigger" : "h1",
                "hidden" : true,
                "groupSelector" : "#heading",
                "allClimbData" : true
            },
            {
                "name" : "intro",
                "type" : "text",
                "acceptsHTML" : true,
                "mandetory" : true,
                "querySelector" : "#intro"
            },
            {
                "name" : "tradGrade",
                "type" : "text",
                "mandetory" : true,
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "trigger" : "#grade",
                "querySelector" : "#tradGrade",
                "allClimbData" : true
            },
            {
                "name" : "techGrade",
                "type" : "text",
                "mandetory" : true,
                "hidden" : true,
                "groupSelector": "#gradeGroup",                
                "trigger" : "#grade",
                "querySelector" : "#techGrade"
            },
            {
                "name" : "dataGrade",
                "type" : "int",
                "mandetory" : true,
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "trigger" : "#grade",
                "querySelector" : "#dataGrade",
                "allClimbData" : true
            },
            {
                "name" : "originalGrade",
                "type" : "text",
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "trigger" : "#grade",
                "querySelector" : "#originalGrade",
                "allClimbData" : true
            },
            {
                "name" : "abseil",
                "type" : "bool",
                "querySelector" : "#abseil",
                "trigger" : "#grade",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)", // sorry 
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "traverse",
                "type" : "bool",
                "querySelector" : "#traverse",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "boat",
                "type" : "bool",
                "querySelector" : "#boat",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "tidal",
                "type" : "bool",
                "querySelector" : "#tidal",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "polished",
                "type" : "bool",
                "querySelector" : "#polished",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "loose",
                "type" : "bool",
                "querySelector" : "#loose",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "seepage",
                "type" : "bool",
                "querySelector" : "#seepage",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "name" : "grassLegdes",
                "type" : "bool",
                "querySelector" : "#grassLegdes",
                "hidden" : true,
                "trigger" : ".single-attribute:not(#face):not(#rockType)",
                "groupSelector" : "#properties",
                "allClimbData" : true
            },
            {
                "hidden" : true,
                "mandetory" : true,
                "allClimbData" : true,
                "name" : "geoLocation",
                "type" : "text",
                "querySelector" : "#geo",
                "groupSelector" : "#map",                        
                "trigger" : "img.big-card-map",
                "label" : "Geo Location"
            },
            {
                "name" : "approachTime",
                "type" : "int",
                "mandetory" : true,
                "hidden" : true,
                "trigger" : "#approachTimeRing",
                "groupSelector" : "#approachEdit",
                "querySelector" : "#approachTime",
                "allClimbData" : true
            },
            {
                "name" : "approachDifficulty",
                "type" : "int",
                "mandetory" : true,
                "hidden" : true,
                "trigger" : "#approachTimeRing",
                "groupSelector" : "#approachEdit",
                "querySelector" : "#approachDifficulty",
                "allClimbData" : true
            },
            {
                "name" : "pitchInfo",
                "type" : "text",
                "acceptsHTML" : true,
                "querySelector" : "#pitchInfo"
            },
            {
                "name" : "length",
                "type" : "int",
                "mandetory" : true,
                "querySelector" : "#length",
                "allClimbData" : true
            },
            {
                "name" : "pitches",
                "type" : "int",
                "mandetory" : true,
                "querySelector" : "#pitches",
                "allClimbData" : true
            },
            {
                "name" : "approach",
                "type" : "text",
                "mandetory" : true,
                "acceptsHTML" : true,
                "querySelector" : "#approach"
            },
            {
                "name" : "face",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#face"
            },
            {
                "name" : "rock",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#rockType"
            },
            {
                "name" : "guideBooks",
                "type" : "object",
                "multiple" : true,
                "arrayParts" : [
                    {
                        "name" : "isbn",
                        "type" : "int",
                        "querySelector" : ".guide-isbn"
                    },
                    { 
                        "name" : "title",
                        "type" : "text",
                        "querySelector" : ".guide-name"
                    },
                    { 
                        "name" : "description",
                        "type" : "text",
                        "querySelector" : ".guide-desc"
                    },
                    { 
                        "name" : "rrp",
                        "type" : "float",
                        "querySelector" : ".guide-rrp"
                    },
                    { 
                        "name" : "pg",
                        "type" : "int",
                        "querySelector" : ".page"
                    },
                    { 
                        "name" : "imgURL",
                        "type" : "text",
                        "querySelector" : ".imgURL",
                        "visible" : false,
                        "attribute" : "src",
                        "elementSelector" : ".guidebook-img",
                        "label" : "Guidebook Image URL"
                    }
                ]
            },
            {
                "name" : "references",
                "type" : "object",
                "multiple" : true,
                "arrayParts" : [
                    {
                        "name" : "url",
                        "type" : "text",
                        "querySelector" : ".url",
                        "visible" : false,
                        "attribute" : "href",
                        "elementSelector" : ".reference",
                        "label" : "reference URL"
                    },
                    {
                        "name" : "text",
                        "type" : "text",
                        "attribute" : "textContent",
                        "querySelector" : ".reference"
                    }
                ]
            },
            {
                "name" : "weatherData",
                "type" : "object",
                "arrayParts" : [
                    {
                        "hidden" : true,
                        "name" : "rainyDays",
                        "type" : "array",
                        "count" : 12,
                        "querySelector" : "#rainyDays",
                        "groupSelector" : "#seasonalRain",
                        "trigger" : ".seasonal-rain",
                        "label" : "Seasonal Rain"
                    },
                    {
                        "hidden" : true,
                        "name" : "tempH",
                        "type" : "array",
                        "count" : 12,
                        "querySelector" : "#tempH",
                        "trigger" : ".temp",
                        "groupSelector" : "#temp",
                        "label" : "Monthly High Temp in C"
                    },
                    {
                        "hidden" : true,
                        "name" : "tempL",
                        "type" : "array",
                        "count" : 12,
                        "querySelector" : "#tempL",
                        "trigger" : ".temp",
                        "groupSelector" : "#temp",
                        "label" : "Monthly Low Temp in C"
                    }

                ]
            }, 
            {
                "name" : "mapImg",
                "type" : "object",
                "arrayParts" : [
                    {
                        "hidden" : true,
                        "name" : "url",
                        "type" : "text",
                        "querySelector" : "#mapUrl",
                        "groupSelector" : "#map",
                        "trigger" : "img.big-card-map",
                        "label" : "Map Images Folder"
                    },
                    {
                        "hidden" : true,
                        "name" : "alt",
                        "type" : "text",
                        "querySelector" : "#mapAlt",
                        "groupSelector" : "#map",                        
                        "trigger" : "img.big-card-map",
                        "label" : "Alt Text"
                    },
                ]
            }
        ]
    }   
    return mapping;
  }