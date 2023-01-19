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
                "name" : "rockType",
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
            }
        ]
    }   
    return mapping;
  }