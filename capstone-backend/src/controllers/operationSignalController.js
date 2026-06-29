const OperationSignal = require('../models/OperationSignal');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const FinancialRecord = require('../models/FinancialRecord');
const logEvent = require('../utils/logger');

const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

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
    const normalizedNdvi =
      explicitNdvi <= 1 ? explicitNdvi * 100 : explicitNdvi;

    return Math.max(0, Math.min(100, Math.round(normalizedNdvi)));
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

  const explicitHealthIndex =
    Number(field.healthIndex ?? field.healthScore);

  if (Number.isFinite(explicitHealthIndex) && explicitHealthIndex > 0) {
    const normalizedHealth =
      explicitHealthIndex <= 1 ? explicitHealthIndex * 100 : explicitHealthIndex;

    return Math.max(0, Math.min(100, Math.round(normalizedHealth)));
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

const getFieldNdviHistoryDecline = (field) => {
  const history =
    field.ndviHistory || field.vegetationHistory || [];

  if (!Array.isArray(history) || history.length < 2) {
    return null;
  }

  const readings =
    history
      .map(item => {
        if (typeof item === 'number') {
          return item <= 1 ? item * 100 : item;
        }

        const value =
          Number(item?.ndviScore ?? item?.ndvi ?? item?.value);

        if (!Number.isFinite(value)) {
          return null;
        }

        return value <= 1 ? value * 100 : value;
      })
      .filter(value => Number.isFinite(value));

  if (readings.length < 2) {
    return null;
  }

  const previous =
    readings[readings.length - 2];
  const current =
    readings[readings.length - 1];

  if (previous <= 0) {
    return null;
  }

  return ((previous - current) / previous) * 100;
};

const addNdviSignalCandidate = ({
  field,
  candidates,
  resolvedVegetationRiskKeys
}) => {
  const health =
    getFieldHealthIndex(field);
  const ndvi =
    getFieldNdviScore(field);
  const decline =
    getFieldNdviHistoryDecline(field);
  const fieldId =
    field._id.toString();
  const hasCriticalVegetation =
    ndvi <= 35 ||
    (health !== null && health <= 40);
  const hasLowVegetation =
    !hasCriticalVegetation &&
    (
      (ndvi > 35 && ndvi <= 50) ||
      (health !== null && health > 40 && health <= 60)
    );

  if (hasCriticalVegetation) {
    candidates.push({
      title: 'Critical vegetation health',
      description: `${field.name} has critical vegetation indicators: NDVI ${ndvi}%${health === null ? '' : ` and health index ${health}%`}.`,
      category: 'NDVI',
      priority: 'Critical',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `ndvi-critical:${field._id}`,
      ruleKeyAliases: [
        `health-critical:${field._id}`,
        `ndvi-low-vegetation:${field._id}`
      ],
      recommendedAction: 'Inspect field conditions and review irrigation, pest, and nutrient factors.'
    });
    return;
  }

  if (hasLowVegetation) {
    candidates.push({
      title: 'Low vegetation performance',
      description: `${field.name} has low vegetation indicators: NDVI ${ndvi}%${health === null ? '' : ` and health index ${health}%`}.`,
      category: 'NDVI',
      priority: 'High',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `ndvi-low:${field._id}`,
      ruleKeyAliases: [
        `health-critical:${field._id}`,
        `ndvi-low-vegetation:${field._id}`
      ],
      recommendedAction: 'Review crop stress indicators and consider field inspection.'
    });
  }

  if (decline !== null && decline >= 15) {
    candidates.push({
      title: 'Vegetation decline detected',
      description: `${field.name} NDVI decreased by ${Math.round(decline)}% from the previous reading.`,
      category: 'NDVI',
      priority: 'High',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `ndvi-decline:${field._id}`,
      recommendedAction: 'Compare recent weather, irrigation, and field activity records.'
    });
  }

  if (
    (ndvi > 65 || (health !== null && health > 80)) &&
    (
      resolvedVegetationRiskKeys.has(`ndvi-critical:${fieldId}`) ||
      resolvedVegetationRiskKeys.has(`ndvi-low:${fieldId}`) ||
      resolvedVegetationRiskKeys.has(`health-critical:${fieldId}`) ||
      resolvedVegetationRiskKeys.has(`ndvi-low-vegetation:${fieldId}`)
    )
  ) {
    candidates.push({
      title: 'Vegetation recovery detected',
      description: `${field.name} has improved to NDVI ${ndvi}%${health === null ? '' : ` and health index ${health}%`}.`,
      category: 'NDVI',
      priority: 'Low',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `ndvi-recovery:${field._id}`,
      recommendedAction: 'Continue monitoring field conditions.'
    });
  }
};

const isValidCoordinate = (value) => {
  const coordinate =
    Number(value);

  return Number.isFinite(coordinate);
};

const fetchFarmWeather = async (farm) => {
  if (
    !isValidCoordinate(farm.latitude) ||
    !isValidCoordinate(farm.longitude) ||
    typeof fetch !== 'function'
  ) {
    return null;
  }

  const params =
    new URLSearchParams({
      latitude: String(farm.latitude),
      longitude: String(farm.longitude),
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,precipitation_probability_max',
      forecast_days: '4',
      timezone: 'auto'
    });
  const controller =
    new AbortController();
  const timeout =
    setTimeout(() => controller.abort(), 5000);

  try {
    const response =
      await fetch(`${OPEN_METEO_API_URL}?${params.toString()}`, {
        signal: controller.signal
      });

    if (!response.ok) {
      return null;
    }

    const payload =
      await response.json();
    const current =
      payload?.current || {};
    const daily =
      payload?.daily || {};
    const rainProbabilities =
      (daily.precipitation_probability_max || [])
        .slice(0, 2)
        .map(value => Number(value || 0));
    const temperatures =
      [
        current.temperature_2m,
        ...(daily.temperature_2m_max || []).slice(0, 2)
      ].map(value => Number(value || 0));

    return {
      temperature:
        Math.max(...temperatures.filter(Number.isFinite), 0),
      humidity:
        Number(current.relative_humidity_2m || 0),
      windSpeed:
        Number(current.wind_speed_10m || 0),
      rainProbability:
        Math.max(...rainProbabilities.filter(Number.isFinite), 0)
    };
  } catch (error) {
    logEvent('warn', 'WEATHER_SIGNAL_FETCH_FAILED', {
      farmId: farm._id,
      message: error.message
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const addWeatherSignalCandidates = async (farms, candidates) => {
  for (const farm of farms) {
    const weather =
      await fetchFarmWeather(farm);

    if (!weather) {
      continue;
    }

    if (weather.rainProbability >= 70) {
      candidates.push({
        title: 'Heavy rain expected',
        description: `${farm.name} has ${weather.rainProbability}% rain probability within the next 48 hours.`,
        category: 'Weather',
        priority: 'High',
        status: 'Active',
        farm: farm._id,
        field: null,
        ruleKey: `weather-heavy-rain:${farm._id}`,
        recommendedAction: 'Delay irrigation and review field drainage.'
      });
    }

    if (weather.temperature >= 35) {
      candidates.push({
        title: 'High temperature risk',
        description: `${farm.name} is forecast near ${Math.round(weather.temperature)}°C.`,
        category: 'Weather',
        priority: 'High',
        status: 'Active',
        farm: farm._id,
        field: null,
        ruleKey: `weather-heat-risk:${farm._id}`,
        recommendedAction: 'Monitor crop stress and irrigation needs.'
      });
    }

    if (weather.windSpeed >= 40) {
      candidates.push({
        title: 'Strong wind conditions',
        description: `${farm.name} has wind speed near ${Math.round(weather.windSpeed)} km/h.`,
        category: 'Weather',
        priority: 'Medium',
        status: 'Active',
        farm: farm._id,
        field: null,
        ruleKey: `weather-strong-wind:${farm._id}`,
        recommendedAction: 'Avoid spraying and inspect vulnerable crops.'
      });
    }

    if (
      weather.humidity <= 35 &&
      weather.rainProbability <= 20
    ) {
      candidates.push({
        title: 'Dry weather conditions',
        description: `${farm.name} has ${Math.round(weather.humidity)}% humidity and low rain probability.`,
        category: 'Weather',
        priority: 'Medium',
        status: 'Active',
        farm: farm._id,
        field: null,
        ruleKey: `weather-dry-conditions:${farm._id}`,
        recommendedAction: 'Review irrigation schedule.'
      });
    }
  }
};

const upsertGeneratedSignal = async (signal) => {
  const ruleKeys =
    [
      signal.ruleKey,
      ...(signal.ruleKeyAliases || [])
    ].filter(Boolean);
  const existing =
    await OperationSignal.findOne({
      $or: [
        {
          ruleKey: {
            $in: ruleKeys
          }
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
    $or: [
      {
        ruleKey: {
          $in: ruleKeys
        }
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
    const farms =
      await Farm.find({ _id: { $in: farmIds } });
    const fields =
      await Field.find({ farm: { $in: farmIds } })
        .populate('crop')
        .populate('farm');
    const crops =
      await Crop.find({ farm: { $in: farmIds } });
    const records =
      await FinancialRecord.find({ farm: { $in: farmIds } });
    const vegetationRiskRuleKeys =
      fields.flatMap(field => [
        `ndvi-critical:${field._id}`,
        `ndvi-low:${field._id}`,
        `health-critical:${field._id}`,
        `ndvi-low-vegetation:${field._id}`
      ]);
    const resolvedVegetationRisks =
      vegetationRiskRuleKeys.length
        ? await OperationSignal.find({
          status: 'Resolved',
          ruleKey: {
            $in: vegetationRiskRuleKeys
          }
        }).select('ruleKey')
        : [];
    const resolvedVegetationRiskKeys =
      new Set(resolvedVegetationRisks.map(signal => signal.ruleKey));
    const candidates = [];

    fields.forEach(field => {
      const moisture =
        getFieldSoilMoisture(field);
      const irrigationStatus =
        String(field.irrigationStatus || '').toLowerCase();

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

      addNdviSignalCandidate({
        field,
        candidates,
        resolvedVegetationRiskKeys
      });
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

    await addWeatherSignalCandidates(farms, candidates);

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
