var CLI = require('clui'),
    clc = require('cli-color');

var Line          = CLI.Line,
    LineBuffer    = CLI.LineBuffer;

var rl = require('readline-sync');
var fs = require('fs');

function render (ss) {
  var outputBuffer = new LineBuffer({
    x: 0,
    y: 0,
    width: 'console',
    height: 'console'
  });

  var blankLine = new Line(outputBuffer)
    .fill()
    .store();

  var header = new Line(outputBuffer)
    .column('#', 5, [clc.cyan])
    .column('Title', 60, [clc.cyan])
    .column('Length', 11, [clc.cyan])
    .column('Genre', 27, [clc.cyan])
    .column('Artist', 30, [clc.cyan])
    .fill()
    .store();

  var line;
  for(var l = 0; l < Math.min(ss.length, 100); l++)
  {
    s = ss[l];

    line = new Line(outputBuffer)
      .column(String(l+1), 5)
      .column(s.title, 60)
      .column(s.duration + 's', 11)
      .column(genres[s.genre.id], 27)
      .column(s.user.name, 30)
      .fill()
      .store();
  }

  outputBuffer.output();

  let inp = rl.question('> ');
  return inp;
}

// ----------------------------------------


function search (lst, inp) {
  const ret = [];
  const rx  = new RegExp(inp, 'i');

  let ws = inp.split(/ +/);

  for (let x of lst) {
    let any = x.title.match(rx)            !== null
           || x.user.name.match(rx)        !== null
           || (x.genre && genres[x.genre.id].match(rx) !== null);

    if (!any) {
      let cnt = 0;

      for (let w of ws) {
        const _rx = new RegExp(w, 'i');
        if ( x.title.match(_rx)           !== null
          || x.user.name.match(_rx)       !== null
          || (x.genre && genres[x.genre.id].match(_rx) !== null)) cnt++;
      }

      any = cnt >= ws.length;
    }

    if (!any) continue;
    ret.push(x)
  }
  return ret;
}

function searchTitle (lst, rx) {
  const ret = [];
  for (let x of lst) {
    if (x.title.match(rx) === null) continue;
    ret.push(x)
  }
  return ret;
}

function filterGenre (lst, id) {
  const ret = [];
  for (let x of lst) {
    if (x.genre === null || x.genre.id !== id) continue;
    ret.push(x.id);
  }
  return ret;
}

const {spawn} = require('child_process');

var keypress = require('keypress')
  , tty      = require('tty');

keypress(process.stdin);

function playSong (s, callback) {
  if (typeof process.stdin.setRawMode == 'function') {
    process.stdin.setRawMode(true);
  } else {
    tty.setRawMode(true);
  }
  process.stdin.resume();

  player = spawn('mplayer', [s.streams.mp3]);

  player.stdout.on( 'data', data => {
    console.log( `${data}` );
  } );

  player.stderr.on( 'data', data => {
    // console.log( `${data}` );
  } );

  player.on( 'close', code => {
    process.stdin.removeAllListeners('keypress');
    if (typeof process.stdin.setRawMode == 'function') {
      process.stdin.setRawMode(false);
    } else {
      tty.setRawMode(false);
    }
    process.stdin.pause ();
    callback();
  } );

  process.stdin.on('keypress', function (ch, key) {
    if (ch !== undefined) {
      player.stdin.write(ch);
    } else {
      player.stdin.write(key.sequence);
    }
  });
}

function tick (obj, ss) {
  let inp = render(ss);

  if (!isNaN(inp)) {
    let s  = ss[Number(inp)-1];
    playSong(s, () => tick (obj, ss));
    return;
  }

  ss = search(obj, inp);

  tick (obj, ss);
}

fs.readFile ('db', 'utf8', (err, data) => {
  obj = JSON.parse(data);
  ss  = obj.slice(0);

  fs.readFile ('genres', 'utf8', (err, data) => {
    genres = JSON.parse(data);
    tick (obj, ss);
  });
});
