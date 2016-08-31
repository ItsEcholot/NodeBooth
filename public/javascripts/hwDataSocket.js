/**
 * Created by Marc on 18.08.2016.
 */

var socket = io.connect("http://192.168.178.38:8101");
var reloadMessage = true;

var date = new Date();

var lastMessageTimeStamp = date.getTime();

var initialyMessangesLoaded = false;



$(document).ready(function() {
    $("#speakerButton").click(function () {
        socket.emit('switchToSpeaker');
    });
    $("#headsetButton").click(function () {
        socket.emit('switchToHeadset');
    });
});

socket.on('server-emit', function (data) {

    if($('#systemToggle').hasClass('active')) {
        //CPU
        document.getElementById('core_utilization1').setAttribute("style", "height:" + data.core_utilization[1] + "%;");
        document.getElementById('core_utilization2').setAttribute("style", "height:" + data.core_utilization[2] + "%;");
        document.getElementById('core_utilization3').setAttribute("style", "height:" + data.core_utilization[3] + "%;");
        document.getElementById('core_utilization4').setAttribute("style", "height:" + data.core_utilization[4] + "%;");
        document.getElementById('core_utilization5').setAttribute("style", "height:" + data.core_utilization[5] + "%;");
        document.getElementById('core_utilization6').setAttribute("style", "height:" + data.core_utilization[6] + "%;");
        document.getElementById('core_utilization7').setAttribute("style", "height:" + data.core_utilization[7] + "%;");
        document.getElementById('core_utilization8').setAttribute("style", "height:" + data.core_utilization[8] + "%;");

        document.getElementById('core_utilization1Text').innerHTML = data.core_utilization[1];
        document.getElementById('core_utilization2Text').innerHTML = data.core_utilization[2];
        document.getElementById('core_utilization3Text').innerHTML = data.core_utilization[3];
        document.getElementById('core_utilization4Text').innerHTML = data.core_utilization[4];
        document.getElementById('core_utilization5Text').innerHTML = data.core_utilization[5];
        document.getElementById('core_utilization6Text').innerHTML = data.core_utilization[6];
        document.getElementById('core_utilization7Text').innerHTML = data.core_utilization[7];
        document.getElementById('core_utilization8Text').innerHTML = data.core_utilization[8];

        document.getElementById('cpu_utilization').innerHTML = data.cpu_utilization + "%";
        document.getElementById('cpu_temperature').innerHTML = data.cpu_temperature + "°C";
        document.getElementById('cpu_clock').innerHTML = data.cpu_clock + "MHz";

        //RAM
        document.getElementById('memory_utilization').setAttribute("style", "width:" + data.memory_utilization + "%;");
        document.getElementById('memory_utilizationText').innerHTML = data.memory_used + "MB";

        //GPU
        if (data.fps > 0)
            document.getElementById('fps').innerHTML = "GPU - " + data.fps + " FPS";
        else
            document.getElementById('fps').innerHTML = "GPU";

        document.getElementById('gpu_utilization1').setAttribute("style", "height:" + data.gpu_utilization[1] + "%;");
        document.getElementById('gpu_utilization2').setAttribute("style", "height:" + data.gpu_utilization[2] + "%;");
        document.getElementById('gpu_utilization1Text').innerHTML = data.gpu_utilization[1] + "%";
        document.getElementById('gpu_utilization2Text').innerHTML = data.gpu_utilization[2] + "%";

        document.getElementById('gpu_temperature1').innerHTML = data.gpu_temperature[1] + "°C";
        document.getElementById('gpu_temperature2').innerHTML = data.gpu_temperature[2] + "°C";
        document.getElementById('gpu_fanUtilization1').innerHTML = data.gpu_fanUtilization[1] + "% Fan";
        document.getElementById('gpu_fanUtilization2').innerHTML = data.gpu_fanUtilization[2] + "% Fan";
        document.getElementById('gpu_clock1').innerHTML = data.gpu_clock[1] + "MHz";
        document.getElementById('gpu_clock2').innerHTML = data.gpu_clock[2] + "MHz";

        document.getElementById('gpu_memoryUtilization').setAttribute("style", "width:" + data.gpu_memoryUtilization + "%;");
        document.getElementById('gpu_memoryUsed').innerHTML = data.gpu_memoryUsed + "MB";

        //NET
        document.getElementById('nic2_downloadRate').setAttribute("style", "width:" + data.nic2_downloadUtilization + "%;");
        document.getElementById('nic2_uploadRate').setAttribute("style", "width:" + data.nic2_uploadUtilization + "%;");
        document.getElementById('nic2_downloadRateText').innerHTML = data.nic2_downloadRate + "K";
        document.getElementById('nic2_uploadRateText').innerHTML = data.nic2_uploadRate + "K";
    }

    if($('#musicToggle').hasClass('active')) {
        /*if(data.beatValue == 1) {
            var el     = $('#beatCircle'),
                newone = el.clone(true);

            el.before(newone);

            $("." + el.attr("class") + ":last").remove();
        }*/
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
                '<span class="small pull-right"><b>' + timestampToTime(singleMessage.timeStamp) + '</b></span>' +
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

    //socket.emit('messageSuccess', {hello: "test"});
});

socketEmitLoop();

function socketEmitLoop() {
    setTimeout(function () {
        socket.emit('client-emit', {});
        socketEmitLoop();
    }, 250);
}

var timestampToTime = function (timeStamp) {
    var date = new Date(timeStamp);
    var hours = date.getHours() + 2;
    var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
    var day = date.getDay();
    return days[day] + " " + hours + ':' + minutes;
};