const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

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

module.exports = {
  setupMFA,
  verifyMFA,
  getMFAStatus
};