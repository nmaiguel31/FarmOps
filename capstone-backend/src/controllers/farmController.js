const Farm = require('../models/Farm');
const logEvent = require('../utils/logger');

// Create farm
const createFarm = async (req, res) => {
  try {

    console.log(req.body);

    const farm = await Farm.create({
      name: req.body.name,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      size: req.body.size,
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
    .populate('owner', 'email role');

} else {

  farms = await Farm.find({
    owner: req.user.id
  }).populate('owner', 'email role');

}

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

    await farm.deleteOne();

    logEvent('info', 'FARM_DELETED', {
      farmId: farm._id,
      farmName: farm.name,
      deletedBy: req.user.id,
      role: req.user.role
    });

    res.json({
      message: 'Farm deleted successfully'
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