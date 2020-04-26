import {log} from './lib/log';
import {Area} from './map/area';
import {Detect} from './utils/detect';

import * as _ from 'lodash';

export class AudioManager {

  game;
  extension;
  enabled = true;
  sounds = {};
  currentMusic = null;
  areas = [];
  musicNames = ['village', 'beach', 'forest', 'cave', 'desert', 'lavaland', 'boss'];
  soundNames = ['loot', 'hit1', 'hit2', 'hurt', 'heal', 'chat', 'revive', 'death', 'firefox', 'achievement', 'kill1', 'kill2', 'noloot', 'teleport', 'chest', 'npc', 'npc-end'];


  constructor(game) {
    var self = this;
    this.game = game;
    this.extension = Detect.canPlayMP3() ? 'mp3' : 'ogg';


    var loadSoundFiles = function () {
      var counter = _.size(self.soundNames);
      console.info('Loading sound files...');
      _.each(self.soundNames, function (name) {
        self.loadSound(name, function () {
          counter -= 1;
          if (counter === 0) {
            if (!Detect.isSafari()) { // Disable music on Safari - See bug 738008
              loadMusicFiles();
            }
          }
        });
      });
    };

    var loadMusicFiles = function () {
      if (!self.game.renderer.mobile) { // disable music on mobile devices
        console.info('Loading music files...');
        // Load the village music first, as players always start here
        self.loadMusic(self.musicNames.shift(), function () {
          // Then, load all the other music files
          _.each(self.musicNames, function (name) {
            self.loadMusic(name);
          });
        });
      }
    };

    if (!(Detect.isSafari() && Detect.isWindows())) {
      loadSoundFiles();
    } else {
      this.enabled = false; // Disable audio on Safari Windows
    }
  }

  toggle() {
    if (this.enabled) {
      this.enabled = false;

      if (this.currentMusic) {
        this.resetMusic(this.currentMusic);
      }
    } else {
      this.enabled = true;

      if (this.currentMusic) {
        this.currentMusic = null;
      }
      this.updateMusic();
    }
  }

  load(basePath, name, loaded_callback, channels) {
    var path = basePath + name + '.' + this.extension,
      sound = document.createElement('audio'),
      self = this;

    sound.addEventListener('canplaythrough', function (e) {
      // this.removeEventListener('canplaythrough', arguments.callee, false);
      console.debug(path + ' is ready to play.');
      if (loaded_callback) {
        loaded_callback();
      }
    }, false);
    sound.addEventListener('error', function (e) {
      console.error('Error: ' + path + ' could not be loaded.');
      self.sounds[name] = null;
    }, false);

    sound.preload = 'auto';
    // sound.autobuffer = true;
    sound.src = path;
    sound.load();

    this.sounds[name] = [sound];
    _.times(channels - 1, function () {
      self.sounds[name].push(sound.cloneNode(true));
    });
  }

  loadSound(name, handleLoaded) {
    this.load('audio/sounds/', name, handleLoaded, 4);
  }

  loadMusic(name, handleLoaded?) {
    this.load('audio/music/', name, handleLoaded, 1);
    var music = this.sounds[name][0];
    music.loop = true;
    music.addEventListener('ended', function () {
      music.play()
    }, false);
  }

  getSound(name) {
    if (!this.sounds[name]) {
      return null;
    }
    var sound: any = _.detect(this.sounds[name], function (sound) {
      return sound.ended || sound.paused;
    });
    if (sound) {
      sound.currentTime = 0;
    } else {
      sound = this.sounds[name][0];
    }
    return sound;
  }

  playSound(name) {
    var sound = this.enabled && this.getSound(name);
    if (sound) {
      sound.play();
    }
  }

  addArea(x, y, width, height, musicName) {
    var area: any = new Area(x, y, width, height);
    area.musicName = musicName;
    this.areas.push(area);
  }

  getSurroundingMusic(entity) {
    var music = null,
      area: any = _.detect(this.areas, function (area) {
        return area.contains(entity);
      });

    if (area) {
      music = {sound: this.getSound(area.musicName), name: area.musicName};
    }
    return music;
  }

  updateMusic() {
    if (this.enabled) {
      var music = this.getSurroundingMusic(this.game.player);

      if (music) {
        if (!this.isCurrentMusic(music)) {
          if (this.currentMusic) {
            this.fadeOutCurrentMusic();
          }
          this.playMusic(music);
        }
      } else {
        this.fadeOutCurrentMusic();
      }
    }
  }

  isCurrentMusic(music) {
    return this.currentMusic && (music.name === this.currentMusic.name);
  }

  playMusic(music) {
    if (this.enabled && music && music.sound) {
      if (music.sound.fadingOut) {
        this.fadeInMusic(music);
      } else {
        music.sound.volume = 1;
        music.sound.play();
      }
      this.currentMusic = music;
    }
  }

  resetMusic(music) {
    if (music && music.sound && music.sound.readyState > 0) {
      music.sound.pause();
      music.sound.currentTime = 0;
    }
  }

  fadeOutMusic(music, ended_callback) {
    var self = this;
    if (music && !music.sound.fadingOut) {
      this.clearFadeIn(music);
      music.sound.fadingOut = setInterval(function () {
        var step = 0.02,
        volume = music.sound.volume - step;

        if (self.enabled && volume >= step) {
          music.sound.volume = volume;
        } else {
          music.sound.volume = 0;
          self.clearFadeOut(music);
          ended_callback(music);
        }
      }, 50);
    }
  }

  fadeInMusic(music) {
    var self = this;
    if (music && !music.sound.fadingIn) {
      this.clearFadeOut(music);
      music.sound.fadingIn = setInterval(function () {
        var step = 0.01,
        volume = music.sound.volume + step;

        if (self.enabled && volume < 1 - step) {
          music.sound.volume = volume;
        } else {
          music.sound.volume = 1;
          self.clearFadeIn(music);
        }
      }, 30);
    }
  }

  clearFadeOut(music) {
    if (music.sound.fadingOut) {
      clearInterval(music.sound.fadingOut);
      music.sound.fadingOut = null;
    }
  }

  clearFadeIn(music) {
    if (music.sound.fadingIn) {
      clearInterval(music.sound.fadingIn);
      music.sound.fadingIn = null;
    }
  }

  fadeOutCurrentMusic() {
    var self = this;
    if (this.currentMusic) {
      this.fadeOutMusic(this.currentMusic, function (music) {
        self.resetMusic(music);
      });
      this.currentMusic = null;
    }
  }
}
