var CACHE_OFFLINE = 'multi-pitch-cache-save-offline-v1-';

function toggleOfflineImg(climbName) {
    return caches.keys()
        .then(cacheNames => cacheNames.filter(name => name === CACHE_OFFLINE + climbName))
        .then(function (match) {
            if (match.length > 0) {
                document.querySelector("div[data-climb-id=" + climbName + "] .offline-img-no")
                    .style.display = "none";
                document.querySelector("div[data-climb-id=" + climbName + "] .offline-img-yes")
                    .style.display = "";
            } else {
                document.querySelector("div[data-climb-id=" + climbName + "] .offline-img-no")
                    .style.display = "";
                document.querySelector("div[data-climb-id=" + climbName + "] .offline-img-yes")
                    .style.display = "none";
            }
        })
}

function saveClimbForOffline(climbName, urlsToSave) {

    caches.open(CACHE_OFFLINE + climbName).then(function (cache) {
        var promiseAll = urlsToSave.map(url =>
            fetch(url)
                .then(function () {
                    return url;
                })
                .catch(err => console.error("Error while fetching url: ", url, "with error:", err)));

        Promise.all(promiseAll)
            .then(function (urls) {
                return cache.addAll(urls);
            })
            .then(a => toggleOfflineImg(climbName))
            .catch(err => console.error("Error while fetching url: ", url, "with error:", err))

    });
}

function deleteClimbFromCache(climbName) {
    caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames
                .filter(name => name === CACHE_OFFLINE + climbName)
                .map(names => caches.delete(names)))
            .then(a => toggleOfflineImg(climbName));
    })
}