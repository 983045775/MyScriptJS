import { modelLogger as logger } from '../configuration/LoggerConfig';
import * as StrokeComponent from './StrokeComponent';
import MyScriptJSConstants from '../configuration/MyScriptJSConstants';
import cloneJSObject from '../util/Cloner';

export function createModel() {
  return {
    recognizedComponents: {},
    recognizedStrokes: [],
    nextRecognitionRequestId: 0,
    currentRecognitionId: undefined,
    lastRecognitionRequestId: -1,
    currentStroke: StrokeComponent.createStrokeComponent(),
    pendingStrokes: {},
    /*
     { 0  : [ ]
     recognitionId : array of strokes
     }
     */
    state: MyScriptJSConstants.ModelState.INITIALIZING,
    rawResult: undefined,
    renderingResult: undefined,
    creationTime: new Date().getTime()
    /*
     {
     segmentList : []
     symbolList : [
     {
     type :
     ...

     ]
     inkRange : {}
     }

     */
  };
}

export function clone(root, model) {
  const clonedObject = cloneJSObject(root, model);
  return clonedObject;
}

export function compactToString(model) {
  const pendingStrokeLength = Object.keys(model.pendingStrokes).filter(key => model.pendingStrokes[key] !== undefined).reduce((a, b) => a + 1, 0);
  return `${model.creationTime} [${model.recognizedStrokes.length}|${pendingStrokeLength}]`;
}

export function updatePendingStrokes(model, stroke) {
  const returnedModel = clone({}, model);
  if (!model.pendingStrokes[model.nextRecognitionRequestId]) {
    returnedModel.pendingStrokes[model.nextRecognitionRequestId] = [];
  }
  returnedModel.pendingStrokes[model.nextRecognitionRequestId].push(stroke);
  return returnedModel;
}

export function penUp(model, point) {
  let returnedModel = clone({}, model);
  logger.debug('penUp', point);
  const currentStroke = StrokeComponent.addPoint(returnedModel.currentStroke, point);
  returnedModel = updatePendingStrokes(returnedModel, currentStroke);
  //Resetting the current stroke to an empty one
  returnedModel.currentStroke = StrokeComponent.createStrokeComponent();
  return returnedModel;
}

export function penDown(model, point) {
  const returnedModel = clone({}, model);
  logger.debug('penDown', point);
  returnedModel.currentStroke = StrokeComponent.addPoint(returnedModel.currentStroke, point);
  returnedModel.currentStroke = StrokeComponent.addPoint(returnedModel.currentStroke, point);
  return returnedModel;
}

export function penMove(model, point) {
  const returnedModel = clone({}, model);
  logger.debug('penMove', point);
  returnedModel.currentStroke = StrokeComponent.addPoint(returnedModel.currentStroke, point);
  return returnedModel;
}

export function extractNonRecognizedStrokes(model) {
  let nonRecognizedStrokes = [];
  for (let recognitionRequestId = (model.lastRecognitionRequestId + 1); recognitionRequestId <= model.currentRecognitionId; recognitionRequestId++) {
    nonRecognizedStrokes = nonRecognizedStrokes.concat(model.pendingStrokes[recognitionRequestId]);
  }
  return nonRecognizedStrokes;
}
