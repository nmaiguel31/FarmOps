const Zone = require('../models/Zone');
const Field = require('../models/Field');
const Farm = require('../models/Farm');
const logEvent = require('../utils/logger');
const {
  isPolygonInsidePolygon,
  normalizePolygon,
  polygonsOverlap
} = require('../utils/polygonValidation');
const { READ_ALL_FARM_ROLES, roleIs } = require('../config/roles');

const populateZone = [
  {
    path: 'field',
    populate: [
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
    ]
  }
];

const userCanAccessFarm = (user, farm) => {
  return roleIs(user.role, READ_ALL_FARM_ROLES) ||
    farm.owner.toString() === user.id;
};

const getAccessibleFieldIds = async (user) => {
  if (roleIs(user.role, READ_ALL_FARM_ROLES)) {
    const fields = await Field.find();
    return fields.map(field => field._id);
  }

  const farms = await Farm.find({
    owner: user.id
  });

  const fields = await Field.find({
    farm: { $in: farms.map(farm => farm._id) }
  });

  return fields.map(field => field._id);
};

const getAuthorizedField = async (fieldId, user) => {
  const field = await Field.findById(fieldId)
    .populate('farm');

  if (!field) {
    const error = new Error('Field not found');
    error.statusCode = 404;
    throw error;
  }

  if (!userCanAccessFarm(user, field.farm)) {
    const error = new Error('Not authorized for this field');
    error.statusCode = 403;
    throw error;
  }

  return field;
};

const validateZoneBoundary = async ({ polygonCoordinates, field, excludeZoneId }) => {
  const zonePolygon =
    normalizePolygon(polygonCoordinates);

  if (zonePolygon.length < 3) {
    return;
  }

  const fieldPolygon =
    normalizePolygon(field.polygonCoordinates);

  if (
    fieldPolygon.length < 3 ||
    !isPolygonInsidePolygon(zonePolygon, fieldPolygon)
  ) {
    const error = new Error('Zone boundary must stay inside the selected field.');
    error.statusCode = 400;
    throw error;
  }

  const query = {
    field: field._id,
    polygonCoordinates: {
      $exists: true,
      $ne: []
    }
  };

  if (excludeZoneId) {
    query._id = {
      $ne: excludeZoneId
    };
  }

  const existingZones =
    await Zone.find(query);

  const overlaps =
    existingZones.some(zone =>
      polygonsOverlap(zonePolygon, zone.polygonCoordinates)
    );

  if (overlaps) {
    const error = new Error('Zone boundary overlaps an existing zone.');
    error.statusCode = 400;
    throw error;
  }
};

const createZone = async (req, res) => {
  try {
    const field = await getAuthorizedField(req.body.field, req.user);

    await validateZoneBoundary({
      polygonCoordinates: req.body.polygonCoordinates,
      field
    });

    const zone = await Zone.create({
      name: req.body.name,
      field: field._id,
      polygonCoordinates: req.body.polygonCoordinates || [],
      area: req.body.area || 0,
      zoneType: req.body.zoneType || 'Monitoring',
      healthScore: req.body.healthScore || 0,
      moistureScore: req.body.moistureScore || 0,
      ndviScore: req.body.ndviScore || 0,
      recommendation: req.body.recommendation || '',
      notes: req.body.notes || ''
    });

    logEvent('info', 'ZONE_CREATED', {
      zoneId: zone._id,
      zoneName: zone.name,
      fieldId: field._id,
      createdBy: req.user.id
    });

    const populatedZone = await Zone.findById(zone._id)
      .populate(populateZone);

    res.status(201).json(populatedZone);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

const getZones = async (req, res) => {
  try {
    const fieldIds = await getAccessibleFieldIds(req.user);
    const query = {
      field: { $in: fieldIds }
    };

    if (req.query.field) {
      query.field = {
        $in: fieldIds.filter(id => id.toString() === req.query.field)
      };
    }

    const zones = await Zone.find(query)
      .populate(populateZone);

    res.json(zones);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
      .populate(populateZone);

    if (!zone) {
      return res.status(404).json({
        message: 'Zone not found'
      });
    }

    if (!userCanAccessFarm(req.user, zone.field.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    res.json(zone);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const updateZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
      .populate({
        path: 'field',
        populate: {
          path: 'farm'
        }
      });

    if (!zone) {
      return res.status(404).json({
        message: 'Zone not found'
      });
    }

    if (!userCanAccessFarm(req.user, zone.field.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    if (
      req.body.field &&
      req.body.field !== zone.field._id.toString()
    ) {
      const nextField = await getAuthorizedField(req.body.field, req.user);
      zone.field = nextField._id;
    }

    const targetField =
      await getAuthorizedField(zone.field._id || zone.field, req.user);

    await validateZoneBoundary({
      polygonCoordinates: req.body.polygonCoordinates,
      field: targetField,
      excludeZoneId: zone._id
    });

    zone.name = req.body.name;
    zone.polygonCoordinates = req.body.polygonCoordinates || [];
    zone.area = req.body.area || 0;
    zone.zoneType = req.body.zoneType || 'Monitoring';
    zone.healthScore = req.body.healthScore || 0;
    zone.moistureScore = req.body.moistureScore || 0;
    zone.ndviScore = req.body.ndviScore || 0;
    zone.recommendation = req.body.recommendation || '';
    zone.notes = req.body.notes || '';

    await zone.save();

    logEvent('info', 'ZONE_UPDATED', {
      zoneId: zone._id,
      zoneName: zone.name,
      updatedBy: req.user.id
    });

    const populatedZone = await Zone.findById(zone._id)
      .populate(populateZone);

    res.json(populatedZone);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

const deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
      .populate({
        path: 'field',
        populate: {
          path: 'farm'
        }
      });

    if (!zone) {
      return res.status(404).json({
        message: 'Zone not found'
      });
    }

    if (!userCanAccessFarm(req.user, zone.field.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    await zone.deleteOne();

    logEvent('info', 'ZONE_DELETED', {
      zoneId: zone._id,
      zoneName: zone.name,
      deletedBy: req.user.id
    });

    res.json({
      message: 'Zone deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone
};
