/**
 * main.js
 * Application controller coordinating:
 * - Virtual Sphere Gap 3D scene (Three.js)
 * - Educational breakdown simulation model & configurable thresholds
 * - Smooth voltage ramping (manual kV step & continuous Auto-Ramp)
 * - Real-time analog + digital kilovoltmeter & mathematical calculations
 * - Observation table, CSV & PDF export, Chart.js graphs, and auto-generated conclusion
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const model = new window.SimulationModel();
    const sound = new window.SoundEngine();

    // DOM Elements
    const dom = {
      btnNavToggle: document.getElementById('btnNavToggle'),
      navLinks: document.getElementById('navLinks'),
      btnMuteToggle: document.getElementById('btnMuteToggle'),
      iconSoundOn: document.getElementById('iconSoundOn'),
      iconSoundOff: document.getElementById('iconSoundOff'),
      muteLabel: document.getElementById('muteLabel'),
      btnHeroStart: document.getElementById('btnHeroStart'),
      btnOpenThresholds: document.getElementById('btnOpenThresholds'),
      btnResetAllData: document.getElementById('btnResetAllData'),

      stepItems: Array.from(document.querySelectorAll('.step-item[data-stage]')),
      procSteps: Array.from(document.querySelectorAll('#procedureList li[data-proc-step]')),

      ledSystem: document.getElementById('ledSystem'),
      labStateBadge: document.getElementById('labStateBadge'),
      camButtons: Array.from(document.querySelectorAll('.cam-btn[data-cam]')),
      threeContainer: document.getElementById('threeContainer'),
      hudOilLabel: document.getElementById('hudOilLabel'),
      hudGapLabel: document.getElementById('hudGapLabel'),
      hudKvLabel: document.getElementById('hudKvLabel'),
      breakdownAlert: document.getElementById('breakdownAlert'),
      breakdownAlertDetail: document.getElementById('breakdownAlertDetail'),

      gaugeProgressArc: document.getElementById('gaugeProgressArc'),
      gaugePeakMarker: document.getElementById('gaugePeakMarker'),
      gaugeNeedle: document.getElementById('gaugeNeedle'),
      digitalKvReadout: document.getElementById('digitalKvReadout'),
      stressBarFill: document.getElementById('stressBarFill'),
      indHvSupply: document.getElementById('indHvSupply'),
      indBreakdown: document.getElementById('indBreakdown'),

      selectOilCondition: document.getElementById('selectOilCondition'),
      lockOilNote: document.getElementById('lockOilNote'),
      oilConditionMeta: document.getElementById('oilConditionMeta'),
      sliderGapMm: document.getElementById('sliderGapMm'),
      gapValueDisplay: document.getElementById('gapValueDisplay'),
      gapChips: Array.from(document.querySelectorAll('.gap-chip[data-gap]')),

      selectVoltageStep: document.getElementById('selectVoltageStep'),
      stepValueDisplay: document.getElementById('stepValueDisplay'),
      btnIncreaseVoltage: document.getElementById('btnIncreaseVoltage'),
      chkAutoRamp: document.getElementById('chkAutoRamp'),

      btnStartTest: document.getElementById('btnStartTest'),
      btnStopTest: document.getElementById('btnStopTest'),
      btnResetExperiment: document.getElementById('btnResetExperiment'),

      calcAppliedKv: document.getElementById('calcAppliedKv'),
      calcBreakdownKv: document.getElementById('calcBreakdownKv'),
      calcGapMm: document.getElementById('calcGapMm'),
      calcStrength: document.getElementById('calcStrength'),
      formulaLiveEval: document.getElementById('formulaLiveEval'),

      trialCountBadge: document.getElementById('trialCountBadge'),
      btnExportCsv: document.getElementById('btnExportCsv'),
      btnDownloadPdf: document.getElementById('btnDownloadPdf'),
      btnClearTable: document.getElementById('btnClearTable'),
      observationTbody: document.getElementById('observationTbody'),

      chartBdvVsGap: document.getElementById('chartBdvVsGap'),
      chartBdvVsOil: document.getElementById('chartBdvVsOil'),
      chartDielectricStrength: document.getElementById('chartDielectricStrength'),

      autoConclusionBody: document.getElementById('autoConclusionBody'),

      thresholdModal: document.getElementById('thresholdModal'),
      btnCloseModal: document.getElementById('btnCloseModal'),
      thresholdFormBody: document.getElementById('thresholdFormBody'),
      btnRestoreDefaults: document.getElementById('btnRestoreDefaults'),
      btnSaveThresholds: document.getElementById('btnSaveThresholds')
    };

    // Initialize 3D Scene & Charts
    const scene3d = new window.VirtualSphereGapScene(dom.threeContainer);
    const charts = new window.LabCharts({
      bdvGapCanvas: dom.chartBdvVsGap,
      bdvOilCanvas: dom.chartBdvVsOil,
      strengthCanvas: dom.chartDielectricStrength
    });

    // Application State
    const state = {
      status: 'IDLE', // 'IDLE' | 'ENERGIZED' | 'BREAKDOWN' | 'STOPPED'
      oilId: 'fresh',
      gapMm: 2.5,
      stepKv: 2.0,
      autoRamp: false,
      autoRampRateKvPerSec: 2.4,

      appliedKv: 0.0,
      targetKv: 0.0,
      activeThresholdKv: null,
      breakdownKv: null,
      dielectricStrength: null,

      observations: [],
      nextTrialNo: 1,
      lastFrameTime: performance.now()
    };

    /* ----------------------------------------------------------
       UI & METER SYNCHRONIZATION
    ---------------------------------------------------------- */

    function updateOilDisplay() {
      const profile = model.getProfile(state.oilId);
      dom.oilConditionMeta.textContent = `${profile.visual ? profile.clarityLabel : ''} • Moisture: ${profile.moisturePpmLabel}`;
      dom.hudOilLabel.textContent = profile.name;
      scene3d.setOilCondition(profile);
    }

    function updateGapDisplay() {
      dom.gapValueDisplay.textContent = `${state.gapMm.toFixed(1)} mm`;
      dom.hudGapLabel.textContent = `${state.gapMm.toFixed(1)} mm`;
      dom.calcGapMm.textContent = `${state.gapMm.toFixed(1)} mm`;
      dom.sliderGapMm.value = String(state.gapMm);

      dom.gapChips.forEach((chip) => {
        const val = parseFloat(chip.dataset.gap);
        chip.classList.toggle('active', Math.abs(val - state.gapMm) < 0.01);
      });

      scene3d.setGapMm(state.gapMm);
    }

    function updateMeterAndCalculations() {
      const maxKv = model.maxTestVoltageKv;
      const v = state.appliedKv;
      const frac = Math.max(0, Math.min(1, v / maxKv));

      // Analog gauge needle rotates from -90 deg (0 kV) to +90 deg (100 kV)
      const angle = -90 + frac * 180;
      dom.gaugeNeedle.setAttribute('transform', `rotate(${angle.toFixed(2)} 110 110)`);

      // Gauge arc progress (267 is total path length)
      const arcTotal = 267;
      dom.gaugeProgressArc.setAttribute('stroke-dashoffset', (arcTotal * (1 - frac)).toFixed(1));

      // Peak breakdown marker
      if (state.breakdownKv !== null) {
        const peakFrac = Math.max(0, Math.min(1, state.breakdownKv / maxKv));
        const peakAngle = -90 + peakFrac * 180;
        dom.gaugePeakMarker.setAttribute('transform', `rotate(${peakAngle.toFixed(2)} 110 110)`);
        dom.gaugePeakMarker.setAttribute('opacity', '0.9');
      } else {
        dom.gaugePeakMarker.setAttribute('opacity', '0');
      }

      // Digital readouts
      dom.digitalKvReadout.innerHTML = `${v.toFixed(1)} <span>kV</span>`;
      dom.hudKvLabel.textContent = `${v.toFixed(1)} kV`;
      dom.calcAppliedKv.textContent = `${v.toFixed(1)} kV`;

      // Electric stress bar relative to threshold (or max scale)
      const refThreshold = state.activeThresholdKv || model.getNominalBreakdownKv(state.oilId, state.gapMm);
      const stressRatio = model.getStressRatio(v, refThreshold);
      const stressPct = Math.min(100, stressRatio * 100);
      dom.stressBarFill.style.width = `${stressPct.toFixed(1)}%`;
      dom.stressBarFill.className = 'stress-bar-fill ' + (
        stressRatio > 0.85 ? 'critical' : stressRatio > 0.55 ? 'warn' : 'normal'
      );

      if (state.breakdownKv !== null && state.dielectricStrength !== null) {
        dom.calcBreakdownKv.textContent = `${state.breakdownKv.toFixed(1)} kV`;
        dom.calcStrength.textContent = `${state.dielectricStrength.toFixed(2)} kV/mm`;
        dom.formulaLiveEval.textContent =
          `${state.breakdownKv.toFixed(1)} kV ÷ ${state.gapMm.toFixed(1)} mm = ${state.dielectricStrength.toFixed(2)} kV/mm (Simulated)`;
      } else {
        dom.calcBreakdownKv.textContent = '-- kV';
        dom.calcStrength.textContent = '-- kV/mm';
        dom.formulaLiveEval.textContent =
          state.status === 'ENERGIZED'
            ? 'HV energized — gradually increase voltage to determine simulated breakdown threshold.'
            : 'Waiting for simulated breakdown event...';
      }

      // Sync 3D console screen, corona & audio hum
      scene3d.setElectricalState({
        appliedKv: v,
        isEnergized: state.status === 'ENERGIZED',
        isBreakdown: state.status === 'BREAKDOWN',
        breakdownKv: state.breakdownKv,
        stressRatio
      });
      sound.updateVoltage(v, stressRatio);
    }

    function updateProgressAndControls() {
      const isEnergized = state.status === 'ENERGIZED';
      const isBreakdown = state.status === 'BREAKDOWN';
      const isStopped = state.status === 'STOPPED';

      // Safety interlock: lock oil condition & gap while energized
      dom.selectOilCondition.disabled = isEnergized;
      dom.sliderGapMm.disabled = isEnergized;
      dom.gapChips.forEach((c) => { c.disabled = isEnergized; });
      dom.lockOilNote.classList.toggle('hidden', !isEnergized);

      // Action button states
      dom.btnStartTest.disabled = isEnergized || isBreakdown;
      dom.btnStopTest.disabled = !isEnergized;
      dom.btnIncreaseVoltage.disabled = !isEnergized;

      // Status LEDs & Badges
      dom.ledSystem.className = 'status-led ' + (
        isBreakdown ? 'breakdown' : isEnergized ? 'energized' : isStopped ? 'stopped' : 'standby'
      );

      if (isBreakdown) {
        dom.labStateBadge.textContent = 'BREAKDOWN TRIPPED';
        dom.labStateBadge.className = 'state-badge breakdown';
        dom.indHvSupply.textContent = 'HV SUPPLY: TRIPPED';
        dom.indHvSupply.className = 'ind-pill danger';
        dom.indBreakdown.textContent = 'TRIP: BREAKDOWN';
        dom.indBreakdown.className = 'ind-pill danger';
      } else if (isEnergized) {
        dom.labStateBadge.textContent = 'HV ENERGIZED';
        dom.labStateBadge.className = 'state-badge energized';
        dom.indHvSupply.textContent = 'HV SUPPLY: ON';
        dom.indHvSupply.className = 'ind-pill active';
        dom.indBreakdown.textContent = 'TRIP: ARMED';
        dom.indBreakdown.className = 'ind-pill warn';
      } else if (isStopped) {
        dom.labStateBadge.textContent = 'TEST STOPPED - SAFE';
        dom.labStateBadge.className = 'state-badge stopped';
        dom.indHvSupply.textContent = 'HV SUPPLY: OFF';
        dom.indHvSupply.className = 'ind-pill';
        dom.indBreakdown.textContent = 'TRIP: CLEAR';
        dom.indBreakdown.className = 'ind-pill';
      } else {
        dom.labStateBadge.textContent = 'STANDBY - HV OFF';
        dom.labStateBadge.className = 'state-badge standby';
        dom.indHvSupply.textContent = 'HV SUPPLY: OFF';
        dom.indHvSupply.className = 'ind-pill';
        dom.indBreakdown.textContent = 'TRIP: CLEAR';
        dom.indBreakdown.className = 'ind-pill';
      }

      // Experiment Progress Stepper (1..5)
      let currentStage = 1;
      if (isEnergized && state.appliedKv < 0.1) currentStage = 2;
      else if (isEnergized && state.appliedKv >= 0.1) currentStage = 3;
      else if (isBreakdown) currentStage = 4;
      if (state.observations.length > 0 && state.status === 'IDLE') currentStage = 5;

      dom.stepItems.forEach((el) => {
        const s = Number(el.dataset.stage);
        el.classList.toggle('active', s === currentStage);
        el.classList.toggle('done', s < currentStage || (s === 5 && state.observations.length > 0 && isBreakdown));
      });

      // Highlight matching procedure step
      let procHighlight = 1;
      if (state.status === 'IDLE') procHighlight = state.observations.length ? 9 : 2;
      if (isEnergized && state.appliedKv < 0.1) procHighlight = 4;
      if (isEnergized && state.appliedKv >= 0.1) procHighlight = 5;
      if (isBreakdown) procHighlight = 7;

      dom.procSteps.forEach((li) => {
        const p = Number(li.dataset.procStep);
        li.classList.toggle('active-proc', p === procHighlight);
      });
    }

    /* ----------------------------------------------------------
       EXPERIMENT ACTIONS
    ---------------------------------------------------------- */

    function startTest() {
      if (state.status === 'ENERGIZED' || state.status === 'BREAKDOWN') return;

      scene3d.clearSpark();
      dom.breakdownAlert.classList.add('hidden');

      state.status = 'ENERGIZED';
      state.appliedKv = 0.0;
      state.targetKv = 0.0;
      state.breakdownKv = null;
      state.dielectricStrength = null;
      state.activeThresholdKv = model.generateTrialThresholdKv(state.oilId, state.gapMm);

      sound.playRelayClick(true);
      sound.startHum();

      updateProgressAndControls();
      updateMeterAndCalculations();
    }

    function stopTest() {
      if (state.status !== 'ENERGIZED') return;
      state.status = 'STOPPED';
      state.targetKv = state.appliedKv;
      sound.stopHum();
      sound.playRelayClick(false);

      updateProgressAndControls();
      updateMeterAndCalculations();
    }

    function resetExperiment() {
      sound.stopHum();
      sound.playRelayClick(false);
      scene3d.clearSpark();
      dom.breakdownAlert.classList.add('hidden');

      state.status = 'IDLE';
      state.appliedKv = 0.0;
      state.targetKv = 0.0;
      state.activeThresholdKv = null;
      state.breakdownKv = null;
      state.dielectricStrength = null;

      updateProgressAndControls();
      updateMeterAndCalculations();
    }

    function increaseVoltageStep() {
      if (state.status !== 'ENERGIZED') return;
      sound.playStepTick();
      const nextTarget = Math.min(model.maxTestVoltageKv, state.targetKv + state.stepKv);
      state.targetKv = Number(nextTarget.toFixed(2));
    }

    function triggerBreakdown() {
      if (state.status !== 'ENERGIZED') return;

      const bdv = Number(state.activeThresholdKv.toFixed(1));
      const strength = model.calculateDielectricStrength(bdv, state.gapMm);

      state.status = 'BREAKDOWN';
      state.appliedKv = bdv;
      state.targetKv = bdv;
      state.breakdownKv = bdv;
      state.dielectricStrength = strength;

      // Audio & 3D Spark effects
      sound.stopHum();
      sound.playBreakdownSpark();
      scene3d.triggerBreakdownSpark();

      const profile = model.getProfile(state.oilId);
      dom.breakdownAlertDetail.textContent =
        `Simulated spark discharge in ${profile.name} at ${bdv.toFixed(1)} kV across ${state.gapMm.toFixed(1)} mm gap (Dielectric Strength: ${strength.toFixed(2)} kV/mm).`;
      dom.breakdownAlert.classList.remove('hidden');

      // Record trial automatically
      recordObservation({
        trialNo: state.nextTrialNo++,
        oilId: state.oilId,
        oilName: profile.name,
        gapMm: state.gapMm,
        breakdownKv: bdv,
        dielectricStrength: strength
      });

      updateProgressAndControls();
      updateMeterAndCalculations();
    }

    /* ----------------------------------------------------------
       OBSERVATION TABLE, CHARTS & AUTO CONCLUSION
    ---------------------------------------------------------- */

    function recordObservation(row) {
      state.observations.push(row);
      renderObservationTable();
      charts.update(state.observations);
      updateAutoConclusion();
    }

    function renderObservationTable() {
      const tbody = dom.observationTbody;
      tbody.innerHTML = '';

      const count = state.observations.length;
      dom.trialCountBadge.textContent = `${count} ${count === 1 ? 'Trial' : 'Trials'} Recorded`;
      dom.btnExportCsv.disabled = count === 0;
      dom.btnClearTable.disabled = count === 0;

      if (count === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-row';
        emptyRow.innerHTML =
          '<td colspan="5">No simulated observations recorded yet. Select an oil condition &amp; gap distance, click <strong>Start Test</strong>, and increase voltage until breakdown occurs.</td>';
        tbody.appendChild(emptyRow);
        return;
      }

      state.observations.forEach((obs) => {
        const tr = document.createElement('tr');
        const badgeClass = obs.oilId === 'fresh' ? 'pill-fresh' : obs.oilId === 'used' ? 'pill-used' : 'pill-contaminated';
        tr.innerHTML = `
          <td><strong>#${obs.trialNo}</strong></td>
          <td><span class="oil-pill ${badgeClass}">${obs.oilName}</span></td>
          <td>${obs.gapMm.toFixed(1)}</td>
          <td><strong>${obs.breakdownKv.toFixed(1)}</strong></td>
          <td><strong class="strength-cell">${obs.dielectricStrength.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
      });
    }

    function computeConclusionText() {
      const obs = state.observations;
      if (!obs.length) {
        return 'No simulated breakdown trials have been completed yet. Run tests across Fresh, Used, and Contaminated oil samples to generate an analytical summary.';
      }

      const groups = { fresh: [], used: [], contaminated: [] };
      obs.forEach((o) => {
        if (groups[o.oilId]) groups[o.oilId].push(o);
      });

      const mean = (arr, key) => arr.reduce((s, x) => s + x[key], 0) / arr.length;
      const parts = [];

      parts.push(`Based on ${obs.length} simulated virtual sphere-gap ${obs.length === 1 ? 'trial' : 'trials'}:`);

      if (groups.fresh.length) {
        parts.push(
          `Fresh Oil (${groups.fresh.length} trial${groups.fresh.length > 1 ? 's' : ''}) exhibited an average simulated breakdown voltage of ${mean(groups.fresh, 'breakdownKv').toFixed(1)} kV and mean dielectric strength of ${mean(groups.fresh, 'dielectricStrength').toFixed(2)} kV/mm.`
        );
      }
      if (groups.used.length) {
        parts.push(
          `Used Oil (${groups.used.length} trial${groups.used.length > 1 ? 's' : ''}) recorded an average simulated breakdown voltage of ${mean(groups.used, 'breakdownKv').toFixed(1)} kV and mean dielectric strength of ${mean(groups.used, 'dielectricStrength').toFixed(2)} kV/mm.`
        );
      }
      if (groups.contaminated.length) {
        parts.push(
          `Contaminated Oil (${groups.contaminated.length} trial${groups.contaminated.length > 1 ? 's' : ''}) dropped to an average simulated breakdown voltage of ${mean(groups.contaminated, 'breakdownKv').toFixed(1)} kV and mean dielectric strength of ${mean(groups.contaminated, 'dielectricStrength').toFixed(2)} kV/mm.`
        );
      }

      if (groups.fresh.length && groups.contaminated.length) {
        const freshAvg = mean(groups.fresh, 'dielectricStrength');
        const contamAvg = mean(groups.contaminated, 'dielectricStrength');
        if (freshAvg > contamAvg && freshAvg > 0) {
          const pctDrop = (((freshAvg - contamAvg) / freshAvg) * 100).toFixed(1);
          parts.push(
            `Comparing oil states, simulated contamination reduced mean dielectric strength by ${pctDrop}% relative to Fresh Oil, confirming that moisture and particulate impurities severely degrade insulating capability.`
          );
        } else {
          parts.push(
            'Under the currently configured simulation parameters, compare the recorded Fresh and Contaminated Oil trials in the table and charts above.'
          );
        }
      }

      // Check gap trend if multiple distinct gaps tested
      const uniqueGaps = new Set(obs.map((o) => o.gapMm));
      if (uniqueGaps.size >= 2) {
        parts.push(
          'Across varying sphere gap spacings, increasing the electrode gap required higher applied voltage to trigger breakdown, while simplified dielectric strength (V_b / d) reflected field behavior across the gap.'
        );
      }

      return parts.join(' ');
    }

    function updateAutoConclusion() {
      const obs = state.observations;
      if (!obs.length) {
        dom.autoConclusionBody.innerHTML = `
          <p>
            No simulated breakdown trials have been completed yet. Run at least one virtual test above—ideally comparing
            <strong>Fresh Oil</strong>, <strong>Used Oil</strong>, and <strong>Contaminated Oil</strong>—to generate a
            quantitative summary from your observations.
          </p>
        `;
        return;
      }

      const groups = { fresh: [], used: [], contaminated: [] };
      obs.forEach((o) => { if (groups[o.oilId]) groups[o.oilId].push(o); });
      const mean = (arr, key) => (arr.reduce((s, x) => s + x[key], 0) / arr.length);

      let statsHtml = '<div class="conclusion-stats">';
      [
        { id: 'fresh', label: 'Fresh Oil', cls: 'fresh' },
        { id: 'used', label: 'Used Oil', cls: 'used' },
        { id: 'contaminated', label: 'Contaminated Oil', cls: 'contaminated' }
      ].forEach((g) => {
        const list = groups[g.id];
        if (list.length) {
          statsHtml += `
            <div class="cstat-box ${g.cls}">
              <span>${g.label} (${list.length})</span>
              <strong>${mean(list, 'breakdownKv').toFixed(1)} kV avg</strong>
              <small>${mean(list, 'dielectricStrength').toFixed(2)} kV/mm</small>
            </div>
          `;
        }
      });
      statsHtml += '</div>';

      dom.autoConclusionBody.innerHTML = `${statsHtml}<p>${computeConclusionText()}</p>`;
    }

    function clearObservationTable() {
      state.observations = [];
      state.nextTrialNo = 1;
      renderObservationTable();
      charts.update(state.observations);
      updateAutoConclusion();
      updateProgressAndControls();
    }

    function resetAllExperimentData() {
      if (state.observations.length > 0) {
        const ok = window.confirm('Reset the active test AND clear all recorded simulated observations?');
        if (!ok) return;
      }
      resetExperiment();
      clearObservationTable();
      model.resetDefaultThresholds();
      updateOilDisplay();
    }

    /* ----------------------------------------------------------
       CONFIGURABLE EDUCATIONAL THRESHOLDS MODAL
    ---------------------------------------------------------- */

    function renderThresholdModalFields() {
      const profiles = model.getAllProfiles();
      const order = ['fresh', 'used', 'contaminated'];

      dom.thresholdFormBody.innerHTML = order
        .map((id) => {
          const p = profiles[id];
          return `
            <div class="thresh-card" data-oil-id="${id}">
              <h4>${p.fullName}</h4>
              <div class="thresh-inputs">
                <label>
                  Base Strength @ 1mm (kV/mm)
                  <input type="number" step="0.5" min="2" max="40" class="inp-base" value="${p.baseStrengthKvPerMm}" />
                </label>
                <label>
                  Gap Exponent (0.55 - 1.05)
                  <input type="number" step="0.02" min="0.55" max="1.05" class="inp-exp" value="${p.nonLinearExponent}" />
                </label>
                <label>
                  Random Spread (&plusmn;%)
                  <input type="number" step="0.5" min="0" max="20" class="inp-var" value="${p.variationPct}" />
                </label>
              </div>
            </div>
          `;
        })
        .join('');
    }

    function openThresholdModal() {
      renderThresholdModalFields();
      dom.thresholdModal.classList.remove('hidden');
    }

    function closeThresholdModal() {
      dom.thresholdModal.classList.add('hidden');
    }

    function saveThresholdsFromModal() {
      const cards = dom.thresholdFormBody.querySelectorAll('.thresh-card');
      cards.forEach((card) => {
        const id = card.dataset.oilId;
        const base = parseFloat(card.querySelector('.inp-base').value);
        const exp = parseFloat(card.querySelector('.inp-exp').value);
        const vari = parseFloat(card.querySelector('.inp-var').value);
        model.updateProfileThresholds(id, {
          baseStrengthKvPerMm: base,
          nonLinearExponent: exp,
          variationPct: vari
        });
      });

      // Refresh threshold if currently energized so changes take effect cleanly on next test or current
      if (state.status === 'ENERGIZED') {
        state.activeThresholdKv = model.generateTrialThresholdKv(state.oilId, state.gapMm);
      }
      updateMeterAndCalculations();
      closeThresholdModal();
    }

    /* ----------------------------------------------------------
       REAL-TIME GRADUAL VOLTAGE RAMP LOOP
    ---------------------------------------------------------- */

    function animationLoop(now) {
      requestAnimationFrame(animationLoop);
      const dt = Math.min(0.05, (now - state.lastFrameTime) / 1000);
      state.lastFrameTime = now;

      if (state.status !== 'ENERGIZED') return;

      let changed = false;

      if (state.autoRamp) {
        state.targetKv = Math.min(model.maxTestVoltageKv, state.appliedKv + state.autoRampRateKvPerSec * dt);
        state.appliedKv = state.targetKv;
        changed = true;
      } else if (state.appliedKv < state.targetKv) {
        // Smoothly glide toward manual step target (~12 kV/s visual slew)
        const stepDelta = Math.min(state.targetKv - state.appliedKv, 10.0 * dt);
        state.appliedKv += stepDelta;
        if (Math.abs(state.targetKv - state.appliedKv) < 0.02) {
          state.appliedKv = state.targetKv;
        }
        changed = true;
      }

      if (changed) {
        if (state.activeThresholdKv !== null && state.appliedKv >= state.activeThresholdKv) {
          triggerBreakdown();
        } else {
          updateMeterAndCalculations();
          updateProgressAndControls();
        }
      }
    }

    /* ----------------------------------------------------------
       EVENT LISTENERS
    ---------------------------------------------------------- */

    // Mobile nav toggle
    dom.btnNavToggle.addEventListener('click', () => {
      const open = dom.navLinks.classList.toggle('open');
      dom.btnNavToggle.setAttribute('aria-expanded', String(open));
    });
    dom.navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        dom.navLinks.classList.remove('open');
        dom.btnNavToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Mute toggle
    dom.btnMuteToggle.addEventListener('click', () => {
      const muted = sound.toggleMute();
      dom.iconSoundOn.classList.toggle('hidden', muted);
      dom.iconSoundOff.classList.toggle('hidden', !muted);
      dom.muteLabel.textContent = muted ? 'Muted' : 'Sound On';
      dom.btnMuteToggle.classList.toggle('muted', muted);
    });

    // Hero Start Experiment button scrolls smoothly to Virtual Lab & starts if idle
    dom.btnHeroStart.addEventListener('click', () => {
      document.getElementById('virtual-lab').scrollIntoView({ behavior: 'smooth' });
      if (state.status === 'IDLE') {
        startTest();
      }
    });

    // Camera presets
    dom.camButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.camButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        scene3d.setCameraPreset(btn.dataset.cam);
      });
    });

    // Oil condition selector
    dom.selectOilCondition.addEventListener('change', (e) => {
      state.oilId = e.target.value;
      updateOilDisplay();
      updateMeterAndCalculations();
    });

    // Gap slider & preset chips
    dom.sliderGapMm.addEventListener('input', (e) => {
      state.gapMm = parseFloat(e.target.value);
      updateGapDisplay();
      updateMeterAndCalculations();
    });

    dom.gapChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (state.status === 'ENERGIZED') return;
        state.gapMm = parseFloat(chip.dataset.gap);
        updateGapDisplay();
        updateMeterAndCalculations();
      });
    });

    // Voltage step selector & auto-ramp toggle
    dom.selectVoltageStep.addEventListener('change', (e) => {
      state.stepKv = parseFloat(e.target.value);
      dom.stepValueDisplay.textContent = `+${state.stepKv.toFixed(1)} kV`;
    });

    dom.chkAutoRamp.addEventListener('change', (e) => {
      state.autoRamp = e.target.checked;
    });

    // Core control buttons
    dom.btnIncreaseVoltage.addEventListener('click', increaseVoltageStep);
    dom.btnStartTest.addEventListener('click', startTest);
    dom.btnStopTest.addEventListener('click', stopTest);
    dom.btnResetExperiment.addEventListener('click', resetExperiment);
    dom.btnResetAllData.addEventListener('click', resetAllExperimentData);

    // Table & Report exports
    dom.btnClearTable.addEventListener('click', () => {
      if (!state.observations.length) return;
      if (window.confirm('Clear all recorded observations from the table and graphs?')) {
        clearObservationTable();
      }
    });

    dom.btnExportCsv.addEventListener('click', () => {
      window.ReportExport.exportObservationsCSV(state.observations);
    });

    dom.btnDownloadPdf.addEventListener('click', () => {
      window.ReportExport.exportReportPDF({
        observations: state.observations,
        conclusionSummary: computeConclusionText(),
        chartImages: charts.getChartImages()
      });
    });

    // Threshold modal events
    dom.btnOpenThresholds.addEventListener('click', openThresholdModal);
    dom.btnCloseModal.addEventListener('click', closeThresholdModal);
    dom.btnRestoreDefaults.addEventListener('click', () => {
      model.resetDefaultThresholds();
      renderThresholdModalFields();
    });
    dom.btnSaveThresholds.addEventListener('click', saveThresholdsFromModal);
    dom.thresholdModal.addEventListener('click', (e) => {
      if (e.target === dom.thresholdModal) closeThresholdModal();
    });

    // Initial render
    updateOilDisplay();
    updateGapDisplay();
    updateProgressAndControls();
    updateMeterAndCalculations();
    renderObservationTable();
    charts.update(state.observations);
    updateAutoConclusion();

    requestAnimationFrame(animationLoop);
  });
})();
