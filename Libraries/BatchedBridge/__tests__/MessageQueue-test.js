/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

// const MessageQueueTestConfig = require('MessageQueueTestConfig');
jest.unmock('MessageQueue');
jest.unmock('defineLazyObjectProperty');

let MessageQueue;
let MessageQueueTestModule;
let queue;

const MODULE_IDS = 0;
const METHOD_IDS = 1;
const PARAMS = 2;

const assertQueue = (flushedQueue, index, moduleID, methodID, params) => {
  expect(flushedQueue[MODULE_IDS][index]).toEqual(moduleID);
  expect(flushedQueue[METHOD_IDS][index]).toEqual(methodID);
  expect(flushedQueue[PARAMS][index]).toEqual(params);
};

// Important things to test:
//
// [x] Local modules can be invoked through the queue.
//
// [ ] Local modules that throw exceptions are gracefully caught. In that case
// local callbacks stored by IDs are cleaned up.
describe('MessageQueue', function() {
  beforeEach(function() {
    jest.resetModules();
    MessageQueue = require('MessageQueue');
    MessageQueueTestModule = require('MessageQueueTestModule');
    queue = new MessageQueue();
    queue.registerCallableModule(
      'MessageQueueTestModule',
      MessageQueueTestModule
    );
    queue.createDebugLookup(0, 'MessageQueueTestModule',
      ['testHook1', 'testHook2']);
  });

  it('should enqueue native calls', () => {
    queue.enqueueNativeCall(0, 1, [2]);
    const flushedQueue = queue.flushedQueue();
    assertQueue(flushedQueue, 0, 0, 1, [2]);
  });

  it('should call a local function with the function name', () => {
    MessageQueueTestModule.testHook2 = jasmine.createSpy();
    expect(MessageQueueTestModule.testHook2.calls.count()).toEqual(0);
    queue.__callFunction('MessageQueueTestModule', 'testHook2', [2]);
    expect(MessageQueueTestModule.testHook2.calls.count()).toEqual(1);
  });

  it('should store callbacks', () => {
    queue.enqueueNativeCall(0, 1, ['foo'], null, null);
    const flushedQueue = queue.flushedQueue();
    assertQueue(flushedQueue, 0, 0, 1, ['foo']);
  });

  it('should call the stored callback', () => {
    let done = false;
    queue.enqueueNativeCall(0, 1, [], () => {}, () => { done = true; });
    queue.__invokeCallback(1);
    expect(done).toEqual(true);
  });

  it('should throw when calling the same callback twice', () => {
    queue.enqueueNativeCall(0, 1, [], () => {}, () => {});
    queue.__invokeCallback(1);
    expect(() => queue.__invokeCallback(1)).toThrow();
  });

  it('should throw when calling both success and failure callback', () => {
    queue.enqueueNativeCall(0, 1, [], () => {}, () => {});
    queue.__invokeCallback(1);
    expect(() => queue.__invokeCallback(0)).toThrow();
  });
});
