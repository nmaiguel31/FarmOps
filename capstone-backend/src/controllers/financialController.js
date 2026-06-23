const FinancialRecord = require('../models/FinancialRecord');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const logEvent = require('../utils/logger');

const populateRecord = [
  {
    path: 'farm',
    populate: {
      path: 'owner',
      select: 'email role'
    }
  },
  { path: 'field' },
  { path: 'crop' }
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

const validateCropForContext = async ({ cropId, farmId, fieldId }) => {
  if (!cropId) {
    return null;
  }

  const crop = await Crop.findById(cropId);

  if (!crop) {
    const error = new Error('Crop not found');
    error.statusCode = 404;
    throw error;
  }

  if (crop.farm.toString() !== farmId.toString()) {
    const error = new Error('Crop must belong to the selected farm');
    error.statusCode = 400;
    throw error;
  }

  if (fieldId) {
    const field = await Field.findById(fieldId);

    if (
      field?.crop &&
      field.crop.toString() !== crop._id.toString()
    ) {
      const error = new Error('Crop must match the selected field crop');
      error.statusCode = 400;
      throw error;
    }
  }

  return crop._id;
};

const getCalculatedAmount = (body) => {
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unitPrice);
  const amount = Number(body.amount);

  if (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(unitPrice) &&
    unitPrice > 0
  ) {
    return quantity * unitPrice;
  }

  return Number.isFinite(amount) ? amount : 0;
};

const buildRecordPayload = async (body, user) => {
  const farm = await validateFarmAccess(body.farm, user);
  const field =
    await validateFieldForFarm(body.field, farm._id);
  const crop =
    await validateCropForContext({
      cropId: body.crop,
      farmId: farm._id,
      fieldId: field
    });

  return {
    type: body.type,
    category: body.category,
    amount: getCalculatedAmount(body),
    description: body.description || '',
    date: body.date || new Date(),
    farm: farm._id,
    field,
    crop,
    quantity: body.quantity === '' || body.quantity === null
      ? undefined
      : body.quantity,
    unit: body.unit || '',
    unitPrice: body.unitPrice === '' || body.unitPrice === null
      ? undefined
      : body.unitPrice,
    buyer: body.type === 'Income' ? body.buyer || '' : '',
    vendor: body.type === 'Expense' ? body.vendor || '' : '',
    paymentStatus: body.paymentStatus || 'Paid',
    notes: body.notes || ''
  };
};

// Create financial record
const createFinancialRecord = async (req, res) => {
  try {
    const payload =
      await buildRecordPayload(req.body, req.user);

    const record = await FinancialRecord.create(payload);

    logEvent('info', 'FINANCIAL_RECORD_CREATED', {
      recordId: record._id,
      type: record.type,
      amount: record.amount,
      farmId: record.farm,
      createdBy: req.user.id
    });

    const populatedRecord = await FinancialRecord.findById(record._id)
      .populate(populateRecord);

    res.status(201).json(populatedRecord);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

// Get financial records
const getFinancialRecords = async (req, res) => {
  try {
    let records;

    if (req.user.role === 'admin') {
      records = await FinancialRecord.find()
        .populate(populateRecord);
    } else {
      const farmIds = await getAccessibleFarmIds(req.user);

      records = await FinancialRecord.find({
        farm: { $in: farmIds }
      }).populate(populateRecord);
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Delete financial record
const deleteFinancialRecord = async (req, res) => {
  try {
    const record = await FinancialRecord.findById(req.params.id)
      .populate('farm');

    if (!record) {
      return res.status(404).json({
        message: 'Financial record not found'
      });
    }

    if (!userCanAccessFarm(req.user, record.farm)) {
      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        recordId: record._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    await record.deleteOne();

    logEvent('info', 'FINANCIAL_RECORD_DELETED', {
      recordId: record._id,
      type: record.type,
      amount: record.amount,
      deletedBy: req.user.id,
      role: req.user.role
    });

    res.json({
      message: 'Financial record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Update financial record
const updateFinancialRecord = async (req, res) => {
  try {
    const record = await FinancialRecord.findById(req.params.id)
      .populate('farm');

    if (!record) {
      return res.status(404).json({
        message: 'Financial record not found'
      });
    }

    if (!userCanAccessFarm(req.user, record.farm)) {
      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        recordId: record._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });
    }

    const payload =
      await buildRecordPayload(req.body, req.user);

    Object.assign(record, payload);
    await record.save();

    logEvent('info', 'FINANCIAL_RECORD_UPDATED', {
      recordId: record._id,
      type: record.type,
      amount: record.amount,
      updatedBy: req.user.id,
      role: req.user.role
    });

    const populatedRecord = await FinancialRecord.findById(record._id)
      .populate(populateRecord);

    res.json(populatedRecord);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
};

module.exports = {
  createFinancialRecord,
  getFinancialRecords,
  deleteFinancialRecord,
  updateFinancialRecord
};
