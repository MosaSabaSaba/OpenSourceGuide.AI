import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', {
        title: 'OpenSourceGuide.AI',
        style: 'style',
        script: 'script'
    });
});

export default router;