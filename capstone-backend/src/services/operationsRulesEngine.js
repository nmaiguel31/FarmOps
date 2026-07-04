const OperationSignal = require('../models/OperationSignal');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const FinancialRecord = require('../models/FinancialRecord');
const logEvent = require('../utils/logger');
const { READ_ALL_FARM_ROLES, ROLES, roleIs } = require('../config/roles');

const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

const getAccessibleFarmIds = async (user) => {
  if (roleIs(user.role, READ_ALL_FARM_ROLES)) {
    const farms = await Farm.find().select('_id');
    return farms.map(farm => farm._id);
  }

  const farms = await Farm.find({ owner: user.id }).select('_id');
  return farms.map(farm => farm._id);
};

const getAccessQuery = (user, farmIds) => {
  if (roleIs(user.role, [ROLES.ADMINISTRATOR])) {
    return {
      $or: [
        { farm: { $in: farmIds } },
        { farm: null }
      ]
    };
  }

  return {
    $or: [
      { farm: { $in: farmIds } },
      {
        farm: null,
        owner: user.id
      }
    ]
  };
};

const getFieldSoilMoisture = (field) => {
  const moisture = Number(field.soilMoisture);

  return Number.isFinite(moisture)
    ? moisture
    : 50;
};

const getFieldNdviScore = (field) => {
  const value = Number(field.ndviScore);

  if (Number.isFinite(value) && value > 0) {
    return value > 1 ? value / 100 : value;
  }

  const healthIndex = getFieldHealthIndex(field);

  if (!Number.isFinite(healthIndex)) {
    return null;
  }

  if (healthIndex >= 90) {
    return 0.88;
  }

  if (healthIndex >= 75) {
    return 0.76;
  }

  if (healthIndex >= 60) {
    return 0.63;
  }

  if (healthIndex >= 40) {
    return 0.48;
  }

  return 0.3;
};

const getFieldHealthIndex = (field) => {
  const healthIndex = Number(field.healthIndex);

  if (Number.isFinite(healthIndex) && healthIndex > 0) {
    return healthIndex;
  }

  const explicitNdvi = Number(field.ndviScore);

  if (Number.isFinite(explicitNdvi) && explicitNdvi > 0) {
    return Math.round((explicitNdvi > 1 ? explicitNdvi / 100 : explicitNdvi) * 100);
  }

  const healthStatus = String(field.healthStatus || '').toLowerCase();

  if (healthStatus.includes('critical')) {
    return 35;
  }

  if (
    healthStatus.includes('warning') ||
    healthStatus.includes('fair') ||
    healthStatus.includes('moderate')
  ) {
    return 55;
  }

  return 85;
};

const getFieldNdviHistoryDecline = (field) => {
  const history = Array.isArray(field.ndviHistory)
    ? field.ndviHistory
        .filter(item => Number.isFinite(Number(item.value)))
        .sort((a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0))
    : [];

  if (history.length < 2) {
    return false;
  }

  const previous = Number(history[history.length - 2].value);
  const current = Number(history[history.length - 1].value);
  const normalizedPrevious = previous > 1 ? previous / 100 : previous;
  const normalizedCurrent = current > 1 ? current / 100 : current;

  return normalizedPrevious > 0 &&
    ((normalizedPrevious - normalizedCurrent) / normalizedPrevious) >= 0.15;
};

const addSignal = (candidates, signal) => {
  if (!signal.ruleKey) {
    return;
  }

  candidates.push(signal);
};

const fetchFarmWeather = async (farm) => {
  if (!Number.isFinite(Number(farm.latitude)) || !Number.isFinite(Number(farm.longitude))) {
    return null;
  }

  const params = new URLSearchParams({
    latitude: farm.latitude,
    longitude: farm.longitude,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
    daily: 'precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '3'
  });

  const response = await fetch(`${OPEN_METEO_API_URL}?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const rainProbabilities = Array.isArray(data.daily?.precipitation_probability_max)
    ? data.daily.precipitation_probability_max
        .slice(0, 2)
        .map(value => Number(value))
        .filter(Number.isFinite)
    : [];

  return {
    temperature: Number(data.current?.temperature_2m),
    humidity: Number(data.current?.relative_humidity_2m),
    windSpeed: Number(data.current?.wind_speed_10m),
    rainProbability: rainProbabilities.length
      ? Math.max(...rainProbabilities)
      : 0
  };
};

const createFinancialBucket = ({ farm = null, field = null, crop = null } = {}) => ({
  farm,
  field,
  crop,
  revenue: 0,
  expenses: 0
});

const addFinancialRecordToBucket = (bucket, record) => {
  const amount = Number(record.amount) || 0;

  if (record.type === 'Income') {
    bucket.revenue += amount;
  } else if (record.type === 'Expense') {
    bucket.expenses += amount;
  }
};

const getFinancialMargin = (bucket) => {
  if (bucket.revenue <= 0) {
    return null;
  }

  return ((bucket.revenue - bucket.expenses) / bucket.revenue) * 100;
};

const formatCurrency = (value) =>
  `$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const addFinancialBucketSignals = ({ bucket, candidates, owner, keyScope, label }) => {
  const profit = bucket.revenue - bucket.expenses;
  const margin = getFinancialMargin(bucket);
  const farmId = bucket.farm?._id || bucket.farm || null;
  const fieldId = bucket.field?._id || bucket.field || null;

  if (
    bucket.revenue + bucket.expenses > 0 &&
    profit < 0
  ) {
    addSignal(candidates, {
      title: 'Negative profit detected',
      description: `${label} is currently showing ${formatCurrency(profit)} negative profit.`,
      category: 'Financial',
      priority: 'High',
      status: 'Active',
      farm: farmId,
      field: fieldId,
      owner,
      ruleKey: `financial-negative-profit:${keyScope}`,
      recommendedAction: 'Review expenses, crop performance, and recent financial records.'
    });
  }

  if (
    bucket.revenue > 0 &&
    bucket.expenses > bucket.revenue
  ) {
    addSignal(candidates, {
      title: 'Expenses exceed revenue',
      description: `${label} expenses (${formatCurrency(bucket.expenses)}) are greater than revenue (${formatCurrency(bucket.revenue)}).`,
      category: 'Financial',
      priority: 'High',
      status: 'Active',
      farm: farmId,
      field: fieldId,
      owner,
      ruleKey: `financial-expenses-exceed-revenue:${keyScope}`,
      recommendedAction: 'Review operating costs and identify major expense categories.'
    });
  }

  if (
    margin !== null &&
    margin < 15
  ) {
    addSignal(candidates, {
      title: 'Low profit margin',
      description: `${label} profit margin is ${margin.toFixed(1)}%.`,
      category: 'Financial',
      priority: 'Medium',
      status: 'Active',
      farm: farmId,
      field: fieldId,
      owner,
      ruleKey: `financial-low-margin:${keyScope}`,
      recommendedAction: 'Review pricing, input costs, and crop profitability.'
    });
  }
};

const getLifecycleHarvestDate = (field, crop) => {
  if (field?.expectedHarvestDate) {
    return new Date(field.expectedHarvestDate);
  }

  const plantingDate = field?.plantingDate;
  const lifecycleDays = crop?.lifecycleDays || lifecycleDurationDays;

  if (!plantingDate || !lifecycleDays) {
    return null;
  }

  const harvestDate = new Date(plantingDate);
  harvestDate.setDate(harvestDate.getDate() + Number(lifecycleDays));
  return harvestDate;
};

const getLifecycleProgress = (field, crop) => {
  const plantingDate = field?.plantingDate;
  const lifecycleDays = crop?.lifecycleDays || lifecycleDurationDays;

  if (!plantingDate || !lifecycleDays) {
    return null;
  }

  const startedAt = new Date(plantingDate);
  const elapsedDays = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 86400000));

  return Math.min(100, Math.round((elapsedDays / Number(lifecycleDays)) * 100));
};

const isLifecycleHarvested = (field, crop) => {
  const fieldStatus = String(field.status || '').toLowerCase();
  const cropStage = String(field.currentStage || '').toLowerCase();

  return fieldStatus.includes('harvested') ||
    cropStage === 'harvest';
};

const upsertGeneratedSignal = async (signal) => {
  const ruleKeys = [
    signal.ruleKey,
    ...(signal.ruleKeyAliases || [])
  ].filter(Boolean);

  const existing = await OperationSignal.findOne({
    $or: [
      { ruleKey: { $in: ruleKeys } },
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
    const created = await OperationSignal.create(signal);

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
  existing.ruleKey = signal.ruleKey;

  await OperationSignal.deleteMany({
    _id: { $ne: existing._id },
    $or: [
      { ruleKey: { $in: ruleKeys } },
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

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveStaleSignals = async ({
  user,
  farmIds,
  category,
  rulePrefixes,
  activeRuleKeys
}) => {
  if (!rulePrefixes.length) {
    return 0;
  }

  const accessQuery = getAccessQuery(user, farmIds);
  const staleSignals = await OperationSignal.find({
    $and: [
      accessQuery,
      {
        category,
        status: 'Active',
        $or: rulePrefixes.map(prefix => ({
          ruleKey: new RegExp(`^${escapeRegex(prefix)}`)
        }))
      }
    ]
  });
  let resolvedCount = 0;

  for (const signal of staleSignals) {
    if (activeRuleKeys.has(signal.ruleKey)) {
      continue;
    }

    signal.status = 'Resolved';
    signal.resolvedAt = new Date();
    await signal.save();
    resolvedCount++;
  }

  return resolvedCount;
};

const applyCandidates = async ({
  user,
  farmIds,
  category,
  rulePrefixes,
  candidates
}) => {
  const changed = [];
  const activeRuleKeys = new Set(candidates.map(candidate => candidate.ruleKey));
  let createdCount = 0;
  let reopenedCount = 0;
  let unchangedCount = 0;

  for (const candidate of candidates) {
    candidate.owner = candidate.owner || user.id;

    const result = await upsertGeneratedSignal(candidate);

    if (result.action === 'created') {
      createdCount++;
      changed.push(result.signal);
    } else if (result.action === 'reopened') {
      reopenedCount++;
      changed.push(result.signal);
    } else {
      unchangedCount++;
    }
  }

  const resolvedCount = await resolveStaleSignals({
    user,
    farmIds,
    category,
    rulePrefixes,
    activeRuleKeys
  });

  return {
    category,
    createdCount,
    reopenedCount,
    unchangedCount,
    resolvedCount,
    evaluatedCount: candidates.length,
    changed
  };
};

const evaluateFieldSignals = async (user) => {
  const farmIds = await getAccessibleFarmIds(user);
  const fields = await Field.find({ farm: { $in: farmIds } }).populate('farm');
  const candidates = [];

  fields.forEach(field => {
    const moisture = getFieldSoilMoisture(field);
    const irrigationStatus = String(field.irrigationStatus || '').toLowerCase();

    if (
      moisture < 40 ||
      irrigationStatus.includes('dry')
    ) {
      addSignal(candidates, {
        title: 'Irrigation attention needed',
        description: `${field.name} is showing low moisture or dry irrigation status.`,
        category: 'Irrigation',
        priority: moisture < 30 ? 'High' : 'Medium',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `irrigation-low-moisture:${field._id}`,
        recommendedAction: 'Review irrigation scheduling and inspect the field before the next irrigation window.'
      });
    }
  });

  return applyCandidates({
    user,
    farmIds,
    category: 'Irrigation',
    rulePrefixes: ['irrigation-low-moisture:'],
    candidates
  });
};

const evaluateNDVISignals = async (user) => {
  const farmIds = await getAccessibleFarmIds(user);
  const fields = await Field.find({ farm: { $in: farmIds } }).populate('farm');
  const candidates = [];
  const vegetationRiskRuleKeys = fields.flatMap(field => [
    `ndvi-critical:${field._id}`,
    `ndvi-low:${field._id}`,
    `health-critical:${field._id}`,
    `ndvi-low-vegetation:${field._id}`
  ]);
  const resolvedVegetationRisks = vegetationRiskRuleKeys.length
    ? await OperationSignal.find({
      status: 'Resolved',
      ruleKey: { $in: vegetationRiskRuleKeys }
    }).select('ruleKey')
    : [];
  const resolvedVegetationRiskKeys = new Set(
    resolvedVegetationRisks.map(signal => signal.ruleKey)
  );

  fields.forEach(field => {
    const ndvi = getFieldNdviScore(field);
    const healthIndex = getFieldHealthIndex(field);
    const ndviPercent = ndvi === null ? null : Math.round(ndvi * 100);
    const lowVegetation =
      (ndvi !== null && ndvi > 0.35 && ndvi <= 0.5) ||
      (healthIndex > 40 && healthIndex <= 60);
    const criticalVegetation =
      (ndvi !== null && ndvi <= 0.35) ||
      healthIndex <= 40;

    if (criticalVegetation) {
      addSignal(candidates, {
        title: 'Critical vegetation health',
        description: `${field.name} is showing critical vegetation health${ndviPercent !== null ? ` with NDVI ${ndviPercent}%` : ''}.`,
        category: 'NDVI',
        priority: 'Critical',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `ndvi-critical:${field._id}`,
        ruleKeyAliases: [`health-critical:${field._id}`],
        recommendedAction: 'Inspect field conditions and review irrigation, pest, and nutrient factors.'
      });
      return;
    }

    if (lowVegetation) {
      addSignal(candidates, {
        title: 'Low vegetation performance',
        description: `${field.name} vegetation performance is below target${ndviPercent !== null ? ` with NDVI ${ndviPercent}%` : ''}.`,
        category: 'NDVI',
        priority: 'High',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `ndvi-low:${field._id}`,
        ruleKeyAliases: [`ndvi-low-vegetation:${field._id}`],
        recommendedAction: 'Review crop stress indicators and consider field inspection.'
      });
    }

    if (getFieldNdviHistoryDecline(field)) {
      addSignal(candidates, {
        title: 'Vegetation decline detected',
        description: `${field.name} NDVI declined by at least 15% from the previous reading.`,
        category: 'NDVI',
        priority: 'High',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `ndvi-decline:${field._id}`,
        recommendedAction: 'Compare recent weather, irrigation, and field activity records.'
      });
    }

    const hadResolvedVegetationRisk = [
      `ndvi-critical:${field._id}`,
      `ndvi-low:${field._id}`,
      `health-critical:${field._id}`,
      `ndvi-low-vegetation:${field._id}`
    ].some(ruleKey => resolvedVegetationRiskKeys.has(ruleKey));

    if (
      hadResolvedVegetationRisk &&
      (
        (ndvi !== null && ndvi > 0.65) ||
        healthIndex > 80
      )
    ) {
      addSignal(candidates, {
        title: 'Vegetation recovery detected',
        description: `${field.name} vegetation health has recovered above the monitoring threshold.`,
        category: 'NDVI',
        priority: 'Low',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `ndvi-recovery:${field._id}`,
        recommendedAction: 'Continue monitoring field conditions.'
      });
    }
  });

  return applyCandidates({
    user,
    farmIds,
    category: 'NDVI',
    rulePrefixes: [
      'ndvi-critical:',
      'ndvi-low:',
      'ndvi-decline:',
      'ndvi-recovery:',
      'health-critical:',
      'ndvi-low-vegetation:'
    ],
    candidates
  });
};

const evaluateWeatherSignals = async (user) => {
  const farmIds = await getAccessibleFarmIds(user);
  const farms = await Farm.find({ _id: { $in: farmIds } });
  const candidates = [];

  for (const farm of farms) {
    const weather = await fetchFarmWeather(farm);

    if (!weather) {
      continue;
    }

    if (weather.rainProbability >= 70) {
      addSignal(candidates, {
        title: 'Heavy rain expected',
        description: `Heavy rain is expected near ${farm.name} within 48 hours.`,
        category: 'Weather',
        priority: 'High',
        status: 'Active',
        farm: farm._id,
        ruleKey: `weather-heavy-rain:${farm._id}`,
        recommendedAction: 'Delay irrigation and review field drainage.'
      });
    }

    if (weather.temperature >= 35) {
      addSignal(candidates, {
        title: 'High temperature risk',
        description: `${farm.name} is forecast at ${Math.round(weather.temperature)}°C.`,
        category: 'Weather',
        priority: 'High',
        status: 'Active',
        farm: farm._id,
        ruleKey: `weather-heat-risk:${farm._id}`,
        recommendedAction: 'Monitor crop stress and irrigation needs.'
      });
    }

    if (weather.windSpeed >= 40) {
      addSignal(candidates, {
        title: 'Strong wind conditions',
        description: `${farm.name} wind speed is near ${Math.round(weather.windSpeed)} km/h.`,
        category: 'Weather',
        priority: 'Medium',
        status: 'Active',
        farm: farm._id,
        ruleKey: `weather-strong-wind:${farm._id}`,
        recommendedAction: 'Avoid spraying and inspect vulnerable crops.'
      });
    }

    if (
      weather.humidity <= 35 &&
      weather.rainProbability <= 20
    ) {
      addSignal(candidates, {
        title: 'Dry weather conditions',
        description: `${farm.name} has low humidity and low rain probability.`,
        category: 'Weather',
        priority: 'Medium',
        status: 'Active',
        farm: farm._id,
        ruleKey: `weather-dry-conditions:${farm._id}`,
        recommendedAction: 'Review irrigation schedule.'
      });
    }
  }

  return applyCandidates({
    user,
    farmIds,
    category: 'Weather',
    rulePrefixes: [
      'weather-heavy-rain:',
      'weather-heat-risk:',
      'weather-strong-wind:',
      'weather-dry-conditions:'
    ],
    candidates
  });
};

const evaluateFinancialSignals = async (user) => {
  const farmIds = await getAccessibleFarmIds(user);
  const records = await FinancialRecord.find({ farm: { $in: farmIds } })
    .populate('farm')
    .populate('field')
    .populate('crop');
  const fields = await Field.find({ farm: { $in: farmIds } });
  const crops = await Crop.find({ farm: { $in: farmIds } });
  const candidates = [];
  const globalBucket = createFinancialBucket();
  const farmBuckets = new Map();
  const fieldBuckets = new Map();
  const cropBuckets = new Map();
  let unassignedCount = 0;

  records.forEach(record => {
    addFinancialRecordToBucket(globalBucket, record);

    const farmId = record.farm?._id?.toString?.() || record.farm?.toString?.();
    const fieldId = record.field?._id?.toString?.() || record.field?.toString?.();
    const cropId = record.crop?._id?.toString?.() || record.crop?.toString?.();

    if (!record.farm || !record.field || !record.crop) {
      unassignedCount++;
    }

    if (farmId) {
      if (!farmBuckets.has(farmId)) {
        farmBuckets.set(farmId, createFinancialBucket({ farm: record.farm }));
      }
      addFinancialRecordToBucket(farmBuckets.get(farmId), record);
    }

    if (fieldId) {
      if (!fieldBuckets.has(fieldId)) {
        fieldBuckets.set(fieldId, createFinancialBucket({
          farm: record.farm,
          field: record.field
        }));
      }
      addFinancialRecordToBucket(fieldBuckets.get(fieldId), record);
    }

    if (cropId) {
      if (!cropBuckets.has(cropId)) {
        cropBuckets.set(cropId, createFinancialBucket({
          farm: record.farm,
          crop: record.crop
        }));
      }
      addFinancialRecordToBucket(cropBuckets.get(cropId), record);
    }
  });

  addFinancialBucketSignals({
    bucket: globalBucket,
    candidates,
    owner: user.id,
    keyScope: 'global',
    label: 'Overall operation'
  });

  farmBuckets.forEach((bucket, farmId) => {
    addFinancialBucketSignals({
      bucket,
      candidates,
      owner: user.id,
      keyScope: farmId,
      label: bucket.farm?.name || 'Farm'
    });
  });

  fieldBuckets.forEach((bucket, fieldId) => {
    const field = fields.find(item => item._id.toString() === fieldId);
    addFinancialBucketSignals({
      bucket,
      candidates,
      owner: user.id,
      keyScope: fieldId,
      label: field?.name || bucket.field?.name || 'Field'
    });
  });

  cropBuckets.forEach((bucket, cropId) => {
    const crop = crops.find(item => item._id.toString() === cropId);
    addFinancialBucketSignals({
      bucket,
      candidates,
      owner: user.id,
      keyScope: cropId,
      label: crop?.name || bucket.crop?.name || 'Crop'
    });
  });

  if (unassignedCount > 0) {
    addSignal(candidates, {
      title: 'Unassigned financial records',
      description: `${unassignedCount} financial record${unassignedCount === 1 ? '' : 's'} need better farm, field, or crop association.`,
      category: 'Financial',
      priority: 'Low',
      status: 'Active',
      farm: null,
      field: null,
      owner: user.id,
      ruleKey: 'financial-unassigned-records:global',
      recommendedAction: 'Link financial records to farms, fields, or crops for better reporting accuracy.'
    });
  }

  return applyCandidates({
    user,
    farmIds,
    category: 'Financial',
    rulePrefixes: [
      'financial-negative-profit:',
      'financial-expenses-exceed-revenue:',
      'financial-low-margin:',
      'financial-unassigned-records:'
    ],
    candidates
  });
};

const evaluateLifecycleSignals = async (user) => {
  const farmIds = await getAccessibleFarmIds(user);
  const fields = await Field.find({ farm: { $in: farmIds } })
    .populate('crop')
    .populate('farm');
  const candidates = [];
  const now = new Date();

  fields.forEach(field => {
    const crop = field.crop;

    if (!crop) {
      return;
    }

    const harvested = isLifecycleHarvested(field, crop);
    const harvestDate = getLifecycleHarvestDate(field, crop);
    const progress = getLifecycleProgress(field, crop);
    const currentStage = field.currentStage || 'Planning';

    if (harvested) {
      addSignal(candidates, {
        title: 'Crop successfully completed',
        description: `${field.name} crop cycle is marked as harvested.`,
        category: 'Crop Lifecycle',
        priority: 'Low',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `lifecycle-completed:${field._id}`,
        recommendedAction: 'Review profitability and prepare next planting cycle.'
      });
      return;
    }

    if (harvestDate) {
      const daysUntilHarvest = Math.ceil((harvestDate.getTime() - now.getTime()) / 86400000);

      if (daysUntilHarvest < 0) {
        addSignal(candidates, {
          title: 'Harvest overdue',
          description: `${field.name} expected harvest date has passed. Current stage: ${currentStage}.`,
          category: 'Crop Lifecycle',
          priority: 'High',
          status: 'Active',
          farm: field.farm._id || field.farm,
          field: field._id,
          ruleKey: `lifecycle-harvest-overdue:${field._id}`,
          recommendedAction: 'Inspect field immediately and schedule harvesting.'
        });
      } else if (daysUntilHarvest <= 7) {
        addSignal(candidates, {
          title: 'Harvest approaching',
          description: `${field.name} expected harvest is within ${daysUntilHarvest} day${daysUntilHarvest === 1 ? '' : 's'}. Current stage: ${currentStage}.`,
          category: 'Crop Lifecycle',
          priority: 'Medium',
          status: 'Active',
          farm: field.farm._id || field.farm,
          field: field._id,
          ruleKey: `lifecycle-harvest-approaching:${field._id}`,
          ruleKeyAliases: [`harvest-approaching:${field._id}`],
          recommendedAction: 'Prepare harvesting equipment, labor, and logistics.'
        });
      }
    }

    if (
      progress !== null &&
      progress >= 90
    ) {
      addSignal(candidates, {
        title: 'Crop nearing end of lifecycle',
        description: `${field.name} crop progress is ${progress}%. Current stage: ${currentStage}.`,
        category: 'Crop Lifecycle',
        priority: 'Medium',
        status: 'Active',
        farm: field.farm._id || field.farm,
        field: field._id,
        ruleKey: `lifecycle-nearing-end:${field._id}`,
        recommendedAction: 'Review field status and prepare final operations.'
      });
    }
  });

  return applyCandidates({
    user,
    farmIds,
    category: 'Crop Lifecycle',
    rulePrefixes: [
      'lifecycle-harvest-approaching:',
      'lifecycle-harvest-overdue:',
      'lifecycle-nearing-end:',
      'lifecycle-completed:',
      'harvest-approaching:'
    ],
    candidates
  });
};

const evaluateAllSignals = async (user) => {
  const results = [
    await evaluateFieldSignals(user),
    await evaluateNDVISignals(user),
    await evaluateFinancialSignals(user),
    await evaluateLifecycleSignals(user),
    await evaluateWeatherSignals(user)
  ];

  return {
    results,
    createdCount: results.reduce((sum, item) => sum + item.createdCount, 0),
    reopenedCount: results.reduce((sum, item) => sum + item.reopenedCount, 0),
    resolvedCount: results.reduce((sum, item) => sum + item.resolvedCount, 0),
    evaluatedCount: results.reduce((sum, item) => sum + item.evaluatedCount, 0),
    created: results.flatMap(item => item.changed || [])
  };
};

const runSafely = async (label, evaluator, user) => {
  try {
    return await evaluator(user);
  } catch (error) {
    logEvent('warn', 'SIGNAL_EVALUATION_FAILED', {
      label,
      userId: user?.id,
      message: error.message
    });

    return null;
  }
};

module.exports = {
  evaluateWeatherSignals,
  evaluateNDVISignals,
  evaluateFinancialSignals,
  evaluateLifecycleSignals,
  evaluateFieldSignals,
  evaluateAllSignals,
  runSafely
};
