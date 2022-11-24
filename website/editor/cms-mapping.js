export function cmsMapping() {
    const mapping = {
        "attributes" : [
            {
                "name" : "intro",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : ".big-card-body p"
            },
            {
                "name" : "approach",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : "#approach"
            },
            {
                "name" : "pitchInfo",
                "type" : "text",
                "mandetory" : false,
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
                "mandetory" : false,
                "multiple" : true,
                "objectName" : "guidebookAttributes"
            }
        ],
        "guidebookAttributes" : [
            {
                "name" : "isbn",
                "type" : "int",
                "mandetory" : false,
                "querySelector" : ".guide-isbn"
            },
            { 
                "name" : "title",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : ".guide-name"
            },
            { 
                "name" : "description",
                "type" : "text",
                "mandetory" : true,
                "querySelector" : ".guide-desc"
            },
            { 
                "name" : "rrp",
                "type" : "float",
                "mandetory" : false,
                "querySelector" : ".guide-rrp"
            },
            { 
                "name" : "pg",
                "type" : "int",
                "mandetory" : false,
                "querySelector" : ".page"
            }
        ]
    }
    
    return mapping;
  }