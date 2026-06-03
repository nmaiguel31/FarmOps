const FinancialRecord = require('../models/FinancialRecord');
const Farm = require('../models/Farm');
const logEvent = require('../utils/logger');

// Create financial record
const createFinancialRecord = async (req, res) => {

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

    const record = await FinancialRecord.create({
      type: req.body.type,
      category: req.body.category,
      amount: req.body.amount,
      description: req.body.description,
      farm: req.body.farm
    });

    logEvent('info', 'FINANCIAL_RECORD_CREATED', {
      recordId: record._id,
      type: record.type,
      amount: record.amount,
      farmId: farm._id,
      createdBy: req.user.id
  });
    res.status(201).json(record);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Get financial records
const getFinancialRecords = async (req, res) => {

  try {

    let records;

    // Admin sees all records
    if (req.user.role === 'admin') {

      records = await FinancialRecord.find()
        .populate({
          path: 'farm',
          populate: {
            path: 'owner',
            select: 'email role'
          }
        });

    } else {

      // Managers only see their farm records
      const farms = await Farm.find({
        owner: req.user.id
      });

      const farmIds = farms.map(farm => farm._id);

      records = await FinancialRecord.find({
        farm: { $in: farmIds }
      }).populate({
        path: 'farm',
        populate: {
          path: 'owner',
          select: 'email role'
        }
      });

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

    if (
      req.user.role !== 'admin' &&
      record.farm.owner.toString() !== req.user.id
    ) {

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

    if (
      req.user.role !== 'admin' &&
      record.farm.owner.toString() !== req.user.id
    ) {

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

    record.type = req.body.type;
    record.category = req.body.category;
    record.amount = req.body.amount;
    record.description = req.body.description;

    await record.save();

    logEvent('info', 'FINANCIAL_RECORD_UPDATED', {
      recordId: record._id,
      type: record.type,
      amount: record.amount,
      updatedBy: req.user.id,
      role: req.user.role
    });

    res.json(record);

  } catch (error) {

    res.status(500).json({
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