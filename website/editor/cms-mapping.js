/* A JS VARIABLE TO MAP PAGE ELEMENTS TO THE CLIMB JSON */

// "name" is the name from the climbData in localStorage & JSON files
// "querySelector" is the querySelector for the editable on page element that will be saved
// "acceptsHTML" will prevent HTML stripping when set to true
// "groupSelector" will group hidden elements together for easy editing
// "type" gets checked and cleaned before saving and can be: 
//      'int' a number
//      'float' a floating point number aka a decimal
//      'text' a string of text
//      'array' a set of numbers in an array like monthly tempreture
//      'object' a nested set of items for use with guidebooks etc 
// "hidden" when set to true will create editable text boxs on the page for this value. For example dataGrade
// "visible" when set to false will add an otherwise non visable bit of data to the page. For example guidebook cover image, url.

export function cmsMapping() {
    const mapping = {
        "items" : [
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
                "querySelector" : "#tradGrade"
            },
            {
                "name" : "techGrade",
                "type" : "text",
                "mandetory" : true,
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "querySelector" : "#techGrade"
            },
            {
                "name" : "dataGrade",
                "type" : "int",
                "mandetory" : true,
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "querySelector" : "#dataGrade"
            },
            {
                "name" : "originalGrade",
                "type" : "text",
                "hidden" : true,
                "groupSelector": "#gradeGroup",
                "querySelector" : "#originalGrade"
            },
            {
                "name" : "approach",
                "type" : "text",
                "mandetory" : true,
                "acceptsHTML" : true,
                "querySelector" : "#approach"
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
                "querySelector" : "#length"
            },
            {
                "name" : "pitches",
                "type" : "int",
                "mandetory" : true,
                "querySelector" : "#pitches"
            },
            {
                "name" : "approachTime",
                "type" : "int",
                "mandetory" : true,
                "querySelector" : "#approachTime"
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
                "name" : "referances",
                "type" : "object",
                "multiple" : true,
                "arrayParts" : [
                    {
                        "name" : "url",
                        "type" : "text",
                        "querySelector" : ".url",
                        "visible" : false,
                        "attribute" : "href",
                        "elementSelector" : ".referance",
                        "label" : "Referance URL"
                    },
                    {
                        "name" : "text",
                        "type" : "text",
                        "attribute" : "textContent",
                        "querySelector" : ".referance"
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
                        "label" : "Seasonal Rain"
                    },
                    {
                        "hidden" : true,
                        "name" : "tempH",
                        "type" : "array",
                        "count" : 12,
                        "querySelector" : "#tempH",
                        "groupSelector" : "#temp",
                        "label" : "Monthly High Temp in C"
                    },
                    {
                        "hidden" : true,
                        "name" : "tempL",
                        "type" : "array",
                        "count" : 12,
                        "querySelector" : "#tempL",
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
                        "label" : "Map Images Folder"
                    },
                    {
                        "hidden" : true,
                        "name" : "geo",
                        "type" : "text",
                        "querySelector" : "#geo",
                        "groupSelector" : "#map",
                        "label" : "Geo Location"
                    },
                    {
                        "hidden" : true,
                        "name" : "alt",
                        "type" : "text",
                        "querySelector" : "#mapAlt",
                        "groupSelector" : "#map",
                        "label" : "Alt Text"
                    },
                ]
            }
        ]
    }   
    return mapping;
  }