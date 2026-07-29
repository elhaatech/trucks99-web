const express = require('express');
const specificationController = require('../controllers/specificationController');
const specificationValueController = require('../controllers/specificationValueController');

const specificationRouter = express.Router();
const specificationValueRouter = express.Router();

// ─── Specification ────────────────────────────────────────────────────────
// NOTE: bulk-upload must come before "/:id" routes so it isn't ever swallowed
// by a param route (not an issue today since those are GET, but keeping this
// order is the safe convention going forward).
specificationRouter.post(
  '/bulk-upload',
  specificationController.bulkUpload.single('file'),
  specificationController.bulkUploadSpecifications,
);
specificationRouter.post('/', specificationController.createSpecification);
specificationRouter.put('/:id', specificationController.updateSpecification);
specificationRouter.delete('/:id', specificationController.deleteSpecification);
specificationRouter.get('/', specificationController.getSpecifications);
specificationRouter.get('/:id', specificationController.getSpecificationById);

// ─── Specification Value ──────────────────────────────────────────────────
specificationValueRouter.post(
  '/bulk-upload',
  specificationValueController.bulkUpload.single('file'),
  specificationValueController.bulkUploadSpecificationValues,
);
specificationValueRouter.post('/', specificationValueController.createSpecificationValue);
specificationValueRouter.put('/:id', specificationValueController.updateSpecificationValue);
specificationValueRouter.delete('/:id', specificationValueController.deleteSpecificationValue);
specificationValueRouter.get('/', specificationValueController.getSpecificationValues);

module.exports = {
  specificationRouter,
  specificationValueRouter,
};