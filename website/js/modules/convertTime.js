export function convertTime(timestamp, options) {
    if (options === null || options === undefined) {
        options =  {timeZone : 'UTC', weekday: 'short', day: "numeric", month: 'long', hour: '2-digit', minute: '2-digit', hour12: false};
    }
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat(navigator.language, options).format(date);
}