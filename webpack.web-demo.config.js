const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/web-demo/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist/web-demo'),
    filename: 'bundle.js',
    publicPath: './'
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        type: 'asset/inline'
      }
    ]
  },
    resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/web-demo/index.html',
      filename: 'index.html'
    })
  ],
  devtool: false,
  performance: { hints: false }
};
