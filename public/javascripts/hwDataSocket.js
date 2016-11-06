/**
 * Created by Marc on 18.08.2016.
 */

var socket = io.connect("http://192.168.178.66:8101");

var date = new Date();

var lastMessageTimeStamp = date.getTime();
var initialyMessangesLoaded = false;

var lastServerEmitData;
var systemSameDataCounter = 0;
var systemHidden = false;

var currentWeatherIcon = new Skycons({"color": "grey"});
var lastWeatherEmitData;
var hourlyWeatherTempGraph;
var hourlyWeatherRainAmountGraph;
var hourlyWeatherRainGraph;

var lastRGBSliderValues = [0,0,0];
var greenSlider;

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
};

function hideSystemTab()    {
    if(!$('#systemToggle').hasClass('hidden') && !$('#system').hasClass('hidden'))  {
        $('#systemToggle').addClass('hidden');
        $('#system').addClass('hidden');

        $('#systemToggle').removeClass('active');
        $('#system').removeClass('active');

        $('#infoCenterToggle').addClass('active');
        $('#infoCenter').addClass('active');
    }
}

function showSystemTab() {
    if($('#systemToggle').hasClass('hidden') && $('#system').hasClass('hidden'))  {
        $('#systemToggle').removeClass('hidden');
        $('#system').removeClass('hidden');
    }
}

$(document).ready(function() {
    $("#speakerButton").click(function () {
        socket.emit('switchToSpeaker');
    });
    $("#headsetButton").click(function () {
        socket.emit('switchToHeadset');
    });

    $('#spotifyPlayPauseButton').click(function () {
        socket.emit('spotifyControl',   {
            playing: "switch"
        });
    });
    $('#spotifyPreviousButton').click(function () {
        socket.emit('spotifyControl', {
            nextPrevious: "previous"
        });
    });
    $('#spotifyNextButton').click(function () {
        socket.emit('spotifyControl', {
            nextPrevious: "next"
        });
    });

    $('#spotifyVolumeSlider').slider({
        min: 0,
        max: 100,
        step: 1,
        tooltip: 'hide',
        value: 100
    }).on('slide', function (ev) {
        socket.emit('spotifyControl', {
            volume: ev.value
        });
    });


    $("#ledPurpleButton").click(function () {
        setLEDColor(255,0,255);
        setLEDSliders(255,0,255);
    });
    $("#ledBlueButton").click(function () {
        setLEDColor(0,0,255);
        setLEDSliders(0,0,255);
    });
    $("#ledDeepSkyBlueButton").click(function () {
        setLEDColor(0,191,255);
        setLEDSliders(0,191,255);
    });
    $("#ledGreenButton").click(function () {
        setLEDColor(0,255,0);
        setLEDSliders(0,255,0);
    });
    $("#ledYellowButton").click(function () {
        setLEDColor(255,200,0);
        setLEDSliders(255,200,0);
    });
    $("#ledWhiteButton").click(function () {
        setLEDColor(255,255,255);
        setLEDSliders(255,255,255);
    });
    $("#ledOrangeButton").click(function () {
        setLEDColor(255,128,0);
        setLEDSliders(255,128,0);
    });
    $("#ledRedButton").click(function () {
        setLEDColor(255,0,0);
        setLEDSliders(255,0,0);
    });
    $("#ledOffButton").click(function () {
        setLEDColor(0,0,0);
        setLEDSliders(0,0,0);
    });


    $('#ledRGBSliderR').slider({
        min: 0,
        max: 255,
        step: 1,
        tooltip: 'hide'
    }).on('slide', function (ev) {
        setLEDColor(ev.value,-1,-1);
    });
    $('#ledRGBSliderG').slider({
        min: 0,
        max: 255,
        step: 1,
        tooltip: 'hide'
    }).on('slide', function (ev) {
        setLEDColor(-1,ev.value,-1);
    });
    $('#ledRGBSliderB').slider({
        min: 0,
        max: 255,
        step: 1,
        tooltip: 'hide'
    }).on('slide', function (ev) {
        setLEDColor(-1,-1,ev.value);
    });


    currentWeatherIcon.add("currentWeatherIcon", "clear-day");

    hourlyWeatherTempGraph = new Chartist.Line('#hourlyWeatherTempGraph', {
        labels: ['Loading', 'Loading', 'Loading'],
        series: [[1,1,1]]
    }, {
        onlyInteger: true,
        fullWidth: true,
        height: 375
    });

    hourlyWeatherRainGraph = new Chartist.Line('#hourlyWeatherRainGraph', {
        labels: ['Loading', 'Loading', 'Loading'],
        series: [[1,2,3]]
    }, {
        fullWidth: true,
        height: 375,
        high: 1,
        low: 0,
        axisX:  {
            showGrid: false,
            showLabel: false
        },
        axisY:  {
            showGrid: false,
            showLabel: false
        }
    });

    hourlyWeatherRainAmountGraph = Chartist.Bar('#hourlyWeatherRainAmountGraph', {
        labels: ['Loading', 'Loading', 'Loading'],
        series: [[1,1,1]]
    }, {
        fullWidth: true,
        height: 375,
        high: 2,
        low: 0,
        axisX:  {
            showGrid: false,
            showLabel: false
        },
        axisY:  {
            showGrid: false,
            showLabel: false
        }
    });

    startTime();
});

socket.on('server-emit', function (data) {

    if(JSON.stringify(data.systemInfo) == lastServerEmitData) {
        systemSameDataCounter++;
        if(systemSameDataCounter > 15) {
            hideSystemTab();
            systemHidden = true;
            systemSameDataCounter = 0;
        }
    }
    else if(systemHidden)   {
        showSystemTab();
        systemHidden = false;
        systemSameDataCounter = 0;
    }
    else {
        systemSameDataCounter = 0;
    }
    lastServerEmitData = JSON.stringify(data.systemInfo);




    if($('#infoCenterToggle').hasClass('active'))   {
        if(JSON.stringify(data.weather) !== lastWeatherEmitData) {
            currentWeatherIcon.set("currentWeatherIcon", data.weather.currentWeather.icon);

            $('#currentWeatherTemperature').html(data.weather.currentWeather.temperature + "°C");
            $('#currentWeatherSummary').html(data.weather.currentWeather.summary);
            if(data.weather.currentWeather.precipType)
                $('#currentWeatherPrecip').html(Math.round(data.weather.currentWeather.precipProbability * 100) + "% " + data.weather.currentWeather.precipType + " - " + Math.round(data.weather.currentWeather.cloudCover * 100) + "% Clouds");
            else
                $('#currentWeatherPrecip').html(Math.round(data.weather.currentWeather.precipProbability * 100) + "% Rain - " + Math.round(data.weather.currentWeather.cloudCover * 100) + "% Clouds");
            $('#currentWeatherWind').html(Math.round(data.weather.currentWeather.windSpeed * 1.60934) + " km/h Wind");


            var counter = 0;
            var hourlyLabels = [];
            var hourlyTempData = [];
            var hourlyRainData = [];
            var hourlyRainAmountData = [];

            data.weather.hourlyWeather.data.forEach(function (hourData) {
                if(counter <= 24) {
                    hourlyLabels.push(timestampToHour(hourData.time));
                    hourlyTempData.push(hourData.temperature);
                    hourlyRainData.push(hourData.precipProbability);
                    hourlyRainAmountData.push(hourData.precipIntensity);
                }
                counter++;
            });

            setTimeout(function () {
                hourlyWeatherTempGraph.update({
                    labels: hourlyLabels,
                    series: [hourlyTempData]
                });
                hourlyWeatherRainGraph.update({
                    labels: hourlyLabels,
                    series: [hourlyRainData]
                });
                hourlyWeatherRainAmountGraph.update({
                    labels: hourlyLabels,
                    series: [hourlyRainAmountData]
                });
            }, 250);
        }
        lastWeatherEmitData = JSON.stringify(data.weather);
    }

    if($('#systemToggle').hasClass('active')) {
        //CPU
        document.getElementById('core_utilization1').setAttribute("style", "height:" + data.systemInfo.core_utilization[1] + "%;");
        document.getElementById('core_utilization2').setAttribute("style", "height:" + data.systemInfo.core_utilization[2] + "%;");
        document.getElementById('core_utilization3').setAttribute("style", "height:" + data.systemInfo.core_utilization[3] + "%;");
        document.getElementById('core_utilization4').setAttribute("style", "height:" + data.systemInfo.core_utilization[4] + "%;");
        document.getElementById('core_utilization5').setAttribute("style", "height:" + data.systemInfo.core_utilization[5] + "%;");
        document.getElementById('core_utilization6').setAttribute("style", "height:" + data.systemInfo.core_utilization[6] + "%;");
        document.getElementById('core_utilization7').setAttribute("style", "height:" + data.systemInfo.core_utilization[7] + "%;");
        document.getElementById('core_utilization8').setAttribute("style", "height:" + data.systemInfo.core_utilization[8] + "%;");

        document.getElementById('core_utilization1Text').innerHTML = data.systemInfo.core_utilization[1];
        document.getElementById('core_utilization2Text').innerHTML = data.systemInfo.core_utilization[2];
        document.getElementById('core_utilization3Text').innerHTML = data.systemInfo.core_utilization[3];
        document.getElementById('core_utilization4Text').innerHTML = data.systemInfo.core_utilization[4];
        document.getElementById('core_utilization5Text').innerHTML = data.systemInfo.core_utilization[5];
        document.getElementById('core_utilization6Text').innerHTML = data.systemInfo.core_utilization[6];
        document.getElementById('core_utilization7Text').innerHTML = data.systemInfo.core_utilization[7];
        document.getElementById('core_utilization8Text').innerHTML = data.systemInfo.core_utilization[8];

        document.getElementById('cpu_utilization').innerHTML = data.systemInfo.cpu_utilization + "%";
        document.getElementById('cpu_temperature').innerHTML = data.systemInfo.cpu_temperature + "°C";
        document.getElementById('cpu_clock').innerHTML = data.systemInfo.cpu_clock + "MHz";

        //RAM
        document.getElementById('memory_utilization').setAttribute("style", "width:" + data.systemInfo.memory_utilization + "%;");
        document.getElementById('memory_utilizationText').innerHTML = data.systemInfo.memory_used + "MB";

        //GPU
        if (data.systemInfo.fps > 0)
            document.getElementById('fps').innerHTML = "GPU - " + data.systemInfo.fps + " FPS";
        else
            document.getElementById('fps').innerHTML = "GPU";

        document.getElementById('gpu_utilization1').setAttribute("style", "height:" + data.systemInfo.gpu_utilization[1] + "%;");
        document.getElementById('gpu_utilization2').setAttribute("style", "height:" + data.systemInfo.gpu_utilization[2] + "%;");
        document.getElementById('gpu_utilization1Text').innerHTML = data.systemInfo.gpu_utilization[1] + "%";
        document.getElementById('gpu_utilization2Text').innerHTML = data.systemInfo.gpu_utilization[2] + "%";

        document.getElementById('gpu_temperature1').innerHTML = data.systemInfo.gpu_temperature[1] + "°C";
        document.getElementById('gpu_temperature2').innerHTML = data.systemInfo.gpu_temperature[2] + "°C";
        document.getElementById('gpu_fanUtilization1').innerHTML = data.systemInfo.gpu_fanUtilization[1] + "% Fan";
        document.getElementById('gpu_fanUtilization2').innerHTML = data.systemInfo.gpu_fanUtilization[2] + "% Fan";
        document.getElementById('gpu_clock1').innerHTML = data.systemInfo.gpu_clock[1] + "MHz";
        document.getElementById('gpu_clock2').innerHTML = data.systemInfo.gpu_clock[2] + "MHz";

        document.getElementById('gpu_memoryUtilization').setAttribute("style", "width:" + data.systemInfo.gpu_memoryUtilization + "%;");
        document.getElementById('gpu_memoryUsed').innerHTML = data.systemInfo.gpu_memoryUsed + "MB";

        //NET
        document.getElementById('nic2_downloadRate').setAttribute("style", "width:" + data.systemInfo.nic2_downloadUtilization + "%;");
        document.getElementById('nic2_uploadRate').setAttribute("style", "width:" + data.systemInfo.nic2_uploadUtilization + "%;");
        document.getElementById('nic2_downloadRateText').innerHTML = data.systemInfo.nic2_downloadRate + "K";
        document.getElementById('nic2_uploadRateText').innerHTML = data.systemInfo.nic2_uploadRate + "K";
    }

    if($('#musicToggle').hasClass('active')) {
        document.getElementById('spotifyTitle').innerHTML = data.spotify.track.track_resource.name;
        document.getElementById('spotifyArtist').innerHTML = data.spotify.track.artist_resource.name;
        document.getElementById('spotifyAlbum').innerHTML = data.spotify.track.album_resource.name;
        document.getElementById('spotifyAlbumArt').setAttribute('src', data.spotify.coverUrl);

        document.getElementById('spotifyPlayingPositionTime').innerHTML = data.spotify.playingPosition.toString().toHHMMSS();
        document.getElementById('spotifyPlayingPositionProgressbar').setAttribute('style', 'width:' + data.spotify.playingPosition/(data.spotify.track.length/100) + "%;");
        document.getElementById('spotifyPlayingPositionTimeTotal').innerHTML = data.spotify.track.length.toString().toHHMMSS();

        if(data.spotify.playing)
            document.getElementById('spotifyPlayPauseButton').firstElementChild.setAttribute('class', 'glyphicon glyphicon-pause');
        else
            document.getElementById('spotifyPlayPauseButton').firstElementChild.setAttribute('class', 'glyphicon glyphicon-play');


    }
    
    //MESSAGES
    if(data.messages[0].timeStamp > lastMessageTimeStamp || !initialyMessangesLoaded) {
        lastMessageTimeStamp = data.messages[0].timeStamp;

        var messagesHTML = '';
        data.messages.forEach(function (singleMessage) {
            var html = '' +
                '<div class="row">' +
                '<div class="col-lg-12">' +
                '<div class="media">' +
                '<a href="#" class="pull-left">';

            switch (singleMessage.service) {
                case "Telegram":
                    html += '<img src="/images/telegram.png" alt="" class="media-object img-circle">';
                    break;
                case "GitHub":
                    html += '<img src="/images/github.png" alt="" class="media-object img-circle" style="width: 30px; height: 30px;">';
                    break;
                case "GameStar":
                    html += '<img src="/images/gamestar.png" alt="" class="media-object img-circle" style="width: 30px; height: 30px;">';
                    break;
                case "PushBullet":
                    html += '<img src="data:image/jpeg;base64,'+singleMessage.profilePic+'" alt="" class="media-object img-circle" style="width: 30px; height: 30px;">';
                    break;
                default:
                    html += '<img src="" alt="" class="media-object img-circle">';
                    break;
            }

            html += '' +
                '</a>' +
                '<div class="media-body">' +
                '<h4 class="media-heading">' +
                '<b>' + singleMessage.caller + '</b>' +
                '<span class="small pull-right"><b>' + timestampToTimeString(singleMessage.timeStamp) + '</b></span>' +
                '</h4>' +
                '<p><b>' + singleMessage.content + '</b></p>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<hr>';

            messagesHTML += html;
        });

        document.getElementById('messageDiv').innerHTML = messagesHTML;
        initialyMessangesLoaded = true;
    }
});

socketEmitLoop();

function socketEmitLoop() {
    setTimeout(function () {
        socket.emit('client-emit', {});
        socketEmitLoop();
    }, 250);
}

var timestampToTimeString = function (timeStamp) {
    var date = new Date(timeStamp);
    var hours = date.getHours();
    var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
    var day = date.getDay();
    return days[day] + " " + hours + ':' + minutes;
};

var timestampToHour = function (timeStamp) {
    var date = new Date(timeStamp*1000);
    return date.getHours();
};

function startTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    m = checkTime(m);
    s = checkTime(s);
    document.getElementById('currentTimeValue').innerHTML =
        h + ":" + m;
    var t = setTimeout(startTime, 500);
}
function checkTime(i) {
    if (i < 10) {i = "0" + i}  // add zero in front of numbers < 10
    return i;
}

function setLEDColor(r, g, b)   {
    if(r != -1)
        lastRGBSliderValues[0] = r;
    if(g != -1)
        lastRGBSliderValues[1] = g;
    if(b != -1)
        lastRGBSliderValues[2] = b;

    socket.emit('ledControl', {
        r: lastRGBSliderValues[0],
        g: lastRGBSliderValues[1],
        b: lastRGBSliderValues[2]
    });
}
function setLEDSliders(r, g, b)   {
    if(r != -1)
        $('#ledRGBSliderR').slider('setValue', r);
    if(g != -1)
        $('#ledRGBSliderG').slider('setValue', g);
    if(b != -1)
        $('#ledRGBSliderB').slider('setValue', b);
}