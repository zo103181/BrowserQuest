const {CheckerPlugin} = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = env => {

  const environment = env.NODE_ENV;
  console.log('Project is running with environment: ', environment);

  return {
    entry: './client/ts/main.ts',
    output: {
      path: __dirname + '/dist/client',
      filename: 'main.js'
    },

    // Currently we need to add '.ts' to the resolve.extensions array.
    resolve: {
      extensions: ['.ts', '.js']
    },

    // Source maps support ('inline-source-map' also works)
    devtool: 'source-map',

    // Add the loader for .ts files.
    module: {
      loaders: [
        {
          test: /\.ts?$/,
          loader: 'awesome-typescript-loader?{configFileName: "client/tsconfig.json"}'
        }
      ]
    },
    plugins: [
      new CheckerPlugin(),
      new HtmlWebpackPlugin({
        title: 'Fate of the Four',
        template: './client/index.html'
      }),
      new CopyWebpackPlugin([
        // {output}/file.txt
        {from: 'client/img/', to: 'img/'},
        {from: 'client/audio/', to: 'audio/'},
        {from: 'client/css/', to: 'css/'},
        {from: 'client/fonts/', to: 'fonts/'},
        {from: 'client/maps/', to: 'maps/'},
        {from: 'client/sprites/', to: 'sprites/'},
        {from: 'client/ts/map/mapworker.js', to: 'mapworker.js'},
        {from: 'client/ts/lib/', to: 'lib/'},
        {from: `client/config/config.prod.json`, to: 'client/config/config.json'},
      ]),
    ]
  }
};
