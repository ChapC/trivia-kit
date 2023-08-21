const prod = process.env.NODE_ENV === 'production';

const HTMLWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: prod ? 'production' : 'development',
    devtool: prod ? undefined : 'source-map',
    entry: './src/index.tsx',
    output: {
        path: __dirname + '/dist/'
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/,
                resolve: {
                    extensions: ['.ts', '.tsx', '.js', '.json'],
                },
            },
            {
                test: /\.(jpg|png|svg|bmp|wav)$/,
                type: 'asset/resource'
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: true
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new HTMLWebpackPlugin({
            template: './static/index.html'
        })
    ]
}