export function returnClimbURL(route, cliff) {
    let folderName = `${route.trim()}-on-${cliff.trim()}`
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/\//g, "")
        .replace(/ /g, "-");
    folderName += '/';
    return folderName;
}