const Crop = require('../models/Crop');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const logEvent = require('../utils/logger');

const lifecycleDurationDays = 120;

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

const lifecycleStages = [
  'Planning',
  'Land Preparation',
  'Planting',
  'Vegetative Growth',
  'Flowering',
  'Ripening',
  'Harvest'
];

const requiresPlantingDateForStage = (stage) => {
  return lifecycleStages.indexOf(stage) >=
    lifecycleStages.indexOf('Planting');
};

const createPlantingDateError = () => {
  const error = new Error('Planting date is required for this crop stage.');
  error.statusCode = 400;
  return error;
};

// Create crop
const createCrop = async (req, res) => {

  try {
    
    const farm = await Farm.findById(req.body.farm);
    
    if (!farm) {
      return res.status(404).json({
        message: 'Farm not found'
      });
    }
    
    // Ownership validation
    if (
      req.user.role !== 'admin' &&
      farm.owner.toString() !== req.user.id
    ) {

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
    
    const stage =
      req.body.currentStage || 'Planning';
    const plantingDate =
      normalizeLifecycleDate(req.body.plantingDate) ||
      (req.body.currentStage === 'Planning' ? new Date() : undefined);

    if (
      req.body.currentStage &&
      requiresPlantingDateForStage(stage) &&
      !plantingDate
    ) {
      throw createPlantingDateError();
    }

    const expectedHarvestDate =
      normalizeLifecycleDate(req.body.expectedHarvestDate) ||
      calculateExpectedHarvestDate(plantingDate);

    const crop = await Crop.create({
      name: req.body.name,
      type: req.body.type,
      season: req.body.season,
      farm: req.body.farm,
      currentStage: stage,
      stageStartedAt: req.body.stageStartedAt || new Date(),
      plantingDate,
      expectedHarvestDate
    });
    
    logEvent('info', 'CROP_CREATED', {
      cropId: crop._id,
      cropName: crop.name,
      farmId: farm._id,
      createdBy: req.user.id
    });
    res.status(201).json(crop);
    
  } catch (error) {
    
    res.status(error.statusCode || 500).json({
      message: error.message
    });
    
  }
  
};

// Get crops
const getCrops = async (req, res) => {

  try {

    let crops;

    // Admin can see all crops
    if (req.user.role === 'admin') {

      crops = await Crop.find()
        .populate({
          path: 'farm',
          populate: {
            path: 'owner',
            select: 'email role'
          }
        });

    } else {

      // Managers only see crops from their farms
      const farms = await Farm.find({
        owner: req.user.id
      });

      const farmIds = farms.map(farm => farm._id);

      crops = await Crop.find({
        farm: { $in: farmIds }
      }).populate({
        path: 'farm',
        populate: {
          path: 'owner',
          select: 'email role'
        }
      });

    }

    res.json(crops);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Delete crop
const deleteCrop = async (req, res) => {

  try {

    const crop = await Crop.findById(req.params.id)
      .populate('farm');

    if (!crop) {

      return res.status(404).json({
        message: 'Crop not found'
      });

    }

    if (
      req.user.role !== 'admin' &&
      crop.farm.owner.toString() !== req.user.id
    ) {

      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        cropId: crop._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });

    }

    const fieldResult =
      await Field.updateMany(
        { crop: crop._id },
        {
          $set: {
            crop: null
          }
        }
      );

    await crop.deleteOne();

    logEvent('info', 'CROP_DELETED', {
      cropId: crop._id,
      cropName: crop.name,
      deletedBy: req.user.id,
      role: req.user.role,
      detachedFields: fieldResult.modifiedCount || 0
    });

    res.json({
      message: 'Crop deleted successfully',
      detachedFields: fieldResult.modifiedCount || 0
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Update crop
const updateCrop = async (req, res) => {

  try {

    const crop = await Crop.findById(req.params.id)
      .populate('farm');

    if (!crop) {

      return res.status(404).json({
        message: 'Crop not found'
      });

    }

    if (
      req.user.role !== 'admin' &&
      crop.farm.owner.toString() !== req.user.id
    ) {

      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        cropId: crop._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });

    }

    const nextStage =
      req.body.currentStage ?? crop.currentStage;
    const stageChanged =
      nextStage !== crop.currentStage;
    const plantingDate =
      req.body.plantingDate === undefined
        ? crop.plantingDate
        : normalizeLifecycleDate(req.body.plantingDate);

    if (
      req.body.currentStage &&
      requiresPlantingDateForStage(nextStage) &&
      !plantingDate
    ) {
      throw createPlantingDateError();
    }

    const expectedHarvestDate =
      req.body.expectedHarvestDate === undefined
        ? crop.expectedHarvestDate || calculateExpectedHarvestDate(plantingDate)
        : normalizeLifecycleDate(req.body.expectedHarvestDate) ||
          calculateExpectedHarvestDate(plantingDate);

    crop.name = req.body.name ?? crop.name;
    crop.type = req.body.type ?? crop.type;
    crop.season = req.body.season ?? crop.season;
    crop.currentStage = nextStage;
    crop.stageStartedAt = req.body.stageStartedAt ??
      (stageChanged ? new Date() : crop.stageStartedAt);
    crop.plantingDate = plantingDate;
    crop.expectedHarvestDate = expectedHarvestDate;

    await crop.save();

    logEvent('info', 'CROP_UPDATED', {
      cropId: crop._id,
      cropName: crop.name,
      updatedBy: req.user.id,
      role: req.user.role
    });

    res.json(crop);

  } catch (error) {

    res.status(error.statusCode || 500).json({
      message: error.message
    });

  }

};

module.exports = {
  createCrop,
  getCrops,
  deleteCrop,
  updateCrop
};
