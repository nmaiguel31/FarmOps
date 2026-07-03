const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Zone = require('../models/Zone');
const Crop = require('../models/Crop');
const FinancialRecord = require('../models/FinancialRecord');
const logEvent = require('../utils/logger');

const normalizePolygonCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map((point) => {
      if (Array.isArray(point)) {
        return {
          lat: Number(point[0]),
          lng: Number(point[1])
        };
      }

      return {
        lat: Number(point?.lat),
        lng: Number(point?.lng)
      };
    })
    .filter(point =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
    );
};

// Create farm
const createFarm = async (req, res) => {
  try {

    const farm = await Farm.create({
      name: req.body.name,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      size: req.body.size,
      polygonCoordinates: normalizePolygonCoordinates(req.body.polygonCoordinates),
      owner: req.user.id
    });
  logEvent('info', 'FARM_CREATED', {
    farmId: farm._id,
    farmName: farm.name,
    owner: req.user.id,
    role: req.user.role
});
    res.status(201).json(farm);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Get all farms
const getFarms = async (req, res) => {
  try {

    let farms;

if (req.user.role === 'admin') {

  farms = await Farm.find()
    .populate('owner', 'email role')
    .lean();

} else {

  farms = await Farm.find({
    owner: req.user.id
  }).populate('owner', 'email role')
    .lean();

}

    farms = farms.map(farm => ({
      ...farm,
      polygonCoordinates: normalizePolygonCoordinates(farm.polygonCoordinates)
    }));

    res.json(farms);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Delete farm
const deleteFarm = async (req, res) => {

  try {

    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({
        message: 'Farm not found'
      });
    }

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
        message: 'Not authorized'
      });

    }

    const fields =
      await Field.find({ farm: farm._id }).select('_id crop');
    const fieldIds =
      fields.map(field => field._id);

    const deleteSummary = {
      zones: 0,
      fields: 0,
      crops: 0,
      financialRecords: 0
    };

    if (fieldIds.length) {
      const zoneResult =
        await Zone.deleteMany({ field: { $in: fieldIds } });
      deleteSummary.zones = zoneResult.deletedCount || 0;

      const fieldResult =
        await Field.deleteMany({ _id: { $in: fieldIds } });
      deleteSummary.fields = fieldResult.deletedCount || 0;
    }

    const cropResult =
      await Crop.deleteMany({ farm: farm._id });
    deleteSummary.crops = cropResult.deletedCount || 0;

    const financialResult =
      await FinancialRecord.deleteMany({ farm: farm._id });
    deleteSummary.financialRecords = financialResult.deletedCount || 0;

    await farm.deleteOne();

    logEvent('info', 'FARM_DELETED', {
      farmId: farm._id,
      farmName: farm.name,
      deletedBy: req.user.id,
      role: req.user.role,
      cascadeDeleted: deleteSummary
    });

    res.json({
      message: 'Farm deleted successfully',
      cascadeDeleted: deleteSummary
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Update Farm

const updateFarm = async (req, res) => {

  try {

    const farm = await Farm.findById(req.params.id);

    if (!farm) {

      return res.status(404).json({
        message: 'Farm not found'
      });

    }

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
        message: 'Not authorized'
      });

    }

    farm.name = req.body.name;
    farm.location = req.body.location;
    farm.latitude = req.body.latitude;
    farm.longitude = req.body.longitude;
    farm.size = req.body.size;
    farm.polygonCoordinates = normalizePolygonCoordinates(req.body.polygonCoordinates);

    await farm.save();

    logEvent('info', 'FARM_UPDATED', {
      farmId: farm._id,
      farmName: farm.name,
      updatedBy: req.user.id,
      role: req.user.role
    });

    res.json(farm);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

module.exports = {
  createFarm,
  getFarms,
  deleteFarm,
  updateFarm
};
