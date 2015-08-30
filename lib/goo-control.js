(function() {


function Events(target){
  var events = {}, i, A = Array;
  target = target || this
    /**
     *  On: listen to events
     */
    target.on = function(type, func, ctx){
      events[type] || (events[type] = [])
      events[type].push({f:func, c:ctx})
    }
    /**
     *  Off: stop listening to event / specific callback
     */
    target.off = function(type, func){
      var list = events[type] || [],
      i = list.length = func ? list.length : 0
      while(i-->0) func == list[i].f && list.splice(i,1)
    }
    /** 
     * Emit: send event, callbacks will be triggered
     */
    target.emit = function(){
      var args = A.apply([], arguments),
      list = events[args.shift()] || [], 
      i = list.length, j
      for(j=0;j<i;j++) list[j].f.apply(list[j].c, args)
    };
}
var u, module, cjs = module != u;
(cjs ? module : window)[(cjs ? 'exports' : 'Events')] = Events;


(function() {
"use strict";


var ON_LOAD_MESSAGE = 'hej!';


parent.postMessage(ON_LOAD_MESSAGE, "*");


//
// Channel
// -------
//


var channel = function(otherWindow) {

    var eventEmitter = {
        sendEvent: function(type, value) {
            sendMessage(otherWindow, type, value);
        }
    };

    Events(eventEmitter);

    listenForMessages(function(d) {
        eventEmitter.emit(d.type, d.value);
    });

    return eventEmitter;
};


var sendMessage = function(win, type, value) {
    win.postMessage(JSON.stringify({type: type, value: value}), '*');
};


var listenForMessages = function(fn) {
    on(window, 'message', function(m) {
        var d = parseMessage(m);
        if (d) {
            fn(d);
        }
    });
};


var parseMessage = function(m) {
    // Don't listen to stuff we send ourselves!
    if (m.source === window) {
        return;
    }

    var d;
    try {
        d = JSON.parse(m.data);
    } catch (ev) {
        d = {};
    }

    if (d.type) {
        return d;
    }
};


// RPC
// ---


var configureRpc = function(chan, commands) {
    chan.on('_command', function(v) {
        handleCommand(v, chan, commands);
    });
};


var sendCommand = function(chan, type, value, fn) {

    var key = Math.random();

    chan.on(key, function(v) {
        chan.off(key);
        fn && fn(v);
    });

    chan.sendEvent("_command", {
        name: type,
        value: value,
        key: key
    });

};


var handleCommand = function(d, chan, commands) {
    var handler = commands[d.name];
    if (!handler) {
        chan.sendEvent(d.key, -1);
        return;
    }

    chan.sendEvent(d.key, handler(d.value));
};


//
// Loading a scene into an iframe
// ------------------------------
// 


var createIframe = function(url) {

    var iframe = document.createElement('iframe');
    iframe.allowTransparency = true;
    iframe.src = url;
    iframe.frameBorder = 0;
    iframe.style.width = "245px";
    iframe.style.height = "485px";

    return iframe;
};


var removeIframe = function(iframe) {
    iframe.parentNode.removeChild(iframe);
};


var tryLoad = function(url, elementId, onFail, onSuccess) {
    var container = document.getElementById(elementId);
    var iframe = createIframe(url);

    var saidHello = false;
    var listenForHello = function(m) {
        if (m.source !== iframe.contentWindow) {
            return;
        }
        if (m.data === ON_LOAD_MESSAGE) {
            saidHello = true;
            clearTimeout(helloTimeout);
            off(window, 'message', listenForHello);
        }
    };
    on(window, 'message', listenForHello, false);

    var onNoHej = function() {
        // may not have been triggered by the setTimeout
        clearTimeout(helloTimeout);
        removeIframe(iframe);
        off(window, 'message', listenForHello);
        onFail && onFail();
    };

    var helloTimeout;
    // if there's a plan for failure configure this timeout.
    if (onFail) {
        helloTimeout = setTimeout(onNoHej, 5000);
    }

    var ts = new Date();
    iframe.onload = function() {
        if (!saidHello && onFail) {
            onNoHej();
            return;
        }

        var iframeLoadTime = new Date() - ts;

        setupMousemoveProxy(iframe);

        onSuccess && onSuccess(control(iframe.contentWindow), iframe);
    };

    container.appendChild(iframe);
};


var scriptEvaluatedTs = new Date();
var load = function(url, elementId, cb) {
    var politeLoadTime = new Date() - scriptEvaluatedTs;
    var onFail = function() {
        tryLoad(url, elementId, null, cb);
    };
    tryLoad(url, elementId, onFail, cb);
};


//
// IE8 compat
// ----------
//


var on = function(el, event, callback) {
    if (el.addEventListener) {
        el.addEventListener(event, callback, false);
    }else {
        el.attachEvent('on' + event, callback);
    }
};


var off = function(el, event, callback) {
    if (el.removeEventListener) {
        el.removeEventListener(event, callback, false);
    }else {
        el.detachEvent('on' + event, callback);
    }
};


//
// Helpers
//


// Silence all console.* and alerts calls.
var silence = function() {

    // Console-polyfill. MIT license.
    // https://github.com/paulmillr/console-polyfill
    (function(con) {
    var prop, method;
    var empty = {};
    var dummy = function() {};
    var properties = 'memory'.split(',');
    var methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
        'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
        'table,time,timeEnd,timeStamp,trace,warn').split(',');
    while (prop = properties.pop()) con[prop] = con[prop] || empty;
    while (method = methods.pop()) con[method] = con[method] || dummy;
    })(window.console = {});

    window.alert = function() {};
};


// Proxy the mousemoves into the iframe.
var setupMousemoveProxy = function(iframe) {

    var mx, my;

    var mousemove = function () {

        // jQueryish ---
        var doc = document.documentElement;
        var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
        var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
        // /---

        var r = iframe.getBoundingClientRect();
        var d = {
            type: 'mousemove',
            pageX: mx,
            pageY: my,
            top: r.top,
            left: r.left,
            scrollX: left,
            scrollY: top
        };

        iframe.contentWindow.postMessage(JSON.stringify(d), "*");
    };

    on(window, 'mousemove', function(e) {
        mx = e.pageX;
        my = e.pageY;
        mousemove();
    }, false);

};


//
// Exports
// -------
//


var initTrackingEvents = function(chan) {

    on(document.body, 'click', function() {
        chan.sendEvent('canvas-click');
    });

    on(document.body, 'mouseover', function() {
        chan.sendEvent('canvas-mouseover');
    });

};


var initScene = function(loadFn) {

    // FIXME: proper var checks.
    if (window.location.hash.indexOf('autoLoad=false') === -1) {
        on(window, 'load', loadFn);
        return;
    }

    return loadFn;
};


var control = function(otherWindow) {

    var chan = channel(otherWindow);

    var rpcTable = {
        silence: silence
    };

    configureRpc(chan, rpcTable);

    chan.setLoader = function(loadFn) {
        rpcTable.loadScene = initScene(function() {
            delete rpcTable.loadScene;
            loadFn();
            initTrackingEvents(chan);
        });
    };

    chan.setRunner = function(gooRunner) {
        rpcTable.start = function() { gooRunner.startGameLoop(); };
        rpcTable.stop = function() { gooRunner.stopGameLoop(); };
    };

    //
    // Helper wrappers.
    //
    chan.start = function(fn) { sendCommand(chan, 'start', null, fn); };
    chan.stop = function(fn) { sendCommand(chan, 'stop', null, fn); };
    chan.silence = function(fn) { sendCommand(chan, 'silence', null, fn); };
    chan.loadScene = function(fn) { sendCommand(chan, 'loadScene', null, fn); };

    return chan;
};


var ns = window.GooControl = window.GooControl || {};
ns.control = control;
ns.load = load;


}());


}());
