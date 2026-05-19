// Custom Views router - 4 lab science platform features
// (JS file consumed from TS index via require)
const { Router } = require('express');
const { Instrument } = require('../models');

const router = Router();

// In-memory store for calibration_schedule (no migration needed)
const calibration_schedule = [];

// Static / synthesized sample workflow data
// VIZ 1: Sample workflow lifecycle counts
router.get('/sample-workflow', async (_req, res) => {
  try {
    const stages = [
      { key: 'collected', label: 'Collected', count: 142, color: '#3b82f6' },
      { key: 'prepared',  label: 'Prepared',  count: 118, color: '#8b5cf6' },
      { key: 'analyzed',  label: 'Analyzed',  count:  97, color: '#10b981' },
      { key: 'reported',  label: 'Reported',  count:  84, color: '#f59e0b' },
    ];
    res.json({ stages, totalSamples: stages[0].count, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'sample-workflow failed', details: e.message });
  }
});

// VIZ 2: Data quality scores per instrument over the last 14 days
router.get('/data-quality', async (_req, res) => {
  try {
    let instruments = [];
    try {
      const rows = await Instrument.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
      instruments = rows.map(r => r.name);
    } catch {
      instruments = [];
    }
    if (!instruments.length) {
      instruments = ['LC-MS Orbitrap', 'NMR-600', 'HPLC-Agilent', 'Plate Reader', 'Flow Cytometer'];
    }
    const days = 14;
    const series = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const point = { date: d.toISOString().slice(0, 10) };
      instruments.forEach((name, idx) => {
        // Deterministic-ish score 80-99
        const score = 80 + ((i * 7 + idx * 13) % 20);
        point[name] = score;
      });
      series.push(point);
    }
    res.json({ instruments, series });
  } catch (e) {
    res.status(500).json({ error: 'data-quality failed', details: e.message });
  }
});

// NON-VIZ 1: Sample barcode PDF export
router.get('/sample-barcodes', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 86400000);
    const endDate = end ? new Date(end) : new Date();
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'invalid date range' });
    }

    // Build synthetic sample list within range
    const samples = [];
    const days = Math.max(1, Math.min(31, Math.round((endDate - startDate) / 86400000) + 1));
    for (let d = 0; d < days; d++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + d);
      for (let s = 0; s < 6; s++) {
        const id = `S${day.toISOString().slice(0,10).replace(/-/g,'')}-${String(s+1).padStart(3,'0')}`;
        samples.push({
          id,
          collected: day.toISOString().slice(0,10),
          matrix: ['Plasma','Serum','Tissue','Urine'][s % 4],
        });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_barcodes.pdf"');

    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).fillColor('#0f172a').text('TetraScience - Sample Barcode Sheet', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#475569')
       .text(`Range: ${startDate.toISOString().slice(0,10)} to ${endDate.toISOString().slice(0,10)}    Samples: ${samples.length}`);
    doc.moveDown(0.8);

    const startX = 36;
    let y = doc.y;
    const rowH = 56;
    const labelW = 220;
    const barcodeW = 280;
    const barcodeH = 36;

    samples.forEach((sample) => {
      if (y + rowH > doc.page.height - 36) {
        doc.addPage();
        y = 36;
      }
      // Label box
      doc.rect(startX, y, labelW, rowH).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.fillColor('#0f172a').fontSize(11).text(sample.id, startX + 8, y + 8);
      doc.fillColor('#64748b').fontSize(9).text(`Matrix: ${sample.matrix}`, startX + 8, y + 24);
      doc.fillColor('#64748b').fontSize(9).text(`Collected: ${sample.collected}`, startX + 8, y + 38);

      // Barcode strip - vertical bars
      const bx = startX + labelW + 16;
      const bw = barcodeW;
      doc.rect(bx, y + 8, bw, barcodeH).strokeColor('#e2e8f0').stroke();
      const bars = 40;
      const barSpace = bw / bars;
      for (let b = 0; b < bars; b++) {
        const w = ((sample.id.charCodeAt(b % sample.id.length) + b) % 4) + 1;
        const x = bx + b * barSpace;
        doc.rect(x + 1, y + 10, w * 0.6, barcodeH - 4).fillColor('#0f172a').fill();
      }
      // Numeric label under barcode
      doc.fillColor('#0f172a').fontSize(8).text(sample.id, bx, y + barcodeH + 12, { width: bw, align: 'center' });

      y += rowH + 8;
    });

    doc.end();
  } catch (e) {
    res.status(500).json({ error: 'sample-barcodes failed', details: e.message });
  }
});

// NON-VIZ 2: Calibration scheduler
router.get('/calibration-schedule', (_req, res) => {
  const sorted = [...calibration_schedule].sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));
  res.json({ entries: sorted });
});

router.post('/calibration-schedule', (req, res) => {
  try {
    const { instrument, nextDue, technician, notes } = req.body || {};
    if (!instrument || !nextDue || !technician) {
      return res.status(400).json({ error: 'instrument, nextDue and technician are required' });
    }
    const entry = {
      id: `cal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      instrument,
      nextDue,
      technician,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };
    calibration_schedule.push(entry);
    res.status(201).json({ ok: true, entry });
  } catch (e) {
    res.status(500).json({ error: 'calibration-schedule create failed', details: e.message });
  }
});

module.exports = router;
module.exports.default = router;
