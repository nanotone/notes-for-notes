jQuery(function() {
    var $ = jQuery;
    var $posts = $('.posts');
    $posts.show();
    $posts.each(function() {
        var $body = $(this);
        var clips = [];
        $body.find('p').each(function(j) {
            var a = $(this).find('a')[0];
            var note = null;
            if (a && a.href.match(/youtube\.com\/watch/)) {  // each yt link creates a new clip
                var vid = a.href.match(/\Wv=([-\w]+)/)[1];
                clips.push({'vid': vid, 'anchor': a, 'notes': []});
            }
            else if (note = parseTstamp(this)) {  // single = for easy assign-and-check
                var notes = clips[clips.length - 1].notes;
                var lastNote = notes.length && notes[notes.length - 1];
                if (note.tstamp == lastNote.tstamp) {
                    lastNote.paras.push(note.paras[0]);
                }
                else {
                    notes.push(note);
                }
            }
        });
        for (var i = 0; i < clips.length; i++) {
            buildClip(clips[i]);
        }
    });

    function humanizeTime(sec) {
        return Math.floor(sec / 60) + ':' + String(100 + sec % 60).substr(1);
    }

    function buildClip(clip) {
        var $clip = $('<div class="clip"><a class="play" href="#">play!</a></div>');
        var ytPlayer = null;
        var vid = clip.vid;
        var tickTimeout = null;
        var tick = function() {
            var vidTime = ytPlayer.getCurrentTime();
            var $nextNote = $clip.find('.note.hidden').first();
            if ($nextNote.data('tstamp') <= vidTime) {
                updateTimeline(vidTime);
            }
            tickTimeout = setTimeout(tick, 500);
        };
        var updateTimeline = function(tstamp) {
            var $notes = $clip.find('.note');
            var $visible = $notes.filter('.visible');
            var $hidden = $notes.filter('.hidden');

            $visible.filter(function(i) {
                return $(this).data('tstamp') > tstamp;
            }).removeClass('visible').addClass('hidden').slideUp();
            $hidden.filter(function(i) {
                return $(this).data('tstamp') <= tstamp;
            }).removeClass('hidden').addClass('visible').slideDown();

            var $firstHidden = $notes.filter('.hidden').first();
            var $nextTstamp = $clip.find('.nextNoteTstamp');
            if ($firstHidden.length) {
                var tstamp = $firstHidden.data('tstamp');
                $nextTstamp.show().text("Next: " + humanizeTime(tstamp));
            }
            else {
                $nextTstamp.hide();
            }
        };

        $(clip.anchor).after($clip).remove();

        // build the dom
        for (var j = 0; j < clip.notes.length; j++) {
            var note = clip.notes[j];
            var $note = $('<div class="note hidden" style="display:none"><a class="seek" href="#">' + humanizeTime(note.tstamp) + '</a></div>');
            for (var k = 0; k < note.paras.length; k++) {
                $note.append(note.paras[k]);
            }
            $note.data('tstamp', note.tstamp);
            $clip.append($note);
        }
        $clip.append($('<div><a class="nextNoteTstamp" href="#" style="display:none"></a></div>'));
        $clip.append($('<div class="player"></div>'));

        // events
        $clip.find('a.play').on('click', function(e) {
            e.preventDefault();
            $(this).hide();
            var script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            var firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(script, firstScript);
            window.onYouTubeIframeAPIReady = function() {
                var events = {
                    onReady: function(e) { e.target.playVideo(); tick(); },
                    onStateChange: function(e) {} };
                ytPlayer = new YT.Player($clip.find('.player')[0], {height: '360', width: '480', videoId: vid, events: events});
            };
        });
        $clip.find('a.seek').on('click', function(e) {
            e.preventDefault();
            var $note = $(this).closest('.note');
            var tstamp = $note.data('tstamp');
            ytPlayer.seekTo(tstamp, true);
            updateTimeline(tstamp);
        });
        $clip.find('a.nextNoteTstamp').on('click', function(e) {
            e.preventDefault();
            var tstamp = $clip.find('.note.hidden').first().data('tstamp');
            ytPlayer.seekTo(tstamp, true);
            updateTimeline(tstamp);
        });
    }

    function parseTstamp(p) {
        var firstChild = p.childNodes[0];
        if (!firstChild) { return false; }
        var match = (firstChild.nodeType === Node.TEXT_NODE && firstChild.textContent.match(/^\[(\d+):(\d\d)\]\s*/));
        if (match) {
            var tstamp = Number(match[1]) * 60 + Number(match[2]);
            p.replaceChild(document.createTextNode(firstChild.textContent.substr(match[0].length)), firstChild);
            return {'tstamp': tstamp, 'paras': [p]};
        }
    }

});
