const getAdminData = (req, res) => {
  res.json({
    message: 'Welcome admin'
  });
};

module.exports = {
  getAdminData
};