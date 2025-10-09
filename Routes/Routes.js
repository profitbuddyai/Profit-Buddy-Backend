const express = require('express');
const router = express.Router();

const getRoutes = require('./Get.routes');
const postRoutes = require('./Post.routes');
const deleteRoutes = require('./Delete.routes');

router.use('/get', getRoutes);
router.use('/post', postRoutes);
router.use('/delete', deleteRoutes);

module.exports = router;
