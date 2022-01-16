const path = require('path')

module.exports = {
  context: __dirname,
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'p2pnet.bundle.js',
    publicPath: '/out/'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.prod.json'
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  }
}