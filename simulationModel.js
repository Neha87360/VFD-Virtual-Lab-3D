/**
 * simulationModel.js
 * Educational dielectric breakdown simulation engine for the
 * "Breakdown Voltage Testing of Transformer Oil Using a Virtual Sphere Gap" lab.
 *
 * NOTE: All threshold parameters and breakdown values generated here are
 * clearly labeled SIMULATED EDUCATIONAL DATA for interactive learning.
 * They do not represent standardized laboratory measurements (e.g., IEC 60156 / ASTM D877).
 */

(function (global) {
  'use strict';

  const DEFAULT_OIL_PROFILES = {
    fresh: {
      id: 'fresh',
      name: 'Fresh Oil',
      fullName: 'Fresh Insulating Oil',
      description: 'Clean, dry mineral insulating oil with negligible moisture and suspended particles.',
      moisturePpmLabel: '< 10 ppm (Simulated)',
      clarityLabel: 'Clear Pale Gold',
      baseStrengthKvPerMm: 21.5, // Configurable educational reference at 1 mm
      nonLinearExponent: 0.88,   // Accounts for slight sphere-gap field non-uniformity
      variationPct: 3.0,         // +/- stochastic spread (%)
      visual: {
        oilColor: 0xf7cf6b,
        oilOpacity: 0.34,
        turbidity: 0.04,
        particleCount: 12,
        particleColor: 0xfff3c4
      }
    },
    used: {
      id: 'used',
      name: 'Used Oil',
      fullName: 'Used / Aged Oil',
      description: 'Service-aged transformer oil containing mild oxidation byproducts and trace moisture.',
      moisturePpmLabel: '25 - 40 ppm (Simulated)',
      clarityLabel: 'Amber / Slightly Hazy',
      baseStrengthKvPerMm: 13.5,
      nonLinearExponent: 0.86,
      variationPct: 5.0,
      visual: {
        oilColor: 0xc97b1e,
        oilOpacity: 0.48,
        turbidity: 0.25,
        particleCount: 55,
        particleColor: 0xd9a05b
      }
    },
    contaminated: {
      id: 'contaminated',
      name: 'Contaminated Oil',
      fullName: 'Contaminated / Wet Oil',
      description: 'Degraded oil with elevated moisture, carbonized particles, and suspended cellulose fibers.',
      moisturePpmLabel: '> 60 ppm (Simulated)',
      clarityLabel: 'Dark Brown / Turbid',
      baseStrengthKvPerMm: 6.8,
      nonLinearExponent: 0.82,
      variationPct: 7.0,
      visual: {
        oilColor: 0x6b3a12,
        oilOpacity: 0.66,
        turbidity: 0.65,
        particleCount: 140,
        particleColor: 0x291708
      }
    }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class SimulationModel {
    constructor() {
      this.profiles = deepClone(DEFAULT_OIL_PROFILES);
      this.maxTestVoltageKv = 100.0;
      this.minGapMm = 1.0;
      this.maxGapMm = 5.0;
    }

    /**
     * Returns all oil condition profiles.
     */
    getAllProfiles() {
      return this.profiles;
    }

    /**
     * Returns a single oil condition profile by ID.
     * @param {string} oilId
     */
    getProfile(oilId) {
      return this.profiles[oilId] || this.profiles.fresh;
    }

    /**
     * Updates configurable educational thresholds for a specific oil type.
     * @param {string} oilId
     * @param {{baseStrengthKvPerMm?: number, nonLinearExponent?: number, variationPct?: number}} updates
     */
    updateProfileThresholds(oilId, updates) {
      const profile = this.profiles[oilId];
      if (!profile) return;

      if (typeof updates.baseStrengthKvPerMm === 'number' && Number.isFinite(updates.baseStrengthKvPerMm)) {
        profile.baseStrengthKvPerMm = Math.min(40, Math.max(2, updates.baseStrengthKvPerMm));
      }
      if (typeof updates.nonLinearExponent === 'number' && Number.isFinite(updates.nonLinearExponent)) {
        profile.nonLinearExponent = Math.min(1.05, Math.max(0.55, updates.nonLinearExponent));
      }
      if (typeof updates.variationPct === 'number' && Number.isFinite(updates.variationPct)) {
        profile.variationPct = Math.min(20, Math.max(0, updates.variationPct));
      }
    }

    /**
     * Restores default educational threshold values.
     */
    resetDefaultThresholds() {
      this.profiles = deepClone(DEFAULT_OIL_PROFILES);
    }

    /**
     * Computes the deterministic nominal simulated breakdown voltage (without random jitter).
     * @param {string} oilId
     * @param {number} gapMm
     * @returns {number} Nominal breakdown voltage in kV
     */
    getNominalBreakdownKv(oilId, gapMm) {
      const profile = this.getProfile(oilId);
      const clampedGap = Math.min(this.maxGapMm, Math.max(this.minGapMm, Number(gapMm) || 2.5));
      const rawKv = profile.baseStrengthKvPerMm * Math.pow(clampedGap, profile.nonLinearExponent);
      return Number(Math.min(this.maxTestVoltageKv - 1.0, Math.max(1.5, rawKv)).toFixed(2));
    }

    /**
     * Generates a simulated breakdown threshold for a single test run,
     * applying the configured +/- educational variation percentage.
     * @param {string} oilId
     * @param {number} gapMm
     * @returns {number} Simulated breakdown threshold in kV
     */
    generateTrialThresholdKv(oilId, gapMm) {
      const profile = this.getProfile(oilId);
      const nominal = this.getNominalBreakdownKv(oilId, gapMm);
      const spreadFraction = (profile.variationPct || 0) / 100;
      const randomFactor = 1 + (Math.random() * 2 - 1) * spreadFraction;
      const threshold = nominal * randomFactor;
      return Number(Math.min(this.maxTestVoltageKv - 0.5, Math.max(1.5, threshold)).toFixed(1));
    }

    /**
     * Educational simplified calculation:
     * Dielectric Strength (kV/mm) = Breakdown Voltage (kV) / Electrode Gap (mm)
     * @param {number} breakdownKv
     * @param {number} gapMm
     * @returns {number}
     */
    calculateDielectricStrength(breakdownKv, gapMm) {
      if (!gapMm || gapMm <= 0) return 0;
      return Number((breakdownKv / gapMm).toFixed(2));
    }

    /**
     * Computes electric stress ratio (0.0 to 1.0+) for visual & audio feedback.
     * @param {number} appliedKv
     * @param {number} thresholdKv
     * @returns {number}
     */
    getStressRatio(appliedKv, thresholdKv) {
      if (!thresholdKv || thresholdKv <= 0) return 0;
      return Math.max(0, Math.min(1.2, appliedKv / thresholdKv));
    }
  }

  global.SimulationModel = SimulationModel;
})(window);
