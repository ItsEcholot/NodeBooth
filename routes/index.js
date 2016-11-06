module.exports = function (io, simpleTelegram) {
    var config = require('../config.json');
    var express = require('express');
    var rssWatcher = require('rss-watcher');

    var PushBullet = require('pushbullet');
    var pushBullet = new PushBullet(config.pushBulletAPIKey);
    var pushBulletStream = pushBullet.stream();
    pushBulletStream.connect();

    var Forecast = require('forecast');
    var forecast = new Forecast({
        service: 'forecast.io',
        key: config.forecastAPIKey,
        units: 'celcius', // Only the first letter is parsed
        cache: false,      // Cache API requests?
        ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
            minutes: 3,
            seconds: 0
        }
    });
    forecast.get([47.3817, 8.0636], true, function(err, weather) {
        if(err) return console.dir(err);

        forecastTimeOffset = weather.offset;
        currentWeather = weather.currently;
        hourlyWeather = weather.hourly;
        dailyWeather = weather.daily;
    });

    var githubHomeWatcher = new rssWatcher(config.githubRSSFeedURL);
    var gamestarWatcher = new rssWatcher(config.gamestarRSSFeedURL);

    var SerialPort = require('serialport');
    var serialPort = new SerialPort("/dev/ttyACM0", {
        baudRate: 115200,
        autoOpen: true
    });
    serialPort.on('open', function() {
        console.log('Opened serial port');
    });
    serialPort.on('error', function(err) {
        console.log('Error: ', err.message);
    });

    var router = express.Router();


    var returnValues;
    var spotifyReturnValues = "";

    //HW MONITOR
    var core_temperature = [];
    var cpu_temperature;
    var cpu_clock;
    var cpu_utilization;
    var core_utilization = [];

    var memory_utilization;
    var memory_used;

    var mobo_temperature;

    var gpu_temperature = [];
    var gpu_clock = [];
    var gpu_utilization = [];
    var gpu_memoryUsed;
    var gpu_memoryUtilization;
    var gpu_fanUtilization = [];

    var nic2_downloadRate;
    var nic2_downloadUtilization;
    var nic2_uploadRate;
    var nic2_uploadUtilization;

    var fps;


    //SOCIAL MEDIA
    var messages = [];

    //MUSIC
    var beatValue;

    //SPOTIFY
    var spotifyPlaying;
    var spotifyShuffle;
    var spotifyRepeat;
    var spotifyTrack;
    var spotifyPlayingPosition;
    var spotifyVolume;
    var spotifyServerTime;
    var spotifyCoverUrl;

    //WEATHER
    var forecastTimeOffset;
    var currentWeather;
    var hourlyWeather;
    var dailyWeather;

    //LED
    var currentRGB = [0,0,0];
    var animationProgress = 0.0;
    var animationSpeed = 0.0;
    var breathingEnabled = false;

    var addMessage = function (message) {
        message.content = message.content.substr(0,300);
        messages.push(message);
        messages = messages.sort(function(a,b){return b.timeStamp - a.timeStamp});
        if(messages.length > 20)
            messages = messages.slice(0,19);
        console.log("New message: " + message.service);
    };

    var date = new Date();
    var welcomeMessage = {
        "service": "Welcome"
        , "caller": "NodeBooth"
        , "profilePic": ""
        , "content": "Welcome to NodeBooth"
        , "command": ""
        , "args": ""
        , "timeStamp": date.getTime()
    };
    addMessage(welcomeMessage);

    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.render('index', {
            title: 'NodeBooth',
            core_temperature: core_temperature,
            cpu_temperature: cpu_temperature,
            cpu_clock: cpu_clock,
            cpu_utilization: cpu_utilization,
            core_utilization: core_utilization,
            memory_utilization: memory_utilization,
            memory_used: memory_used,
            mobo_temperature: mobo_temperature,
            gpu_temperature: gpu_temperature,
            gpu_clock: gpu_clock,
            gpu_utilization: gpu_utilization,
            gpu_memoryUsed: gpu_memoryUsed,
            gpu_memoryUtilization: gpu_memoryUtilization,
            gpu_fanUtilization: gpu_fanUtilization,
            nic2_downloadRate: nic2_downloadRate,
            nic2_downloadUtilization: nic2_downloadUtilization,
            nic2_uploadRate: nic2_uploadRate,
            nic2_uploadUtilization: nic2_uploadUtilization,
            fps: fps,

            messages: messages.reverse(),

            beatValue: beatValue,

            forecastTimeOffset: forecastTimeOffset,
            currentWeather: currentWeather,
            hourlyWeather: hourlyWeather,
            dailyWeather: dailyWeather
        });
    });

    router.post('/', function (req, res, next) {

        for (var key in req.body.sys) {
            switch (req.body.sys[key].id) {
                case "SCPUCLK":
                    cpu_clock = req.body.sys[key].value;
                    break;
                case "SCPUUTI":
                    cpu_utilization = req.body.sys[key].value;
                    break;
                case "SCPU1UTI":
                    core_utilization[1] = req.body.sys[key].value;
                    break;
                case "SCPU2UTI":
                    core_utilization[2] = req.body.sys[key].value;
                    break;
                case "SCPU3UTI":
                    core_utilization[3] = req.body.sys[key].value;
                    break;
                case "SCPU4UTI":
                    core_utilization[4] = req.body.sys[key].value;
                    break;
                case "SCPU5UTI":
                    core_utilization[5] = req.body.sys[key].value;
                    break;
                case "SCPU6UTI":
                    core_utilization[6] = req.body.sys[key].value;
                    break;
                case "SCPU7UTI":
                    core_utilization[7] = req.body.sys[key].value;
                    break;
                case "SCPU8UTI":
                    core_utilization[8] = req.body.sys[key].value;
                    break;
                case "SMEMUTI":
                    memory_utilization = req.body.sys[key].value;
                    break;
                case "SUSEDMEM":
                    memory_used = req.body.sys[key].value;
                    break;
                case "SGPU1CLK":
                    gpu_clock[1] = req.body.sys[key].value;
                    break;
                case "SGPU2CLK":
                    gpu_clock[2] = req.body.sys[key].value;
                    break;
                case "SGPU1UTI":
                    gpu_utilization[1] = req.body.sys[key].value;
                    break;
                case "SGPU2UTI":
                    gpu_utilization[2] = req.body.sys[key].value;
                    break;
                case "SUSEDVMEM":
                    gpu_memoryUsed = req.body.sys[key].value;
                    break;
                case "SVMEMUSAGE":
                    gpu_memoryUtilization = req.body.sys[key].value;
                    break;
                case "SNIC2DLRATE":
                    nic2_downloadRate = req.body.sys[key].value;
                    break;
                case "SNIC2ULRATE":
                    nic2_uploadRate = req.body.sys[key].value;
                    break;
                case "SRTSSFPS":
                    fps = req.body.sys[key].value;
                    break;
                default:
                    break;
            }
        }

        for (var key in req.body.temp) {
            switch (req.body.temp[key].id) {
                case "TMOBO":
                    mobo_temperature = req.body.temp[key].value;
                    break;
                case "TCPU":
                    cpu_temperature = req.body.temp[key].value;
                    break;
                case "TGPU1DIO":
                    gpu_temperature[1] = req.body.temp[key].value;
                    break;
                case "TGPU2DIO":
                    gpu_temperature[2] = req.body.temp[key].value;
                    break;
                default:
                    break;
            }
        }

        for (var key in req.body.duty) {
            switch (req.body.duty[key].id) {
                case "DGPU1":
                    gpu_fanUtilization[1] = req.body.duty[key].value;
                    break;
                case "DGPU2":
                    gpu_fanUtilization[2] = req.body.duty[key].value;
                    break;
                default:
                    break;
            }
        }

        nic2_downloadUtilization = (nic2_downloadRate / 1600) * 100;
        nic2_uploadUtilization = (nic2_uploadRate / 160) * 100;

        res.send(JSON.stringify(returnValues));

        returnValues = "";
    });

    router.post('/beat', function (req, res, next) {
        beatValue = req.body.beatValue;
        res.sendStatus(200);
    });

    router.post('/spotify', function(req, res, next)    {
        spotifyPlaying = req.body.playing;
        spotifyShuffle = req.body.shuffle;
        spotifyRepeat = req.body.repeat;
        spotifyTrack = req.body.track;
        spotifyPlayingPosition = req.body.playing_position;
        spotifyVolume = req.body.volume;
        spotifyServerTime = req.body.server_time;

        res.send(JSON.stringify(spotifyReturnValues));
        spotifyReturnValues = "";
    });

    router.post('/spotifyCover', function (req, res, next) {
        spotifyCoverUrl = req.body.albumArtUrl;
        res.sendStatus(200);
    });


    io.sockets.on('connection', function (socket) {
        //emit(server_emit)
        socket.emit('server-emit', {
            systemInfo: {
                core_temperature: core_temperature,
                cpu_temperature: cpu_temperature,
                cpu_clock: cpu_clock,
                cpu_utilization: cpu_utilization,
                core_utilization: core_utilization,
                memory_utilization: memory_utilization,
                memory_used: memory_used,
                mobo_temperature: mobo_temperature,
                gpu_temperature: gpu_temperature,
                gpu_clock: gpu_clock,
                gpu_utilization: gpu_utilization,
                gpu_memoryUsed: gpu_memoryUsed,
                gpu_memoryUtilization: gpu_memoryUtilization,
                gpu_fanUtilization: gpu_fanUtilization,
                nic2_downloadRate: nic2_downloadRate,
                nic2_downloadUtilization: nic2_downloadUtilization,
                nic2_uploadRate: nic2_uploadRate,
                nic2_uploadUtilization: nic2_uploadUtilization,
                fps: fps
            },

            messages: messages,

            beatValue: beatValue,

            spotify:    {
                playing: spotifyPlaying,
                shuffle: spotifyShuffle,
                repeat: spotifyRepeat,
                track: spotifyTrack,
                playingPosition: spotifyPlayingPosition,
                volume: spotifyVolume,
                serverTime: spotifyServerTime,
                coverUrl: spotifyCoverUrl
            },

            weather:    {
                forecastTimeOffset: forecastTimeOffset,
                currentWeather: currentWeather,
                hourlyWeather: hourlyWeather,
                dailyWeather: dailyWeather
            }
        });

        //on(client-emit)
        socket.on('client-emit', function (data) {
            socket.emit('server-emit', {
                systemInfo: {
                    core_temperature: core_temperature,
                    cpu_temperature: cpu_temperature,
                    cpu_clock: cpu_clock,
                    cpu_utilization: cpu_utilization,
                    core_utilization: core_utilization,
                    memory_utilization: memory_utilization,
                    memory_used: memory_used,
                    mobo_temperature: mobo_temperature,
                    gpu_temperature: gpu_temperature,
                    gpu_clock: gpu_clock,
                    gpu_utilization: gpu_utilization,
                    gpu_memoryUsed: gpu_memoryUsed,
                    gpu_memoryUtilization: gpu_memoryUtilization,
                    gpu_fanUtilization: gpu_fanUtilization,
                    nic2_downloadRate: nic2_downloadRate,
                    nic2_downloadUtilization: nic2_downloadUtilization,
                    nic2_uploadRate: nic2_uploadRate,
                    nic2_uploadUtilization: nic2_uploadUtilization,
                    fps: fps
                },

                messages: messages,

                beatValue: beatValue,

                spotify:    {
                    playing: spotifyPlaying,
                    shuffle: spotifyShuffle,
                    repeat: spotifyRepeat,
                    track: spotifyTrack,
                    playingPosition: spotifyPlayingPosition,
                    volume: spotifyVolume,
                    serverTime: spotifyServerTime,
                    coverUrl: spotifyCoverUrl
                },

                weather:    {
                    forecastTimeOffset: forecastTimeOffset,
                    currentWeather: currentWeather,
                    hourlyWeather: hourlyWeather,
                    dailyWeather: dailyWeather
                }
            });
            beatValue = 0;
        });



        socket.on('switchToSpeaker', function (data) {
            returnValues = {
                'lineOut': 'speaker'
            };
        });
        socket.on('switchToHeadset', function (data) {
            returnValues = {
                'lineOut': 'headset',
                'lineIn': 'headset'
            };
        });

        socket.on('ledControl', function (data) {
            if(data.r && data.g && data.b) {
                currentRGB = [data.r, data.g, data.b];
                serialPort.write('S ' + data.r + ' ' + data.g + ' ' + data.b + '\r', function (err) {});
            }
        });
        
        socket.on('spotifyControl', function (data) {
            if(data.playing && data.playing=="switch")  {
                spotifyReturnValues = {
                    playing: !spotifyPlaying,
                    nextPrevious: '',
                    volume: -1
                };
            }
            if(data.nextPrevious) {
                switch (data.nextPrevious) {
                    case("next"):
                        spotifyReturnValues = {
                            playing: spotifyPlaying,
                            nextPrevious: 'next',
                            volume: -1
                        };
                        break;
                    case("previous"):
                        spotifyReturnValues = {
                            playing: spotifyPlaying,
                            nextPrevious: 'previous',
                            volume: -1
                        };
                        break;
                    default:

                }
            }

            if(data.volume) {
                spotifyReturnValues = {
                    playing: spotifyPlaying,
                    nextPrevious: '',
                    volume: data.volume
                };
            }
        });
    });

    //LED animation loop
    setInterval(function () {
        animationProgress += animationSpeed;
        
        if(breathingEnabled)    {

        }

        if(animationProgress >= 3.12)
            animationProgress = 0;
    }, 50);


    pushBulletStream.on('connect', function() {
        console.log("Connected to PushBullet Stream");
    });
    pushBulletStream.on('push', function(push) {
        var date = new Date();
        if(push.type == "mirror")   {
            console.log("Received mirror from " + push.application_name);

            var notificationObject = {
                "service": "PushBullet"
                , "caller": push.application_name
                , "profilePic": push.icon
                , "content": push.title + "<br>" + push.body
                , "command": push.title
                , "args": push.title
                , "timeStamp": date.getTime()
                , "pushbullet_notification_id": push.notification_id
            };
            addMessage(notificationObject);
        }
        else if(push.type == "dismissal")   {
            console.log("Received dismissal from " + push.package_name);

            messages = messages.filter(function (item)  {return item.pushbullet_notification_id !== push.notification_id});
            messages[0].timeStamp = date.getTime();
        }
    });
    pushBulletStream.on('close', function() {
        pushBulletStream.connect();
    });
    pushBulletStream.on('error', function() {
        pushBulletStream.connect();
    });




    githubHomeWatcher.run(function (err, articles) {    });

    githubHomeWatcher.on('new article', function (article) {
        var date = new Date();
        var githubHomeObject = {
            "service": "GitHub"
            , "caller": article.author
            , "profilePic": article.image.url
            , "content": article.title
            , "command": article.title
            , "args": article.title
            , "timeStamp": date.getTime()
        };
        addMessage(githubHomeObject);
    });

    gamestarWatcher.run(function (err, articles) {  });

    gamestarWatcher.on('new article', function (article) {
        var date = new Date();
        var gamestarObject = {
            "service": "GameStar"
            , "caller": "GameStar"
            , "profilePic": article.image.url
            , "content": article.description
            , "command": article.title
            , "args": article.title
            , "timeStamp": date.getTime()
        };
        addMessage(gamestarObject);
    });


    //Forecast Interval
    var forecastRefreshMinutes = 3, forecastRefreshInterval = forecastRefreshMinutes * 60 * 1000;
    setInterval(function() {
        forecast.get([47.3817, 8.0636], true, function(err, weather) {
            if(err) return console.dir(err);

            forecastTimeOffset = weather.offset;
            currentWeather = weather.currently;
            hourlyWeather = weather.hourly;
            dailyWeather = weather.daily;

            console.log('Updated Weather data');
        });
    }, forecastRefreshInterval);

    return router;
}