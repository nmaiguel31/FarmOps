const Field = require('../models/Field');
const Farm = require('../models/Farm');
const Crop = require('../models/Crop');
const logEvent = require('../utils/logger');

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

    const crop =
      await validateCropForFarm(req.body.crop, farm._id, req.user);

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

    const crop =
      await validateCropForFarm(req.body.crop, nextFarmId, req.user);

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

    await field.deleteOne();

    logEvent('info', 'FIELD_DELETED', {
      fieldId: field._id,
      fieldName: field.name,
      deletedBy: req.user.id,
      role: req.user.role
    });

    res.json({
      message: 'Field deleted successfully'
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
