/**
 * charts.js
 * Manages three responsive Chart.js graphs for the Virtual Sphere Gap Lab:
 * 1. Breakdown Voltage vs Gap Distance (by Oil Condition)
 * 2. Breakdown Voltage vs Oil Condition (Average kV)
 * 3. Dielectric Strength Comparison (kV/mm per Trial)
 */

(function (global) {
  'use strict';

  const OIL_COLORS = {
    fresh: { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.28)', solid: '#0284c7' },
    used: { border: '#d97706', bg: 'rgba(217, 119, 6, 0.30)', solid: '#d97706' },
    contaminated: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.30)', solid: '#dc2626' }
  };

  class LabCharts {
    constructor({ bdvGapCanvas, bdvOilCanvas, strengthCanvas }) {
      this.bdvGapCanvas = bdvGapCanvas;
      this.bdvOilCanvas = bdvOilCanvas;
      this.strengthCanvas = strengthCanvas;

      this.chartBdvGap = null;
      this.chartBdvOil = null;
      this.chartStrength = null;

      this._initCharts();
    }

    _initCharts() {
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not loaded.');
        return;
      }

      Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
      Chart.defaults.color = '#334155';

      // 1. Breakdown Voltage vs Gap Distance
      this.chartBdvGap = new Chart(this.bdvGapCanvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Fresh Oil (Simulated)',
              data: [],
              borderColor: OIL_COLORS.fresh.border,
              backgroundColor: OIL_COLORS.fresh.bg,
              borderWidth: 2.5,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.25,
              showLine: true
            },
            {
              label: 'Used Oil (Simulated)',
              data: [],
              borderColor: OIL_COLORS.used.border,
              backgroundColor: OIL_COLORS.used.bg,
              borderWidth: 2.5,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.25,
              showLine: true
            },
            {
              label: 'Contaminated Oil (Simulated)',
              data: [],
              borderColor: OIL_COLORS.contaminated.border,
              backgroundColor: OIL_COLORS.contaminated.bg,
              borderWidth: 2.5,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.25,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'nearest', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} kV @ ${ctx.parsed.x.toFixed(1)} mm`
              }
            }
          },
          scales: {
            x: {
              type: 'linear',
              min: 0.5,
              max: 5.5,
              title: { display: true, text: 'Electrode Gap Distance (mm)', font: { weight: '600' } },
              grid: { color: 'rgba(148, 163, 184, 0.2)' }
            },
            y: {
              beginAtZero: true,
              suggestedMax: 90,
              title: { display: true, text: 'Breakdown Voltage (kV)', font: { weight: '600' } },
              grid: { color: 'rgba(148, 163, 184, 0.2)' }
            }
          }
        }
      });

      // 2. Breakdown Voltage vs Oil Condition
      this.chartBdvOil = new Chart(this.bdvOilCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Fresh Oil', 'Used Oil', 'Contaminated Oil'],
          datasets: [
            {
              label: 'Avg. Breakdown Voltage (kV)',
              data: [0, 0, 0],
              backgroundColor: [
                'rgba(2, 132, 199, 0.82)',
                'rgba(217, 119, 6, 0.82)',
                'rgba(220, 38, 38, 0.82)'
              ],
              borderColor: [OIL_COLORS.fresh.solid, OIL_COLORS.used.solid, OIL_COLORS.contaminated.solid],
              borderWidth: 1.5,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Avg BDV: ${Number(ctx.raw).toFixed(2)} kV`
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Transformer Oil Condition', font: { weight: '600' } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              suggestedMax: 80,
              title: { display: true, text: 'Mean Breakdown Voltage (kV)', font: { weight: '600' } },
              grid: { color: 'rgba(148, 163, 184, 0.2)' }
            }
          }
        }
      });

      // 3. Dielectric Strength Comparison across trials
      this.chartStrength = new Chart(this.strengthCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Dielectric Strength (kV/mm)',
              data: [],
              backgroundColor: [],
              borderColor: [],
              borderWidth: 1.5,
              borderRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Dielectric Strength: ${Number(ctx.raw).toFixed(2)} kV/mm`
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Recorded Trial', font: { weight: '600' } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              suggestedMax: 25,
              title: { display: true, text: 'Dielectric Strength (kV/mm)', font: { weight: '600' } },
              grid: { color: 'rgba(148, 163, 184, 0.2)' }
            }
          }
        }
      });
    }

    /**
     * Recomputes and updates all 3 charts from the observation rows array.
     * @param {Array<{trialNo: number, oilId: string, oilName: string, gapMm: number, breakdownKv: number, dielectricStrength: number}>} observations
     */
    update(observations) {
      if (!this.chartBdvGap || !this.chartBdvOil || !this.chartStrength) return;

      // 1. Update Breakdown Voltage vs Gap Distance
      const byOil = { fresh: [], used: [], contaminated: [] };
      observations.forEach((obs) => {
        if (byOil[obs.oilId]) {
          byOil[obs.oilId].push({ x: obs.gapMm, y: obs.breakdownKv });
        }
      });

      Object.keys(byOil).forEach((k) => {
        byOil[k].sort((a, b) => a.x - b.x);
      });

      this.chartBdvGap.data.datasets[0].data = byOil.fresh;
      this.chartBdvGap.data.datasets[1].data = byOil.used;
      this.chartBdvGap.data.datasets[2].data = byOil.contaminated;
      this.chartBdvGap.update();

      // 2. Update Breakdown Voltage vs Oil Condition (averages)
      const avg = (list) => {
        if (!list.length) return 0;
        const sum = list.reduce((acc, item) => acc + item.y, 0);
        return Number((sum / list.length).toFixed(2));
      };
      this.chartBdvOil.data.datasets[0].data = [
        avg(byOil.fresh),
        avg(byOil.used),
        avg(byOil.contaminated)
      ];
      this.chartBdvOil.update();

      // 3. Update Dielectric Strength Comparison
      const labels = observations.map((o) => `T${o.trialNo} (${o.oilName.split(' ')[0]}, ${o.gapMm.toFixed(1)}mm)`);
      const values = observations.map((o) => o.dielectricStrength);
      const bgColors = observations.map((o) => (OIL_COLORS[o.oilId] ? OIL_COLORS[o.oilId].bg.replace('0.28', '0.78').replace('0.30', '0.78') : '#0284c7'));
      const borderColors = observations.map((o) => (OIL_COLORS[o.oilId] ? OIL_COLORS[o.oilId].solid : '#0284c7'));

      this.chartStrength.data.labels = labels;
      this.chartStrength.data.datasets[0].data = values;
      this.chartStrength.data.datasets[0].backgroundColor = bgColors;
      this.chartStrength.data.datasets[0].borderColor = borderColors;
      this.chartStrength.update();
    }

    /**
     * Returns base64 PNG data URLs of the charts for PDF report inclusion.
     */
    getChartImages() {
      return {
        bdvGap: this.bdvGapCanvas ? this.bdvGapCanvas.toDataURL('image/png', 1.0) : null,
        bdvOil: this.bdvOilCanvas ? this.bdvOilCanvas.toDataURL('image/png', 1.0) : null,
        strength: this.strengthCanvas ? this.strengthCanvas.toDataURL('image/png', 1.0) : null
      };
    }
  }

  global.LabCharts = LabCharts;
})(window);
