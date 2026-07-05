const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { writeAuditLog } = require('../services/auditLogService');

const setupMFA = async (req, res) => {

  try {

    const secret = speakeasy.generateSecret({
      name: `FarmOps (${req.user.email})`
    });

    await User.findByIdAndUpdate(
      req.user.id,
      {
        mfaSecret: secret.base32
      }
    );

    const qrCode = await QRCode.toDataURL(
      secret.otpauth_url
    );

    res.json({
      qrCode
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

const verifyMFA = async (req, res) => {

  try {

    const user = await User.findById(
      req.user.id
    );

    const verified = speakeasy.totp.verify({

      secret: user.mfaSecret,
      encoding: 'base32',
      token: req.body.token

    });

    if (!verified) {

      return res.status(400).json({
        message: 'Invalid MFA code'
      });

    }

    user.mfaEnabled = true;

    await user.save();

    await writeAuditLog({
      user: req.user,
      action: 'MFA enabled',
      module: 'Security',
      entityType: 'User',
      entityName: user.fullName || user.email,
      entityId: user._id,
      details: 'User enabled multi-factor authentication',
      severity: 'success'
    });

    res.json({
      message: 'MFA enabled successfully'
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

const getMFAStatus = async (req, res) => {

  try {

    const user = await User.findById(
      req.user.id
    );

    res.json({
      mfaEnabled: user.mfaEnabled
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

const disableMFA = async (req, res) => {

  try {

    const user = await User.findById(
      req.user.id
    );

    user.mfaEnabled = false;

    user.mfaSecret = '';

    await user.save();

    await writeAuditLog({
      user: req.user,
      action: 'MFA disabled',
      module: 'Security',
      entityType: 'User',
      entityName: user.fullName || user.email,
      entityId: user._id,
      details: 'User disabled multi-factor authentication',
      severity: 'warning'
    });

    res.json({
      message: 'MFA disabled'
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};


const loginVerifyMFA = async (req, res) => {

  try {

    const user = await User.findById(
      req.user.id
    );

    const verified =
      speakeasy.totp.verify({

        secret: user.mfaSecret,
        encoding: 'base32',
        token: req.body.token

      });

    if (!verified) {

      return res.status(400).json({
        message: 'Invalid code'
      });

    }

    res.json({
      message: 'MFA verified'
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

module.exports = {
  setupMFA,
  verifyMFA,
  getMFAStatus,
  loginVerifyMFA,
  disableMFA
};
