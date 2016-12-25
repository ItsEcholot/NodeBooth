module.exports = function (io, simpleTelegram) {
    var config = require('../config.json');
    var express = require('express');
    var rssWatcher = require('rss-watcher');
    var readlineSync = require('readline-sync');
    var cobs = require('cobs');

    var PushBullet = require('pushbullet');
    var pushBullet = new PushBullet(config.pushBulletAPIKey);
    var pushBulletStream = pushBullet.stream();
    pushBulletStream.connect();

    var SpotifyWebApi = require('spotify-web-api-node');
    var spotifyWebApi = new SpotifyWebApi({
        clientId: config.spotifyClientID,
        clientSecret: config.spotifyClientSecret,
        redirectUri: config.spotifyCallbackURL
    });
    var spotifyAuthorizeURL = spotifyWebApi.createAuthorizeURL(config.spotifyScopes, config.spotifyState);
    console.log(spotifyAuthorizeURL);
    spotifyWebApi.authorizationCodeGrant(readlineSync.question('Spotify Authorization Code')).then(function (data) {
        console.log('The token expires in ' + data.body['expires_in']);
        console.log('The access token is ' + data.body['access_token']);
        console.log('The refresh token is ' + data.body['refresh_token']);

        // Set the access token on the API object to use it in later calls
        spotifyWebApi.setAccessToken(data.body['access_token']);
        spotifyWebApi.setRefreshToken(data.body['refresh_token']);

        setInterval(function () {
            spotifyWebApi.refreshAccessToken()
                .then(function(data) {
                    console.log('The spotify access token has been refreshed!');

                    // Save the access token so that it's used in future calls
                    spotifyWebApi.setAccessToken(data.body['access_token']);
                }, function(err) {
                    console.log('Could not refresh spotify access token', err);
                });
        }, data.body['expires_in']*1000);
    }, function (err) {
        console.log('Spotify authorization code error!', err);
    });

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

    var dgram = require('dgram');
    var udpServer = dgram.createSocket('udp4');


    var githubHomeWatcher = new rssWatcher(config.githubRSSFeedURL);
    var gamestarWatcher = new rssWatcher(config.gamestarRSSFeedURL);

    var SerialPort = require('serialport');
    var serialPort = new SerialPort("/dev/ttyACM0", {
        baudRate: 921600,
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
    var level;
    var spectrumData = [];
    //SPOTIFY
    var spotifyPlaying;
    var spotifyShuffle;
    var spotifyRepeat;
    var spotifyTrack;
    var spotifyPlayingPosition;
    var spotifyVolume;
    var spotifyServerTime;
    var spotifyCoverUrl;

    //VIDEO
    var youtubeVideoId;

    //WEATHER
    var forecastTimeOffset;
    var currentWeather;
    var hourlyWeather;
    var dailyWeather;

    //LED
    var lastSolidColor = [];
    var serialAnswerCollection;
    var ambilightEnabled = false;
    var beatLedReactionEnabled = false;
    var gammaCorrectionEnabled = false;



    var addMessage = function (message) {
        message.content = message.content.substr(0,300);
        messages.push(message);
        messages = messages.sort(function(a,b){return b.timeStamp - a.timeStamp});
        if(messages.length > 50)
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

        returnValues = {
            'ambilight': ambilightEnabled ? 'on' : 'off',
            'beatAction': beatLedReactionEnabled ? 'on' : 'off'
        };

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
    router.get('/spotifyWebApi/myMusic/add/:id', function (req, res, next) {
        spotifyWebApi.addToMySavedTracks([req.params.id]).then(function (data) {
            res.json({
                success: true
            })
        }, function (err) {
            res.json({
                success: false,
                error: err
            });
        });
    });
    router.get('/spotifyWebApi/myMusic/contains/:id', function (req, res, next) {
        spotifyWebApi.containsMySavedTracks([req.params.id]).then(function (data) {
            var trackIsInYourMusic = data.body[0];
            if(trackIsInYourMusic)
                res.json({
                    trackContains: true,
                    success: true
                });
            else
                res.json({
                    trackContains: false,
                    success: true
                });
        }, function (err) {
            res.json({
                success: false,
                error: err
            });
        });
    });
    router.get('/spotifyWebApi/playlist/get/:playlistid', function (req, res, next) {
        spotifyWebApi.getPlaylist(config.spotifyUserID, req.params.playlistid).then(function (data) {
            res.json({
                success: true,
                data: data.body
            });
        }, function (err) {
            res.json({
                success: false,
                error: err
            })
        });
    });
    router.get('/spotifyWebApi/playlist/add/:playlistid/:trackid', function (req, res, next) {
        spotifyWebApi.addTracksToPlaylist(config.spotifyUserID, req.params.playlistid, ["spotify:track:"+req.params.trackid]).then(function (data) {
            res.json({
                success: true
            });
        }, function (err) {
            res.json({
                success: false,
                error: err
            });
        });
    });
    router.get('/spotifyWebApi/playlist/removeAllOccurence/:playlistid/:snapshotid/:trackid', function (req, res, next) {
        spotifyWebApi.removeTracksFromPlaylist(config.spotifyUserID, req.params.playlistid, {tracks: [{uri: "spotify:track:"+req.params.trackid}]}, {snapshot_id: decodeURIComponent(req.params.snapshotid)}).then(function (data) {
            res.json({
                success: true
            })
        }, function (err) {
            res.json({
                success: false,
                error: err
            });
        });
    });

    router.get('/video/youtube/setID/:id', function (req, res, next) {
        if(req.params.id)   {
            youtubeVideoId = req.params.id;
        }
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
            level: level,
            spectrumData: spectrumData,

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

            video:  {
                youtubeVideoId: youtubeVideoId
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
                level: level,
                spectrumData: spectrumData,

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

                video:  {
                    youtubeVideoId: youtubeVideoId
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
            if(data.paramsArray)  {
                var cobsArray = cobs.encode(new Buffer(data.paramsArray));
                for(var i=0; i<cobsArray.length; i++)  {
                    var newByteArray = [cobsArray[i]];
                    serialPort.write(newByteArray);
                }

                if(data.paramsArray[0] == 10)   {
                    lastSolidColor[0] = data.paramsArray[2];
                    lastSolidColor[1] = data.paramsArray[3];
                    lastSolidColor[2] = data.paramsArray[4];
                }
            }
            if(data.ambilight)   {
                if(data.ambilight == 'on') {
                    ambilightEnabled = true;
                }
                else if(data.ambilight == 'off') {
                    ambilightEnabled = false;
                }
            }
            if(data.beatAction) {
                if(data.beatAction == 'on') {
                    beatLedReactionEnabled = true;
                }
                else if(data.beatAction == 'off') {
                    beatLedReactionEnabled = false;
                }
            }
        });
        serialPort.on('data', function (data) {
            serialAnswerCollection += data.toString('hex');
            
            socket.emit('serialData', {
                data: data.toString('hex')
            });
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

    udpServer.on('listening', function () {
        var address = udpServer.address();
        console.log("UDP server listening " + address.address + ":" + address.port);
    });
    udpServer.on('message', function (msg, rinfo) {
        switch (msg[0]) {
            case 0xFE:
                level = msg[1];
                for(var i=2; i<msg.length; i++) {
                    spectrumData[i-2] = msg[i];
                }
                if(beatLedReactionEnabled)
                    beatVisualizer();
                break;
            case 0xFD:
                if(beatLedReactionEnabled)
                    beatAction();
                break;
            default:
                serialPort.write(msg);
                break;
        }
    });
    function beatAction()   {
        //var cobsArray = cobs.encode(new Buffer([10, 12, Math.floor(Math.random()*(255-25+1)+25), Math.floor(Math.random()*(255-25+1)+25), Math.floor(Math.random()*(255-25+1)+25)]));
        //serialPort.write(cobsArray);
        serialPort.write(cobs.encode(new Buffer([3,0,22,lastSolidColor[0],lastSolidColor[1],lastSolidColor[2]])));
        serialPort.write(cobs.encode(new Buffer([12,5,0,22,0,0,0])));
        serialPort.write(cobs.encode(new Buffer([3,31,49,lastSolidColor[0],lastSolidColor[1],lastSolidColor[2]])));
        serialPort.write(cobs.encode(new Buffer([12,5,31,49,0,0,0])));
    }
    function beatVisualizer()   {
        //8 leds 16 bands
        var spec01Percentage = (((spectrumData[0]+spectrumData[1])/2)/100);
        var spec23Percentage = (((spectrumData[2]+spectrumData[3])/2)/100);
        var spec45Percentage = (((spectrumData[4]+spectrumData[5])/2)/100);
        var spec67Percentage = (((spectrumData[6]+spectrumData[7])/2)/100);
        var spec89Percentage = (((spectrumData[8]+spectrumData[9])/2)/100);
        var spec1011Percentage = (((spectrumData[10]+spectrumData[11])/2)/100);
        var spec1213Percentage = (((spectrumData[12]+spectrumData[13])/2)/100);
        var spec1415Percentage = (((spectrumData[14]+spectrumData[15])/2)/100);
        serialPort.write(cobs.encode(new Buffer([11, 10, 30, 255*spec01Percentage, 0, 255*spec01Percentage])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 29, 255*spec23Percentage, 0, 30*spec23Percentage])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 28, 255*spec45Percentage, 0, 0])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 27, 255*spec67Percentage, 50*spec67Percentage, 0])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 26, 255*spec89Percentage, 127*spec89Percentage, 0])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 25, 0, 255*spec1011Percentage, 0])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 24, 0, 175*spec1213Percentage, 255*spec1213Percentage])));
        serialPort.write(cobs.encode(new Buffer([11, 10, 23, 0, 0, 255*spec1415Percentage])));
    }

    pushBulletStream.on('connect', function() {
        console.log("Connected to PushBullet Stream");
    });
    pushBulletStream.on('push', function(push) {
        var date = new Date();
        if(push.type == "mirror")   {
            var pushAlreadyExists = false;
            for(var i=0; i<messages.length; i++)    {
                if(messages[i].body == push.body)   {
                    pushAlreadyExists = true;
                }
            }

            if(!pushAlreadyExists) {
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
        }
        else if(push.type == "dismissal")   {
            console.log("Received dismissal from " + push.package_name);

            messages = messages.filter(function (item)  {return item.pushbullet_notification_id !== push.notification_id});
            if(messages[0])
                messages[0].timeStamp = date.getTime();
            else if(messages[1])
                messages[1].timeStamp = date.getTime();
        }
    });
    pushBulletStream.on('close', function() {
        console.log('PushBullet Closed');
    });
    pushBulletStream.on('error', function() {
        console.log('PushBullet error');
    });
    var pushBulletReconnectHours = 4, pushBulletReconnectInterval = pushBulletReconnectHours * 60 * 60 * 1000;
    setInterval(function () {
        console.log('PushBullet Reconnect...');
        pushBulletStream.close();
        pushBulletStream.connect();
    }, pushBulletReconnectInterval);


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

    udpServer.bind(8102);
    return router;
}