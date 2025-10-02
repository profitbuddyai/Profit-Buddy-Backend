const express = require('express');
const router = express.Router();

const getRoutes = require('./Get.routes');
const postRoutes = require('./Post.routes');

router.use('/get', getRoutes);
router.use('/post', postRoutes);

module.exports = router;
