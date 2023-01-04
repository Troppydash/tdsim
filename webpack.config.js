const path = require("path");
const nodeExternals = require('webpack-node-externals');

const outDir = path.resolve(__dirname, 'build');

module.exports = {
    // target: 'node',
    devtool: 'source-map',
    mode: "development",
    entry: {
        'tdsim': './src/entry.ts',
    },
    output: {
        path: outDir,
        filename: '[name].js',
        libraryTarget: "umd",
        library: 'tdsim',
        umdNamedDefine: true,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        }
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                use: 'ts-loader'
            }
        ],
    }
};
