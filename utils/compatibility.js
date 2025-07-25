/**
 * Compatibility fixes for Node.js versions
 */

// Fix for ReadableStream not being available in older Node.js versions
if (typeof globalThis.ReadableStream === 'undefined') {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
}

// Fix for WritableStream not being available in older Node.js versions  
if (typeof globalThis.WritableStream === 'undefined') {
    const { WritableStream } = require('stream/web');
    globalThis.WritableStream = WritableStream;
}

// Fix for TransformStream not being available in older Node.js versions
if (typeof globalThis.TransformStream === 'undefined') {
    const { TransformStream } = require('stream/web');
    globalThis.TransformStream = TransformStream;
}

module.exports = {};
