import { beforeEach, describe, it } from 'mocha';
import { assert } from 'chai';
import { testLogger as logger } from '../../../../src/configuration/LoggerConfig';
import * as InkModel from '../../../../src/model/InkModel';
import * as Point from '../../../../src/model/Point';
import * as ModelStats from '../../../../src/util/ModelStats';

describe('Testing InkModel Stats', () => {
  it('Testing generated stats', () => {
    const POINTER_ID = 1;
    const initialModel = InkModel.createModel();
    const updatedModel1 = InkModel.penDown(initialModel, Point.createPoint(1, 1), POINTER_ID);
    const updatedModel2 = InkModel.penMove(updatedModel1, Point.createPoint(2, 2), POINTER_ID);
    const updatedModel3 = InkModel.penMove(updatedModel2, Point.createPoint(3, 3), POINTER_ID);
    const updatedModel4 = InkModel.penUp(updatedModel3, Point.createPoint(4, 4), POINTER_ID);
    logger.debug('Last model stats are ', ModelStats.computeStats(updatedModel4));
    assert.notDeepEqual(initialModel.pendingStrokes, updatedModel4.pendingStrokes, 'Model shoudl not shared array references');
  });


  // TODO Test all other function
});
