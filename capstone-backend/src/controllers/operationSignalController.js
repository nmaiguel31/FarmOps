const OperationSignal = require('../models/OperationSignal');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const FinancialRecord = require('../models/FinancialRecord');
const logEvent = require('../utils/logger');
const OperationsRulesEngine = require('../services/operationsRulesEngine');

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
  if (!farm) {
    return false;
  }

  return user.role === 'admin' ||
    farm.owner.toString() === user.id;
};

const userCanAccessSignal = (user, signal) => {
  if (signal.farm) {
    return userCanAccessFarm(user, signal.farm);
  }

  return user.role === 'admin' ||
    signal.owner?.toString?.() === user.id;
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
    body.farm
      ? await validateFarmAccess(body.farm, user)
      : null;
  const field =
    farm
      ? await validateFieldForFarm(body.field, farm._id)
      : null;

  return {
    title: body.title,
    description: body.description,
    category: body.category,
    priority: body.priority || 'Medium',
    status: body.status || 'Active',
    farm: farm?._id || null,
    owner: user.id,
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
    const accessQuery =
      req.user.role === 'admin'
        ? {
          $or: [
            { farm: { $in: farmIds } },
            { farm: null }
          ]
        }
        : {
          $or: [
            { farm: { $in: farmIds } },
            {
              farm: null,
              owner: req.user.id
            }
          ]
        };
    const query = {
      ...accessQuery
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

    if (!userCanAccessSignal(req.user, signal)) {
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

    if (!userCanAccessSignal(req.user, signal)) {
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

const createFinancialBucket = ({
  key,
  label,
  farm = null,
  field = null,
  crop = null,
  scope
}) => ({
  key,
  label,
  farm,
  field,
  crop,
  scope,
  revenue: 0,
  expenses: 0,
  records: 0
});

const addFinancialRecordToBucket = (bucket, record) => {
  const amount =
    Number(record.amount || 0);

  if (record.type === 'Income') {
    bucket.revenue += amount;
  } else {
    bucket.expenses += amount;
  }

  bucket.records++;
};

const getFinancialMargin = (bucket) => {
  if (bucket.revenue <= 0) {
    return bucket.expenses > 0 ? -100 : null;
  }

  return ((bucket.revenue - bucket.expenses) / bucket.revenue) * 100;
};

const addFinancialBucketSignals = ({
  bucket,
  candidates,
  owner
}) => {
  if (!bucket.records) {
    return;
  }

  const profit =
    bucket.revenue - bucket.expenses;
  const margin =
    getFinancialMargin(bucket);
  const signalTarget =
    bucket.field || bucket.crop || bucket.farm || null;
  const signalFarm =
    bucket.farm || null;
  const signalField =
    bucket.field || null;

  if (profit < 0) {
    candidates.push({
      title: 'Negative profit detected',
      description: `${bucket.label} has negative profit of ${Math.round(profit)}.`,
      category: 'Financial',
      priority: 'High',
      status: 'Active',
      farm: signalFarm,
      field: signalField,
      owner,
      ruleKey: `financial-negative-profit:${signalTarget || bucket.key}`,
      ruleKeyAliases: bucket.scope === 'farm'
        ? [`financial-negative-profit:${bucket.farm}`]
        : [],
      recommendedAction: 'Review expenses, crop performance, and recent financial records.'
    });
  }

  if (
    bucket.scope === 'farm' &&
    bucket.expenses > bucket.revenue
  ) {
    candidates.push({
      title: 'Expenses exceed revenue',
      description: `${bucket.label} expenses exceed revenue.`,
      category: 'Financial',
      priority: 'High',
      status: 'Active',
      farm: signalFarm,
      field: null,
      owner,
      ruleKey: `financial-expenses-exceed-revenue:${bucket.farm}`,
      recommendedAction: 'Review operating costs and identify major expense categories.'
    });
  }

  if (
    margin !== null &&
    margin < 15
  ) {
    candidates.push({
      title: 'Low profit margin',
      description: `${bucket.label} profit margin is ${Math.round(margin)}%.`,
      category: 'Financial',
      priority: 'Medium',
      status: 'Active',
      farm: signalFarm,
      field: signalField,
      owner,
      ruleKey: `financial-low-margin:${signalTarget || bucket.key}`,
      recommendedAction: 'Review pricing, input costs, and crop profitability.'
    });
  }
};

const addFinancialSignalCandidates = ({
  records,
  fields,
  crops,
  candidates,
  owner
}) => {
  const farmBuckets =
    new Map();
  const fieldBuckets =
    new Map();
  const cropBuckets =
    new Map();
  const fieldMap =
    new Map(fields.map(field => [field._id.toString(), field]));
  const cropMap =
    new Map(crops.map(crop => [crop._id.toString(), crop]));
  const globalBucket =
    createFinancialBucket({
      key: 'global',
      label: 'All farm operations',
      owner,
      scope: 'global'
    });
  let unassignedCount = 0;

  records.forEach(record => {
    const farmId =
      record.farm?.toString?.() || '';
    const fieldId =
      record.field?.toString?.() || '';
    const cropId =
      record.crop?.toString?.() || '';

    addFinancialRecordToBucket(globalBucket, record);

    if (!record.farm || !record.field || !record.crop) {
      unassignedCount++;
    }

    if (farmId) {
      if (!farmBuckets.has(farmId)) {
        farmBuckets.set(
          farmId,
          createFinancialBucket({
            key: farmId,
            label: 'Farm operation',
            farm: farmId,
            scope: 'farm'
          })
        );
      }

      addFinancialRecordToBucket(farmBuckets.get(farmId), record);
    }

    if (fieldId) {
      const field =
        fieldMap.get(fieldId);

      if (!fieldBuckets.has(fieldId)) {
        fieldBuckets.set(
          fieldId,
          createFinancialBucket({
            key: fieldId,
            label: field?.name || 'Field operation',
            farm: field?.farm?._id || field?.farm || farmId || null,
            field: fieldId,
            scope: 'field'
          })
        );
      }

      addFinancialRecordToBucket(fieldBuckets.get(fieldId), record);
    }

    if (cropId) {
      const crop =
        cropMap.get(cropId);

      if (!cropBuckets.has(cropId)) {
        cropBuckets.set(
          cropId,
          createFinancialBucket({
            key: cropId,
            label: crop?.name || 'Crop operation',
            farm: crop?.farm || farmId || null,
            crop: cropId,
            scope: 'crop'
          })
        );
      }

      addFinancialRecordToBucket(cropBuckets.get(cropId), record);
    }
  });

  [
    ...farmBuckets.values(),
    ...fieldBuckets.values(),
    ...cropBuckets.values()
  ].forEach(bucket => {
    addFinancialBucketSignals({
      bucket,
      candidates,
      owner
    });
  });

  if (globalBucket.expenses > globalBucket.revenue) {
    candidates.push({
      title: 'Expenses exceed revenue',
      description: 'Total operating expenses exceed total revenue across available financial records.',
      category: 'Financial',
      priority: 'High',
      status: 'Active',
      farm: null,
      field: null,
      owner,
      ruleKey: 'financial-expenses-exceed-revenue:global',
      recommendedAction: 'Review operating costs and identify major expense categories.'
    });
  }

  if (unassignedCount > 0) {
    candidates.push({
      title: 'Unassigned financial records',
      description: `${unassignedCount} financial record${unassignedCount === 1 ? '' : 's'} need better farm, field, or crop association.`,
      category: 'Financial',
      priority: 'Low',
      status: 'Active',
      farm: null,
      field: null,
      owner,
      ruleKey: 'financial-unassigned-records:global',
      recommendedAction: 'Link financial records to farms, fields, or crops for better reporting accuracy.'
    });
  }
};

const formatLifecycleDate = (date) => {
  const parsedDate =
    new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getLifecycleHarvestDate = (crop) => {
  const expectedHarvestDate =
    crop.expectedHarvestDate
      ? new Date(crop.expectedHarvestDate)
      : null;

  if (
    expectedHarvestDate &&
    !Number.isNaN(expectedHarvestDate.getTime())
  ) {
    return expectedHarvestDate;
  }

  if (!crop.plantingDate || !crop.lifecycleDays) {
    return null;
  }

  const plantingDate =
    new Date(crop.plantingDate);

  if (Number.isNaN(plantingDate.getTime())) {
    return null;
  }

  plantingDate.setDate(
    plantingDate.getDate() + Number(crop.lifecycleDays)
  );

  return plantingDate;
};

const getLifecycleProgress = (crop, harvestDate) => {
  if (!crop.plantingDate || !harvestDate) {
    return null;
  }

  const plantingDate =
    new Date(crop.plantingDate);

  if (Number.isNaN(plantingDate.getTime())) {
    return null;
  }

  const totalMs =
    harvestDate.getTime() - plantingDate.getTime();

  if (totalMs <= 0) {
    return null;
  }

  const elapsedMs =
    Date.now() - plantingDate.getTime();

  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
};

const isLifecycleHarvested = (field, crop) => {
  const fieldStatus =
    String(field.status || '').toLowerCase();
  const cropStatus =
    String(crop.status || '').toLowerCase();
  const currentStage =
    String(crop.currentStage || '').toLowerCase();

  return fieldStatus.includes('harvested') ||
    cropStatus.includes('harvested') ||
    currentStage === 'harvest';
};

const addLifecycleSignalCandidate = ({ field, crop, candidates }) => {
  const harvestDate =
    getLifecycleHarvestDate(crop);
  const harvested =
    isLifecycleHarvested(field, crop);
  const currentStage =
    crop.currentStage || 'Not available';
  const harvestDateLabel =
    harvestDate ? formatLifecycleDate(harvestDate) : 'Not available';

  if (harvested) {
    candidates.push({
      title: 'Crop successfully completed',
      description: `${field.name} crop cycle is marked as completed. Current stage: ${currentStage}. Estimated harvest: ${harvestDateLabel}.`,
      category: 'Crop Lifecycle',
      priority: 'Low',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `lifecycle-completed:${field._id}`,
      recommendedAction: 'Review profitability and prepare next planting cycle.'
    });
    return;
  }

  if (!harvestDate) {
    return;
  }

  const daysUntilHarvest =
    Math.ceil((harvestDate.getTime() - Date.now()) / 86400000);
  const progress =
    getLifecycleProgress(crop, harvestDate);

  if (daysUntilHarvest < 0) {
    candidates.push({
      title: 'Harvest overdue',
      description: `${field.name} expected harvest date has passed. Current stage: ${currentStage}. Estimated harvest: ${harvestDateLabel}.`,
      category: 'Crop Lifecycle',
      priority: 'High',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `lifecycle-harvest-overdue:${field._id}`,
      recommendedAction: 'Inspect field immediately and schedule harvesting.'
    });
    return;
  }

  if (daysUntilHarvest <= 7) {
    candidates.push({
      title: 'Harvest approaching',
      description: `${field.name} is expected to reach harvest within ${daysUntilHarvest} days. Current stage: ${currentStage}. Estimated harvest: ${harvestDateLabel}.`,
      category: 'Crop Lifecycle',
      priority: 'Medium',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `lifecycle-harvest-approaching:${field._id}`,
      ruleKeyAliases: [
        `harvest-approaching:${field._id}`
      ],
      recommendedAction: 'Prepare harvesting equipment, labor, and logistics.'
    });
  }

  if (
    progress !== null &&
    progress >= 90
  ) {
    candidates.push({
      title: 'Crop nearing end of lifecycle',
      description: `${field.name} crop progress is ${progress}%. Current stage: ${currentStage}. Estimated harvest: ${harvestDateLabel}.`,
      category: 'Crop Lifecycle',
      priority: 'Medium',
      status: 'Active',
      farm: field.farm._id,
      field: field._id,
      ruleKey: `lifecycle-nearing-end:${field._id}`,
      recommendedAction: 'Review field status and prepare final operations.'
    });
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
          owner: signal.owner || null,
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
  existing.owner = signal.owner || existing.owner || null;
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
        owner: signal.owner || null,
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

const sendEvaluationResult = async (req, res, evaluator) => {
  try {
    const result = await evaluator(req.user);
    const changedIds = (result.created || result.changed || [])
      .map(signal => signal._id)
      .filter(Boolean);
    const populatedCreated = changedIds.length
      ? await OperationSignal.find({
        _id: { $in: changedIds }
      }).populate(populateSignal)
      : [];

    res.status(201).json({
      ...result,
      created: populatedCreated
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const generateOperationSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateAllSignals);

const evaluateAllOperationSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateAllSignals);

const evaluateWeatherSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateWeatherSignals);

const evaluateNDVISignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateNDVISignals);

const evaluateFinancialSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateFinancialSignals);

const evaluateLifecycleSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateLifecycleSignals);

const evaluateFieldSignals = (req, res) =>
  sendEvaluationResult(req, res, OperationsRulesEngine.evaluateFieldSignals);

module.exports = {
  getOperationSignals,
  getActiveOperationSignals,
  createOperationSignal,
  resolveOperationSignal,
  deleteOperationSignal,
  generateOperationSignals,
  evaluateAllOperationSignals,
  evaluateWeatherSignals,
  evaluateNDVISignals,
  evaluateFinancialSignals,
  evaluateLifecycleSignals,
  evaluateFieldSignals
};
