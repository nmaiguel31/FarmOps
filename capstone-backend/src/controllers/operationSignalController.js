const OperationSignal = require('../models/OperationSignal');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const FinancialRecord = require('../models/FinancialRecord');
const logEvent = require('../utils/logger');

const populateSignal = [
  {
    path: 'farm',
    populate: {
      path: 'owner',
      select: 'email role'
    }
  },
  {
    path: 'field',
    populate: {
      path: 'crop'
    }
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

const validateFarmAccess = async (farmId, user) => {
  const farm = await Farm.findById(farmId);

  if (!farm) {
    const error = new Error('Farm not found');
    error.statusCode = 404;
    throw error;
  }

  if (!userCanAccessFarm(user, farm)) {
    const error = new Error('Not authorized for this farm');
    error.statusCode = 403;
    throw error;
  }

  return farm;
};

const validateFieldForFarm = async (fieldId, farmId) => {
  if (!fieldId) {
    return null;
  }

  const field = await Field.findById(fieldId);

  if (!field) {
    const error = new Error('Field not found');
    error.statusCode = 404;
    throw error;
  }

  if (field.farm.toString() !== farmId.toString()) {
    const error = new Error('Field must belong to the selected farm');
    error.statusCode = 400;
    throw error;
  }

  return field._id;
};

const buildSignalPayload = async (body, user) => {
  const farm =
    await validateFarmAccess(body.farm, user);
  const field =
    await validateFieldForFarm(body.field, farm._id);

  return {
    title: body.title,
    description: body.description,
    category: body.category,
    priority: body.priority || 'Medium',
    status: body.status || 'Active',
    farm: farm._id,
    field,
    recommendedAction: body.recommendedAction,
    ruleKey: body.ruleKey || '',
    resolvedAt: body.status === 'Resolved'
      ? body.resolvedAt || new Date()
      : null
  };
};

const getOperationSignals = async (req, res) => {
  try {
    const farmIds =
      await getAccessibleFarmIds(req.user);
    const query = {
      farm: { $in: farmIds }
    };

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    if (req.query.priority && req.query.priority !== 'All') {
      query.priority = req.query.priority;
    }

    if (req.query.farm && req.query.farm !== 'All') {
      query.farm = req.query.farm;
    }

    if (req.query.field && req.query.field !== 'All') {
      query.field = req.query.field;
    }

    const signals =
      await OperationSignal.find(query)
        .sort({ status: 1, createdAt: -1 })
        .populate(populateSignal);

    res.json(signals);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getActiveOperationSignals = async (req, res) => {
  req.query.status = 'Active';
  return getOperationSignals(req, res);
};

const createOperationSignal = async (req, res) => {
  try {
    const payload =
      await buildSignalPayload(req.body, req.user);
    const signal =
      await OperationSignal.create(payload);

    logEvent('info', 'OPERATION_SIGNAL_CREATED', {
      signalId: signal._id,
      category: signal.category,
      priority: signal.priority,
      createdBy: req.user.id
    });

    const populatedSignal =
      await OperationSignal.findById(signal._id)
        .populate(populateSignal);

    res.status(201).json(populatedSignal);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

const resolveOperationSignal = async (req, res) => {
  try {
    const signal =
      await OperationSignal.findById(req.params.id)
        .populate('farm');

    if (!signal) {
      return res.status(404).json({
        message: 'Operation signal not found'
      });
    }

    if (!userCanAccessFarm(req.user, signal.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    signal.status = 'Resolved';
    signal.resolvedAt = new Date();
    await signal.save();

    logEvent('info', 'OPERATION_SIGNAL_RESOLVED', {
      signalId: signal._id,
      resolvedBy: req.user.id
    });

    const populatedSignal =
      await OperationSignal.findById(signal._id)
        .populate(populateSignal);

    res.json(populatedSignal);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteOperationSignal = async (req, res) => {
  try {
    const signal =
      await OperationSignal.findById(req.params.id)
        .populate('farm');

    if (!signal) {
      return res.status(404).json({
        message: 'Operation signal not found'
      });
    }

    if (!userCanAccessFarm(req.user, signal.farm)) {
      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    await signal.deleteOne();

    res.json({
      message: 'Operation signal deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getFieldSoilMoisture = (field) => {
  const explicitMoisture =
    Number(field.soilMoisture ?? field.moistureScore);

  if (Number.isFinite(explicitMoisture) && explicitMoisture > 0) {
    return Math.max(0, Math.min(100, Math.round(explicitMoisture)));
  }

  const irrigationStatus =
    String(field.irrigationStatus || '').toLowerCase();

  if (irrigationStatus.includes('dry')) {
    return 38;
  }

  if (irrigationStatus.includes('irrigated')) {
    return 84;
  }

  return 68;
};

const getFieldNdviScore = (field) => {
  const explicitNdvi =
    Number(field.ndviScore ?? field.ndvi ?? field.vegetationScore);

  if (Number.isFinite(explicitNdvi) && explicitNdvi > 0) {
    return Math.max(0, Math.min(100, Math.round(explicitNdvi)));
  }

  const healthStatus =
    String(field.healthStatus || '').toLowerCase();

  if (
    healthStatus.includes('critical') ||
    healthStatus.includes('poor')
  ) {
    return 28;
  }

  if (
    healthStatus.includes('warning') ||
    healthStatus.includes('fair') ||
    healthStatus.includes('moderate')
  ) {
    return 55;
  }

  return 91;
};

const getFieldHealthIndex = (field) => {
  const status =
    String(field.status || '').toLowerCase();

  if (
    !field.crop ||
    status.includes('resting') ||
    status.includes('harvested')
  ) {
    return null;
  }

  let score =
    getFieldNdviScore(field);
  const moisture =
    getFieldSoilMoisture(field);
  const irrigationStatus =
    String(field.irrigationStatus || '').toLowerCase();

  if (moisture < 30) {
    score -= 20;
  } else if (moisture <= 50) {
    score -= 10;
  }

  if (irrigationStatus.includes('dry')) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const upsertGeneratedSignal = async (signal) => {
  const existing =
    await OperationSignal.findOne({
      $or: [
        {
          ruleKey: signal.ruleKey
        },
        {
          title: signal.title,
          category: signal.category,
          farm: signal.farm,
          field: signal.field || null,
          $or: [
            { ruleKey: '' },
            { ruleKey: { $exists: false } },
            { ruleKey: null }
          ]
        }
      ]
    }).sort({ status: 1, updatedAt: -1 });

  if (!existing) {
    const created =
      await OperationSignal.create(signal);

    return {
      signal: created,
      action: 'created'
    };
  }

  existing.title = signal.title;
  existing.description = signal.description;
  existing.category = signal.category;
  existing.priority = signal.priority;
  existing.farm = signal.farm;
  existing.field = signal.field || null;
  existing.recommendedAction = signal.recommendedAction;

  await OperationSignal.deleteMany({
    _id: { $ne: existing._id },
    title: signal.title,
    category: signal.category,
    farm: signal.farm,
    field: signal.field || null,
    $or: [
      { ruleKey: '' },
      { ruleKey: { $exists: false } },
      { ruleKey: null }
    ]
  });

  existing.ruleKey = signal.ruleKey;

  if (existing.status === 'Resolved') {
    existing.status = 'Active';
    existing.resolvedAt = null;
    await existing.save();

    return {
      signal: existing,
      action: 'reopened'
    };
  }

  await existing.save();

  return {
    signal: existing,
    action: 'unchanged'
  };
};

const generateOperationSignals = async (req, res) => {
  try {
    const farmIds =
      await getAccessibleFarmIds(req.user);
    const fields =
      await Field.find({ farm: { $in: farmIds } })
        .populate('crop')
        .populate('farm');
    const crops =
      await Crop.find({ farm: { $in: farmIds } });
    const records =
      await FinancialRecord.find({ farm: { $in: farmIds } });
    const candidates = [];

    fields.forEach(field => {
      const moisture =
        getFieldSoilMoisture(field);
      const irrigationStatus =
        String(field.irrigationStatus || '').toLowerCase();
      const health =
        getFieldHealthIndex(field);
      const ndvi =
        getFieldNdviScore(field);

      if (
        moisture < 40 ||
        irrigationStatus.includes('dry')
      ) {
        candidates.push({
          title: 'Irrigation attention needed',
          description: `${field.name} is showing low moisture or dry irrigation status.`,
          category: 'Irrigation',
          priority: moisture < 30 ? 'High' : 'Medium',
          status: 'Active',
          farm: field.farm._id,
          field: field._id,
          ruleKey: `irrigation-low-moisture:${field._id}`,
          recommendedAction: 'Review irrigation scheduling and inspect the field before the next irrigation window.'
        });
      }

      if (
        health !== null &&
        health < 50
      ) {
        candidates.push({
          title: 'Critical field health signal',
          description: `${field.name} has a calculated health index below 50%.`,
          category: 'NDVI',
          priority: health < 35 ? 'Critical' : 'High',
          status: 'Active',
          farm: field.farm._id,
          field: field._id,
          ruleKey: `health-critical:${field._id}`,
          recommendedAction: 'Inspect crop condition and compare NDVI, moisture, and irrigation signals.'
        });
      }

      if (ndvi < 50) {
        candidates.push({
          title: 'Low vegetation score',
          description: `${field.name} has an NDVI score below the target operating range.`,
          category: 'NDVI',
          priority: ndvi < 35 ? 'High' : 'Medium',
          status: 'Active',
          farm: field.farm._id,
          field: field._id,
          ruleKey: `ndvi-low-vegetation:${field._id}`,
          recommendedAction: 'Prioritize a field walk and review crop stress indicators.'
        });
      }
    });

    crops.forEach(crop => {
      if (!crop.expectedHarvestDate) {
        return;
      }

      const daysUntilHarvest =
        Math.ceil(
          (new Date(crop.expectedHarvestDate).getTime() - Date.now()) /
          86400000
        );
      const field =
        fields.find(item =>
          item.crop &&
          item.crop._id.toString() === crop._id.toString()
        );

      if (
        field &&
        daysUntilHarvest >= 0 &&
        daysUntilHarvest <= 7
      ) {
        candidates.push({
          title: 'Harvest approaching',
          description: `${field.name} is expected to reach harvest within ${daysUntilHarvest} days.`,
          category: 'Crop Lifecycle',
          priority: daysUntilHarvest <= 2 ? 'High' : 'Medium',
          status: 'Active',
          farm: field.farm._id,
          field: field._id,
          ruleKey: `harvest-approaching:${field._id}`,
          recommendedAction: 'Confirm labor, equipment, storage, and sales readiness for harvest.'
        });
      }
    });

    const financialBuckets =
      new Map();

    records.forEach(record => {
      const farmId =
        record.farm.toString();

      if (!financialBuckets.has(farmId)) {
        financialBuckets.set(farmId, 0);
      }

      const signedAmount =
        Number(record.amount || 0) *
        (record.type === 'Income' ? 1 : -1);

      financialBuckets.set(
        farmId,
        financialBuckets.get(farmId) + signedAmount
      );
    });

    financialBuckets.forEach((profit, farmId) => {
      if (profit >= 0) {
        return;
      }

      candidates.push({
        title: 'Negative operating profit',
        description: 'Expenses currently exceed revenue for this farm.',
        category: 'Financial',
        priority: 'High',
        status: 'Active',
        farm: farmId,
        field: null,
        ruleKey: `financial-negative-profit:${farmId}`,
        recommendedAction: 'Review cost drivers, crop sales, and pending payments for this farm.'
      });
    });

    const changed = [];
    let createdCount = 0;
    let reopenedCount = 0;

    for (const candidate of candidates) {
      const result =
        await upsertGeneratedSignal(candidate);

      if (result.action === 'created') {
        createdCount++;
        changed.push(result.signal);
      }

      if (result.action === 'reopened') {
        reopenedCount++;
        changed.push(result.signal);
      }
    }

    const populatedCreated =
      await OperationSignal.find({
        _id: { $in: changed.map(signal => signal._id) }
      }).populate(populateSignal);

    res.status(201).json({
      created: populatedCreated,
      createdCount,
      reopenedCount,
      evaluatedCount: candidates.length
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  getOperationSignals,
  getActiveOperationSignals,
  createOperationSignal,
  resolveOperationSignal,
  deleteOperationSignal,
  generateOperationSignals
};
