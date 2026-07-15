# get climbing weather

*Daily Lambda (`lambdaGetWeather`) that fetches the weather for every published climb and writes `climbing-data-extended-weather.json` to the `multi-pitch.data` S3 bucket.*

## Provider: Open-Meteo

Weather comes from [Open-Meteo](https://open-meteo.com) — free for non-commercial use, **no API key required**. One request per climb returns everything:

```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &daily=weather_code,temperature_2m_max,temperature_2m_min,...
  &past_days=4&forecast_days=8
  &timezone=auto&timeformat=unixtime&wind_speed_unit=ms
```

- `past_days=4` + `forecast_days=16` → 20 days: `offsetMinus4..1`, `currently` (today), `offsetPlus1..15` (the old OWM feed stopped at `offsetPlus7`; consumers of the old shape keep working).
- `hourly=...&forecast_hours=72` → per-climb `hourly` object of parallel arrays (`time`, `icon` incl. night variants, `temperature`, `feelsLike`, `precipIntensity`, `precipProbability`, `windSpeed`, `windGust`, `windBearing`, `uvIndex`) covering the next 72 hours — powers the BBC-style hour-by-hour panel.
- `timezone=auto` → the response includes the crag's IANA timezone (`Europe/London`, ...), exposed per climb as `timezone` / `utcOffsetSeconds` so the frontend can show local time at the crag.
- `timeformat=unixtime` → all times are unix UTC seconds, as before.
- `wind_speed_unit=ms` → wind speed/gust in m/s, as before.

> History: DarkSky → OpenWeatherMap One Call (2.5, then 3.0) → Open-Meteo (July 2026).
> The OWM 3.0 endpoint required a separate paid subscription and the generator had been
> silently failing (every climb emitted `{"routes":[],"status":"REQUEST_DENIED"}`).
> The migration also fixed a `wind_deg * 10` bearing bug and a broken icon map
> (duplicate keys meant fog always rendered as "wind").

## Output schema (unchanged)

Array with one element per published climb:

```jsonc
{
  "climbId": 1,
  "timezone": "Europe/London",      // NEW: IANA zone at the crag
  "utcOffsetSeconds": 3600,         // NEW
  "currently": {
    "time": 1783746000,             // unix UTC seconds (local noon of the day)
    "icon": "rain",                 // clear-day | partly-cloudy-day | cloudy | fog | rain | sleet | snow
    "description": "moderate rain",
    "precipIntensity": 3.2,         // mm/day
    "precipProbability": 0.75,      // 0..1
    "temperatureHigh": 17.0,        // °C
    "temperatureMin": 7.5,          // °C
    "pressure": 1013.2,             // hPa
    "humidity": 0.87,               // 0..1
    "cloudCover": 80,               // 0..100
    "windGust": 9.8,                // m/s
    "windBearing": 17,              // degrees 0..360
    "windSpeed": 5.4,               // m/s
    "uvIndex": 6.4,
    "sunriseTime": 1783722908,      // 0 when the sun doesn't rise/set (polar day/night)
    "sunsetTime": 1783778558,
    "alerts": [],                   // kept for schema compatibility (Open-Meteo has no alerts)
    "new_fields": {
      "moonPhase": 0.02,            // computed locally from the synodic cycle (0/1 new, 0.5 full)
      "dewPoint": 11.2,             // °C daily mean - basis for a future friction indicator
      "temperature": {...}, "feelsLike": {...}, "weather": [...]
    }
  },
  "offsetPlus1": { ... },           // same shape, through offsetPlus15
  "offsetMinus1": { ... }           // same shape, through offsetMinus4
}
```

On a per-climb failure the element is `{"routes": [], "status": "REQUEST_DENIED"}` (legacy shape the frontend tolerates).

## Test / deploy

```bash
npm test                                        # unit tests against a saved fixture
REAL_RUN=1 npx mocha test/getWeatherOM.realRun.js  # hits the live API, writes resp.json
./deploy.sh                                     # test + zip + update lambda (profile: multipitch)
```

The Lambda is triggered by an EventBridge schedule configured in AWS (not in this repo). The `O_W_KEY` env var is no longer needed.
