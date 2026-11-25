# Breakdown Voltage Testing of Transformer Oil Using a Virtual Sphere Gap

An interactive, web-based High-Voltage Electrical Engineering Virtual Laboratory built with **HTML5**, **CSS3**, **JavaScript (ES6)**, **Three.js**, and **Chart.js**.

> **Educational Simulation Notice:** All breakdown voltages, dielectric strength values, and oil condition parameters in this project are generated using a **configurable educational simulation model**. They are intended strictly for virtual demonstration and academic learning and must **not** be presented as standardized physical laboratory test measurements (e.g., IEC 60156 / ASTM D877 / ASTM D1816).

---

## Project Structure

```text
c:\VFD-Virtual-Lab-3D\
├── index.html                  # Main dashboard, 3D laboratory, observation table, graphs, theory & conclusion
├── start_lab.bat               # Windows one-click launcher using Python HTTP server
├── README.md                   # Local setup instructions and engineering documentation
├── css/
│   └── styles.css              # Modern blue, white & dark electrical engineering theme (responsive)
├── js/
│   ├── simulationModel.js      # Configurable educational breakdown voltage & dielectric strength engine
│   ├── soundEngine.js          # Web Audio API transformer hum, corona hiss & breakdown spark synthesizer
│   ├── scene3d.js              # Interactive Three.js 3D sphere gap test vessel, oil, HV console & spark arc
│   ├── charts.js               # Interactive Chart.js graphs (BDV vs Gap, BDV vs Oil, Dielectric Strength)
│   ├── reportExport.js         # CSV observation exporter & jsPDF multi-section lab report generator
│   └── main.js                 # Application state controller, smooth voltage ramp & DOM synchronization
└── lib/
    ├── three.min.js            # Three.js r128 (bundled locally for offline use)
    ├── OrbitControls.js        # Three.js OrbitControls
    ├── chart.umd.min.js        # Chart.js 4.4.7
    └── jspdf.umd.min.js        # jsPDF 2.5.2
```

---

## Key Features

1. **Main Engineering Dashboard**:
   - Project introduction, **Start Experiment** and **Virtual Laboratory** quick actions, and interactive navigation cards.
   - 5-stage **Experiment Progress Indicator** synchronized with the 9-step **Virtual Experiment Procedure**.

2. **Interactive 3D Virtual Sphere Gap Apparatus (Three.js)**:
   - Polished metallic **spherical electrodes** mounted on horizontal shafts inside a **transparent acrylic/glass oil testing chamber**.
   - **Adjustable sphere gap** (`1.0 mm` to `5.0 mm`) with moving right electrode & knurled micrometer collar.
   - **Dynamic transformer insulating oil** changing color, clarity, and suspended impurity particle density across **Fresh Oil**, **Used Oil**, and **Contaminated Oil**.
   - **High-Voltage step-up console** with porcelain bushing, HV lead, ground strap, glowing **HV supply status beacon**, and live **3D digital kV display**.
   - **Electric Breakdown Spark Animation**: Multi-branch jagged 3D arc across the sphere gap, dynamic point-light flash, and rising thermal gas bubbles in the oil.
   - OrbitControls (rotate, zoom, pan) and quick camera preset buttons (`Overview`, `Sphere Gap`, `Top View`, `HV Console`).

3. **Instrument Panel & Experiment Controls**:
   - Real-time **Analog + Digital High-Voltage Kilovoltmeter** with peak breakdown marker and electric stress bar.
   - Manual **+ Increase Voltage** step control (`0.5 kV`, `1.0 kV`, `2.0 kV`, `5.0 kV`) and **Auto-Ramp Mode**.
   - **Start Test**, **Stop Test**, **Reset Experiment**, **Reset All Experiment Data**, and **Sound On / Mute** toggle.
   - **Configure Educational Thresholds** modal to customize simulated model parameters per oil condition.

4. **Mathematical Calculations & Data Analysis**:
   - Computes simplified educational dielectric strength:
     `Dielectric Strength (kV/mm) = Breakdown Voltage (kV) / Electrode Gap (mm)`
   - **Dynamic Observation Table** (`Trial No. | Oil Condition | Gap Distance (mm) | Breakdown Voltage (kV) | Dielectric Strength (kV/mm)`).
   - **Export CSV**, **Clear Table**, and **Download PDF Report** (including observation table, auto-generated conclusion, and embedded chart snapshots).
   - Three live **Chart.js** graphs updating automatically with each trial.

---

## How to Run Locally

Because all dependencies (`Three.js`, `OrbitControls`, `Chart.js`, `jsPDF`) are bundled inside `lib/`, the project works **completely offline** with no `npm install` or build step required.

### Method 1: Using Python HTTP Server (Recommended)
1. Open a terminal (PowerShell or Command Prompt) inside the project folder (`c:\VFD-Virtual-Lab-3D`).
2. Start a local static web server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser (Chrome, Edge, Firefox, or Brave) and visit:
   ```text
   http://localhost:8000
   ```

### Method 2: Windows One-Click Batch Launcher
1. Double-click [`start_lab.bat`](start_lab.bat).
2. Visit `http://localhost:8000` in your browser.

### Method 3: Direct File Launch
- Double-click [`index.html`](index.html) to open it directly in any modern WebGL-enabled browser. (Using a local HTTP server via Method 1 or 2 is recommended for the cleanest browser security behavior.)

---

## Verification & Usage Workflow

1. Select an **Oil Condition** (`Fresh Oil`, `Used Oil`, or `Contaminated Oil`) and **Sphere Electrode Gap** (`1.0 mm` – `5.0 mm`).
2. Click **Start Test** to energize the virtual HV supply.
3. Click **+ Increase Voltage** gradually (or enable **Auto-Ramp Mode**) until the simulated breakdown threshold is reached.
4. Observe the 3D spark discharge, automatic HV trip, updated calculations, Observation Table entry, Chart.js graphs, and dynamically updated **Result and Conclusion**.
5. Export your session via **Export CSV** or **Download PDF Report**.
