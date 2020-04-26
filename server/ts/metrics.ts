import * as _ from 'lodash';
import {log} from './log';
import {World} from './world';

export class Metrics {
  config;
  client;
  isReady = false;
  ready_callback;


  constructor(config) {
    var self = this;

    this.config = config;
    this.client = new (require('memcache')).Client(config.memcached_port, config.memcached_host);
    this.client.connect();


    this.client.on('connect', function () {
      console.info('Metrics enabled: memcached client connected to ' + config.memcached_host + ':' + config.memcached_port);
      self.isReady = true;
      if (self.ready_callback) {
        self.ready_callback();
      }
    });
  }

  ready(callback) {
    this.ready_callback = callback;
  }

  updatePlayerCounters(worlds, updatedCallback) {
    var self = this,
      config = this.config,
      numServers = _.size(config.game_servers),
      playerCount = _.reduce(worlds, function (sum, world: World) {
        return sum + world.playerCount;
      }, 0);

    if (this.isReady) {
      // Set the number of players on this server
      this.client.set('player_count_' + config.server_name, playerCount, function () {
        var total_players = 0;

        // Recalculate the total number of players and set it
        _.each(config.game_servers, function (server) {
          self.client.get('player_count_' + server.name, function (error, result) {
            var count = result ? parseInt(result) : 0;

            total_players += count;
            numServers -= 1;
            if (numServers === 0) {
              self.client.set('total_players', total_players, function () {
                if (updatedCallback) {
                  updatedCallback(total_players);
                }
              });
            }
          });
        });
      });
    } else {
      console.error('Memcached client not connected');
    }
  }

  updateWorldDistribution(worlds) {
    this.client.set('world_distribution_' + this.config.server_name, worlds);
  }

  getOpenWorldCount(callback) {
    this.client.get('world_count_' + this.config.server_name, function (error, result) {
      callback(result);
    });
  }

  getTotalPlayers(callback) {
    this.client.get('total_players', function (error, result) {
      callback(result);
    });
  }
}
