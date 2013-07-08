$(document).ready(function() {
  var messageBuffer = [];
  var messageTemplate = tmpl('messageTemplate');
  var systemMessageTemplate = tmpl('systemMessageTemplate');

  function debug(str){
    $("#debug").html("<p>"+str+"</p>");
  };
  function packAndSend(websocket, message) {
    websocket.send(new Uint8Array(msgpack.pack(message)).buffer)
  };
  function maybeFlushMessageBuffer() {
    if (!$('#pause').is(':checked')) {
      var $msgContainer = $("#msg");
      for (var i = 0; i < messageBuffer.length; i++) {
        var data = messageBuffer[i];
        if (data.message) {
          if (data.icon) {
            $msgContainer.append(messageTemplate(data));
          } else {
            $msgContainer.append(systemMessageTemplate(data));
          }
        } else {
          $msgContainer.append("<pre>" + JSON.stringify(data, undefined, 2) + "</pre><hr>");
        }
      }
      var $children = $msgContainer.children();
      var numToRemove = $children.size() - 100
      if (numToRemove >= 1) {
        $children.filter(':lt(' + numToRemove + ')').remove();
      }

      messageBuffer = [];
      $('html, body').animate({
        scrollTop: $(document).height()-$(window).height()
      }, 100);
    }
  };
  var ws = new WebSocket("ws://limstaging.redrobotlabs.com:50005/test:thing");
  ws.binaryType = 'arraybuffer';
  ws.onmessage = function(evt) {
    var data = evt.data;
    data = msgpack.unpack(new Uint8Array(data));
    if ($.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        messageBuffer.unshift(data[i]);
      }
    } else {
      messageBuffer.push(data);
    }
    maybeFlushMessageBuffer();
  };
  ws.onclose = function() { debug("socket closed"); };
  ws.onopen = function() {
    debug("connected...");
    var message = {
      'id': parseInt($('#message-form select[name=userId] option:selected').val()),
      'token': 'DUMMY_TOKEN',
      'command': '/join global',
      'version': 0
    }
    packAndSend(ws, message);
    message['command'] = '/fetch';
    packAndSend(ws, message);
  };

  $('#message-form').submit(function(e) {
    var message = {
      'id': parseInt($('#message-form select[name=userId] option:selected').val()),
      'token': 'DUMMY_TOKEN',
      'version': 0
    };
    var text = $('#message-form input[name=message]').val();
    if (text[0] == '/') {
      message['command'] = text;
    } else {
      message['message'] = text;
    }
    packAndSend(ws, message);

    // Special case /join
    if (text.indexOf('/join') === 0) {
      $("#msg").html('');
      message['command'] = '/fetch';
      packAndSend(ws, message);
    }

    $('#message-form input[name=message]').val('');
    e.preventDefault();
  });
  $('#pause').change(function() {
    maybeFlushMessageBuffer();
  });
});
