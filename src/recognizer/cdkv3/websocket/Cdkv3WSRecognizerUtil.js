import * as NetworkWSInterface from '../../networkHelper/websocket/networkWSInterface';
import { recognizerLogger as logger } from '../../../configuration/LoggerConfig';
import * as Cdkv3WSWebsocketBuilder from './Cdkv3WSBuilder';
import * as PromiseHelper from '../../../util/PromiseHelper';
import * as InkModel from '../../../model/InkModel';
import * as StrokeComponent from '../../../model/StrokeComponent';


function buildUrl(paperOptions, suffixUrl) {
  const scheme = (paperOptions.recognitionParams.server.scheme === 'https') ? 'wss' : 'ws';
  return scheme + '://' + paperOptions.recognitionParams.server.host + suffixUrl;
}


function send(recognizerContextParam, recognitionContextParam) {
  const recognizerContextReference = recognizerContextParam;
  const recognitionContext = recognitionContextParam;

  logger.debug('Recognizer is alive. Sending last stroke');
  recognizerContextReference.recognitionContexts.push(recognitionContext);

  const strokes = [StrokeComponent.toJSON(InkModel.extractLastPendingStroke(recognitionContext.model))];

  if (recognizerContextReference.recognitionIdx === 0) {
    recognizerContextReference.recognitionIdx++;
    // In websocket the last stroke is getLastPendingStrokeAsJsonArray as soon as possible to the server.
    NetworkWSInterface.send(recognizerContextReference.websocket, recognitionContext.buildStartInputFunction(recognitionContext.paperOptions, strokes));
  } else {
    // In websocket the last stroke is getLastPendingStrokeAsJsonArray as soon as possible to the server.
    NetworkWSInterface.send(recognizerContextReference.websocket, recognitionContext.buildContinueInputFunction(strokes));
  }
}

/**
 * Init the websocket recognizer.
 * Open the connexion and proceed to the hmac challenge.
 * A recognizer context is build as such :
 * @param suffixUrl
 * @param paperOptions
 * @param recognizerContext
 * @returns {Promise} Fulfilled when the init phase is over.
 */
export function init(suffixUrl, paperOptions, recognizerContext) {
  const recognizerContextReference = recognizerContext;
  const url = buildUrl(paperOptions, suffixUrl);
  const destructuredInitPromise = PromiseHelper.destructurePromise();

  logger.debug('Opening the websocket for context ', recognizerContextReference);
  const initCallback = Cdkv3WSWebsocketBuilder.buildWebSocketCallback(destructuredInitPromise, recognizerContextReference, paperOptions);
  recognizerContextReference.websocket = NetworkWSInterface.openWebSocket(url, initCallback);
  recognizerContextReference.recognitionContexts = [];
  recognizerContextReference.recognitionIdx = 0;

  // Feeding the recognitionContext
  recognizerContextReference.initPromise = destructuredInitPromise.promise;

  destructuredInitPromise.promise.then(
      (value) => {
        logger.debug('Init over ' + value);
      }
  ).catch(
      (error) => {
        logger.error('fatal error while loading recognizer');
      }
  );
  return recognizerContextReference.initPromise;
}

/**
 * Do what is needed to clean the server context.
 * @param paperOptions
 * @param model
 * @param recognizerContext
 * @returns {Promise}
 */
export function reset(paperOptions, model, recognizerContext) {
  const recognizerContextReference = recognizerContext;
  if (recognizerContextReference && recognizerContextReference.websocket) {
    // We have to send again all strokes after a reset.
    recognizerContextReference.recognitionIdx = 0;
    delete recognizerContextReference.instanceId;
    NetworkWSInterface.send(recognizerContextReference.websocket, { type: 'reset' });
  }
}

export function recognize(paperOptions, recognizerContext, model, buildStartInputFunction, buildContinueInputFunction, processResultFunction) {
  const destructuredRecognitionPromise = PromiseHelper.destructurePromise();
  const recognizerContextReference = recognizerContext;
  if (!recognizerContextReference.awaitingRecognitions) {
    recognizerContextReference.awaitingRecognitions = [];
  }
  // Building an object with all mandatory fields to feed the recognition queue.
  const recognitionContext = {
    buildStartInputFunction,
    buildContinueInputFunction,
    processResultFunction,
    model,
    paperOptions,
    recognitionPromiseCallbacks: destructuredRecognitionPromise
  };

  recognizerContextReference.initPromise.then(() => {
    logger.debug('Init was done feeding the recognition queue');
    send(recognizerContextReference, recognitionContext);
  });

  return destructuredRecognitionPromise.promise;
}

/**
 * Close and free all resources that will no longer be used by the recognizer.
 * @param paperOptions
 * @param model
 * @param recognizerContext
 * @returns {Promise}
 */
export function close(paperOptions, model, recognizerContext) {
  if (recognizerContext && recognizerContext.websocket) {
    NetworkWSInterface.close(recognizerContext.websocket, 1000, 'CLOSE BY USER');
  }
}

