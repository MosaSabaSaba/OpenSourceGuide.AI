const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        title: 'OpenSourceGuide.AI',
        style: 'style',
        script: 'script'
    });
});

module.exports = router;