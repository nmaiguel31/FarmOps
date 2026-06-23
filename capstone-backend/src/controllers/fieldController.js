const Field = require('../models/Field');
const Farm = require('../models/Farm');
const Crop = require('../models/Crop');
const Zone = require('../models/Zone');
const logEvent = require('../utils/logger');
const {
  isPolygonInsidePolygon,
  normalizePolygon,
  polygonsOverlap
} = require('../utils/polygonValidation');

const populateField = [
  {
    path: 'farm',
    populate: {
      path: 'owner',
      select: 'email role'
    }
  },
  {
    path: 'crop'
  }
];

const userCanAccessFarm = (user, farm) => {
  return user.role === 'admin' ||
    farm.owner.toString() === user.id;
};

const getAccessibleFarmIds = async (user) => {
  if (user.role === 'admin') {
    const farms = await Farm.find();
    return farms.map(farm => farm._id);
  }

  const farms = await Farm.find({
    owner: user.id
  });

  return farms.map(farm => farm._id);
};

const validateCropForFarm = async (cropId, farmId, user) => {
  if (!cropId) {
    return null;
  }

  const crop = await Crop.findById(cropId)
    .populate('farm');

  if (!crop) {
    const error = new Error('Crop not found');
    error.statusCode = 404;
    throw error;
  }

  if (crop.farm._id.toString() !== farmId.toString()) {
    const error = new Error('Crop must belong to the selected farm');
    error.statusCode = 400;
    throw error;
  }

  if (!userCanAccessFarm(user, crop.farm)) {
    const error = new Error('Not authorized for this crop');
    error.statusCode = 403;
    throw error;
  }

  return crop._id;
};

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const lifecycleStages = [
  'Planning',
  'Land Preparation',
  'Planting',
  'Vegetative Growth',
  'Flowering',
  'Ripening',
  'Harvest'
];

const lifecycleDurationDays = 120;

const getValidStage = (stage) => {
  return lifecycleStages.includes(stage) ? stage : 'Planning';
};

const requiresPlantingDateForStage = (stage) => {
  return lifecycleStages.indexOf(stage) >=
    lifecycleStages.indexOf('Planting');
};

const normalizeLifecycleDate = (date) => {
  if (!date) {
    return undefined;
  }

  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const calculateExpectedHarvestDate = (plantingDate) => {
  const parsedDate = normalizeLifecycleDate(plantingDate);

  if (!parsedDate) {
    return undefined;
  }

  parsedDate.setDate(parsedDate.getDate() + lifecycleDurationDays);
  return parsedDate;
};

const applyLifecycleInput = async (cropId, { plantingDate, currentStage }) => {
  const crop = await Crop.findById(cropId);

  if (!crop) {
    return cropId;
  }

  let changed = false;
  const parsedPlantingDate = normalizeLifecycleDate(plantingDate);
  const nextStage =
    currentStage && lifecycleStages.includes(currentStage)
      ? currentStage
      : crop.currentStage;
  const nextPlantingDate =
    parsedPlantingDate ||
    crop.plantingDate ||
    (nextStage === 'Planning' ? new Date() : undefined);

  if (
    requiresPlantingDateForStage(nextStage) &&
    !nextPlantingDate
  ) {
    const error = new Error('Planting date is required for this crop stage.');
    error.statusCode = 400;
    throw error;
  }

  if (
    nextPlantingDate &&
    (
      !crop.plantingDate ||
      crop.plantingDate.getTime() !== nextPlantingDate.getTime()
    )
  ) {
    crop.plantingDate = nextPlantingDate;
    changed = true;

    crop.expectedHarvestDate = calculateExpectedHarvestDate(nextPlantingDate);
  }

  if (currentStage && lifecycleStages.includes(currentStage)) {
    if (crop.currentStage !== currentStage) {
      crop.stageStartedAt = new Date();
    }

    crop.currentStage = currentStage;
    changed = true;
  }

  if (changed) {
    await crop.save();
  }

  return crop._id;
};

const resolveFieldCrop = async ({
  cropId,
  cropType,
  farmId,
  user,
  plantingDate,
  currentStage
}) => {
  const selectedCrop =
    await validateCropForFarm(cropId, farmId, user);

  if (selectedCrop) {
    return applyLifecycleInput(selectedCrop, {
      plantingDate,
      currentStage
    });
  }

  const manualCropType =
    typeof cropType === 'string' ? cropType.trim() : '';

  if (!manualCropType) {
    return null;
  }

  const cropPattern =
    new RegExp(`^${escapeRegExp(manualCropType)}$`, 'i');

  const existingCrop = await Crop.findOne({
    farm: farmId,
    $or: [
      { name: cropPattern },
      { type: cropPattern }
    ]
  });

  if (existingCrop) {
    return applyLifecycleInput(existingCrop._id, {
      plantingDate,
      currentStage
    });
  }

  const parsedPlantingDate =
    normalizeLifecycleDate(plantingDate);
  const stage =
    getValidStage(currentStage);
  const cropPlantingDate =
    parsedPlantingDate ||
    (stage === 'Planning' ? new Date() : undefined);

  if (
    requiresPlantingDateForStage(stage) &&
    !cropPlantingDate
  ) {
    const error = new Error('Planting date is required for this crop stage.');
    error.statusCode = 400;
    throw error;
  }

  const createdCrop = await Crop.create({
    name: manualCropType,
    type: manualCropType,
    season: 'Field Assigned',
    farm: farmId,
    currentStage: stage,
    stageStartedAt: new Date(),
    plantingDate: cropPlantingDate,
    expectedHarvestDate: calculateExpectedHarvestDate(cropPlantingDate)
  });

  logEvent('info', 'CROP_CREATED_FROM_FIELD', {
    cropId: createdCrop._id,
    cropName: createdCrop.name,
    farmId,
    createdBy: user.id
  });

  return createdCrop._id;
};

const validateFieldBoundary = async ({ polygonCoordinates, farm, excludeFieldId }) => {
  const fieldPolygon =
    normalizePolygon(polygonCoordinates);

  if (fieldPolygon.length < 3) {
    return;
  }

  const farmPolygon =
    normalizePolygon(farm.polygonCoordinates);

  if (
    farmPolygon.length < 3 ||
    !isPolygonInsidePolygon(fieldPolygon, farmPolygon)
  ) {
    const error = new Error('Field boundary must stay inside the selected farm.');
    error.statusCode = 400;
    throw error;
  }

  const query = {
    farm: farm._id,
    polygonCoordinates: {
      $exists: true,
      $ne: []
    }
  };

  if (excludeFieldId) {
    query._id = {
      $ne: excludeFieldId
    };
  }

  const existingFields =
    await Field.find(query);

  const overlaps =
    existingFields.some(field =>
      polygonsOverlap(fieldPolygon, field.polygonCoordinates)
    );

  if (overlaps) {
    const error = new Error('Field boundary overlaps an existing field.');
    error.statusCode = 400;
    throw error;
  }
};

const createField = async (req, res) => {
  try {
    const farm = await Farm.findById(req.body.farm);

    if (!farm) {
      return res.status(404).json({
        message: 'Farm not found'
      });
    }

    if (!userCanAccessFarm(req.user, farm)) {
      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        farmId: farm._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized for this farm'
      });
    }

    const crop = await resolveFieldCrop({
      cropId: req.body.crop,
      cropType: req.body.cropType,
      farmId: farm._id,
      user: req.user,
      plantingDate: req.body.plantingDate,
      currentStage: req.body.currentStage
    });

    await validateFieldBoundary({
      polygonCoordinates: req.body.polygonCoordinates,
      farm
    });

    const field = await Field.create({
      name: req.body.name,
      cropType: req.body.cropType || '',
      crop,
      area: req.body.area,
      status: req.body.status || 'Active',
      healthStatus: req.body.healthStatus || 'Good',
      irrigationStatus: req.body.irrigationStatus || 'Scheduled',
      farm: req.body.farm,
      notes: req.body.notes || '',
      polygonCoordinates: req.body.polygonCoordinates || []
    });

    logEvent('info', 'FIELD_CREATED', {
      fieldId: field._id,
      fieldName: field.name,
      farmId: farm._id,
      createdBy: req.user.id
    });

    const populatedField = await Field.findById(field._id)
      .populate(populateField);

    res.status(201).json(populatedField);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

const getFields = async (req, res) => {
  try {
    let fields;

    if (req.user.role === 'admin') {
      fields = await Field.find()
        .populate(populateField);
    } else {
      const farmIds = await getAccessibleFarmIds(req.user);

      fields = await Field.find({
        farm: { $in: farmIds }
      }).populate(populateField);
    }

    res.json(fields);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getFieldById = async (req, res) => {
  try {
    const field = await Field.findById(req.params.id)
      .populate(populateField);

    if (!field) {
      return res.status(404).json({
        message: 'Field not found'
      });
    }

    if (!userCanAccessFarm(req.user, field.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    res.json(field);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const updateField = async (req, res) => {
  try {
    const field = await Field.findById(req.params.id)
      .populate('farm');

    if (!field) {
      return res.status(404).json({
        message: 'Field not found'
      });
    }

    if (!userCanAccessFarm(req.user, field.farm)) {
      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        fieldId: field._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    if (
      req.body.farm &&
      req.body.farm !== field.farm._id.toString()
    ) {
      const nextFarm = await Farm.findById(req.body.farm);

      if (!nextFarm) {
        return res.status(404).json({
          message: 'Farm not found'
        });
      }

      if (!userCanAccessFarm(req.user, nextFarm)) {
        return res.status(403).json({
          message: 'Not authorized for this farm'
        });
      }

      field.farm = req.body.farm;
    }

    const nextFarmId =
      req.body.farm || field.farm._id;

    const crop = await resolveFieldCrop({
      cropId: req.body.crop,
      cropType: req.body.cropType,
      farmId: nextFarmId,
      user: req.user,
      plantingDate: req.body.plantingDate,
      currentStage: req.body.currentStage
    });

    const nextFarm =
      await Farm.findById(nextFarmId);

    if (!nextFarm) {
      return res.status(404).json({
        message: 'Farm not found'
      });
    }

    await validateFieldBoundary({
      polygonCoordinates: req.body.polygonCoordinates,
      farm: nextFarm,
      excludeFieldId: field._id
    });

    field.name = req.body.name;
    field.cropType = req.body.cropType || '';
    field.crop = crop;
    field.area = req.body.area;
    field.status = req.body.status || 'Active';
    field.healthStatus = req.body.healthStatus || 'Good';
    field.irrigationStatus = req.body.irrigationStatus || 'Scheduled';
    field.notes = req.body.notes || '';
    field.polygonCoordinates = req.body.polygonCoordinates || [];

    await field.save();

    logEvent('info', 'FIELD_UPDATED', {
      fieldId: field._id,
      fieldName: field.name,
      updatedBy: req.user.id,
      role: req.user.role
    });

    const populatedField = await Field.findById(field._id)
      .populate(populateField);

    res.json(populatedField);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

const deleteField = async (req, res) => {
  try {
    const field = await Field.findById(req.params.id)
      .populate('farm');

    if (!field) {
      return res.status(404).json({
        message: 'Field not found'
      });
    }

    if (!userCanAccessFarm(req.user, field.farm)) {
      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        fieldId: field._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    const zoneResult =
      await Zone.deleteMany({ field: field._id });

    await field.deleteOne();

    logEvent('info', 'FIELD_DELETED', {
      fieldId: field._id,
      fieldName: field.name,
      deletedBy: req.user.id,
      role: req.user.role,
      cascadeDeleted: {
        zones: zoneResult.deletedCount || 0
      }
    });

    res.json({
      message: 'Field deleted successfully',
      cascadeDeleted: {
        zones: zoneResult.deletedCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField
};
