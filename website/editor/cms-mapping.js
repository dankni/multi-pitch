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
            }
        ]
    }
    return mapping;
  }