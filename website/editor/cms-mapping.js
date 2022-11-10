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
            }
        ]
    }
    return mapping;
  }