# SAHAYAM (സഹായം)
### *Find the people the signal misses.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.2.7-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-646cff.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-9%20passed-brightgreen.svg)]()

> **Disaster Resilience · Explainable Silence Anomaly Triage · Offline DDD Mesh · Digital Household Passports**

---

## 📌 The Problem: Rescue Systems Navigate Blind

When catastrophic disasters strike, disaster coordination systems (from state DEOCs to UN OCHA) act as **signal aggregators**—collecting emergency calls, volunteer reports, and social media posts. The fatal assumption baked into every system is: **the people who need help will communicate that need**.

This assumption costs lives:
* **The physically trapped:** Buried victims under rubble cannot reach or operate a phone.
* **The elderly & bedridden:** Living alone without smartphones or mobility.
* **Infrastructure blackout zones:** When mobile towers and power grids are destroyed in seconds, entire villages go dark. From the outside, a devastated zone looks identical to an empty zone.

### The Real Case: Wayanad Landslides (August 2024)
In the 2024 Mundakkai and Chooralmala landslides in Kerala, cellular towers were instantly crushed at 2:00 AM. Mundakkai had over 250 plantation workers. While connected areas generated distress calls and received immediate aid, Mundakkai produced zero calls. The silence was misread as absence of crisis. By the time rescue teams physically walked in days later, hundreds had perished waiting.

**Sahayam changes this paradigm: The silence is not absence of crisis. The silence is the crisis.**

---

## 🏛️ System Architecture

Sahayam is architected around **Domain-Driven Design (DDD)** and delivers 4 core capabilities across 3 interconnected user interfaces:

```
                               ┌────────────────────────────────────────┐
                               │       DEOC Command Center (Admin)      │
                               │  - 100 Geographic Cells (1 km² thermal)│
                               │  - Explainable Silence Deficit Scorer  │
                               │  - Live DDD Mesh Ingest & Latency Audit│
                               └──────────────────▲─────────────────────┘
                                                  │ Uplink to Gateway
                                                  │ (Satellite / 4G / Wi-Fi)
                               ┌──────────────────┴─────────────────────┐
                               │  Volunteer / Rescue Team Interface     │
                               │  - 4. DDD SOS Relay (Wi-Fi Direct DTN) │
                               │  - 1. Optical QR Triage Scanner        │
                               │  - 2. Household & Bedridden Registry   │
                               └──────────────────▲─────────────────────┘
                                                  │ 10–20m Proximity Handshake
                                                  │ (Store-and-Forward Sneakernet)
                               ┌──────────────────┴─────────────────────┐
                               │    Civilian / Household Interface      │
                               │  - Digital Resilience Medical Passport │
                               │  - Atomic ADU Emergency SOS Beacon     │
                               │  - Hazard-Aware Elevation Safe Route   │
                               └────────────────────────────────────────┘
```

---

## ⚡ Core Capabilities & Innovation

### 1. Dark Zone Silence Anomaly Scorer
* **Statistical Baseline vs. Actual Signal Telemetry**: Computes telecommunication deficit across 100 1-km² geographic grid sectors in Kerala.
* **Explainable Multi-Signal Fusion**: Evaluates cellular handshakes, IoT heartbeats, power telemetry, and time-of-day activity curves.
* **Uncertainty-Aware Prioritization**: Incorporates census populations and confidence bounds ($CI$) to prevent false alarms while surfacing invisible high-vulnerability populations.

### 2. Disconnected Data Distribution (DDD) Offline Mesh
* **Delay-Tolerant Networking (DTN)**: Citing the IEEE/Computer Society paper *"A Mobile-First Disconnected Data Distribution Network"*.
* **Atomic Application Data Units (ADUs)**: Distress signals and medical records are packaged into encrypted, tamper-evident bundles (`SHA-256` payload verification).
* **Human Sneakernet Couriers**: Uses localized peer-to-peer Wi-Fi Direct discovery (10–20m range) to transfer custody from trapped civilians to mobile volunteers, supply trucks, or drones.
* **Clinical Latency Tracking**: Visualizes transit times against the medical **4–6 hour crush syndrome golden window**.

### 3. Digital Household Resilience Passport & QR Triage
* **Household Grouping**: Organizes vulnerable members under known household units (e.g. *Kuruvilla House*, *Varier House*).
* **Offline Optical QR Code**: High-density QR tokens encode critical medical indicators:
  - Chronic conditions (Type 2 Diabetes, Hypertension, Asthma)
  - Crucial medications & dosages (Insulin glargine, Amlodipine)
  - Mobility flags (Bedridden, Elderly, Infant, Pregnant)
* **One-Tap Camp Intake**: Volunteers scan civilian QR codes in under 1 second without internet connection.

### 4. Hazard-Aware Evacuation Routing
* Integrates topographical elevation data (+38m safety thresholds) and debris reports (e.g., river bridge collapses) to steer civilians toward viable relief shelters.

---

## 📱 The 3 System Interfaces

| Role | Route | Description & Workflow |
| :--- | :--- | :--- |
| **1. Users (Civilian)** | `/civilian/passport`<br>`/civilian/sos`<br>`/civilian/route` | View family resilience passport, generate offline medical QR, trigger atomic SOS beacon with live custody pipeline tracking. |
| **2. Volunteers / Field** | `/field/dtn-relay`<br>`/field/scanner`<br>`/field/member`<br>`/field/registry` | **4. DDD SOS Relay** (Wi-Fi Direct proximity radar, custody handshake, gateway uplink), optical QR camp scanner, household registry. |
| **3. Admin (DEOC)** | `/command` | Incident Command overview: 100-sector thermal silence heatmap, scenario switcher, live incoming SOS alerts, and DTN custody audit log. |

---

## 🔄 Real-Time Multi-Device Demonstration

Sahayam features built-in **multi-device synchronization** over local Wi-Fi or cross-browser windows using Vite Server-Sent Events (SSE) and local BroadcastChannel:

```
[Phone 1: Civilian User] ────────▶ [Phone 2: Field Volunteer] ────────▶ [Laptop: DEOC Admin]
  Triggers SOS Beacon              P2P Radar picks up ADU;             Live Banner alerts;
  (Encrypted ADU created)          Volunteer takes custody             Visualizes transit hops
                                   and uplinks at gateway              and focuses on cell
```

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **pnpm**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ashin-15/sahayam.git
cd sahayam
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The server will bind to `0.0.0.0:5173` and display both **Local** and **Network** URLs:
```text
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/
```

### 3. Testing on Multiple Devices

#### Option A: Connected to Same Wi-Fi / Hotspot
1. **Device 1 (Phone):** Open `http://<your-network-ip>:5173/` in your mobile browser.
   - Click **1. Users** (`user@gmail.com` / `user`).
   - Go to **Emergency SOS** and tap **Trigger Emergency SOS**.
2. **Device 2 (Second Phone / Window):** Open `http://<your-network-ip>:5173/`.
   - Click **2. Volunteers** (`volunteer@gmail.com` / `volunteer`).
   - Navigate to **4. DDD SOS Relay**. The beacon will appear with an audio chime!
   - Tap **Take Courier Custody (Handshake)** $\to$ **Uplink to DEOC Gateway**.
3. **Device 3 (Laptop):** Navigate to `http://localhost:5173/command`.
   - Watch the live **DISTRESS SIGNAL** alert appear in real time with custody chain and latency metrics!

#### Option B: Campus / Hostel Wi-Fi with Client Isolation
If your Wi-Fi router blocks communication between devices:
* Turn on **Mobile Hotspot** on your phone and connect your laptop to it, or
* Expose a temporary public tunnel:
  ```bash
  npx localtunnel --port 5173
  ```
  Open the generated URL on any phone over 4G/5G mobile data!

---

## 🧪 Testing & Validation

Run the automated Vitest test suite:
```bash
npm test
```
* **App Routing & Role Navigation**: Tests civilian, volunteer, and admin flows.
* **DTN Mesh & ADU State Transitions**: Verifies ADU bundle creation, SHA-256 hashing, custody handshakes, and gateway uplinks.

Build the production bundle:
```bash
npm run build
```

---

## 🔐 Prototype Test Credentials

Pre-configured demo accounts are available on the home page for instant evaluation:

| Role | Email | Password | Primary Mission |
| :--- | :--- | :--- | :--- |
| **Civilian (User)** | `user@gmail.com` | `user` | Kuruvilla House member (`Ammini Kuruvilla`), Medical Passport, SOS Beacon |
| **Volunteer (Field)** | `volunteer@gmail.com` | `volunteer` | Field Volunteer (`Ravi Kumar`), DDD SOS Relay, Optical QR Scanner |
| **Incident Commander** | `admin@gmail.com` | `admin` | DEOC District Commander, Thermal Heatmap, Silence Triage |

---

## 🛠️ Technology Stack

* **Frontend Framework:** [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
* **Build System:** [Vite 8](https://vitejs.dev/) with custom real-time DTN Server-Sent Events (SSE) relay middleware
* **Maps & Geospatial:** [MapLibre GL](https://maplibre.org/) with continuous thermal interpolation
* **Design System & Aesthetics:** Vanilla CSS with custom token architecture, high-contrast operational palette, and radar micro-animations
* **Icons:** [Lucide React](https://lucide.dev/)
* **QR Generation:** [QRCode](https://www.npmjs.com/package/qrcode)
* **Unit Testing:** [Vitest 3](https://vitest.dev/) & [React Testing Library](https://testing-library.com/)

---

## 📚 References & Prior Art

1. **Disconnected Data Distribution (DDD):** *"A Mobile-First Disconnected Data Distribution Network"*, IEEE / Computer Society.
2. **Delay-Tolerant Networking (DTN):** RFC 4838 / RFC 5050 Bundle Protocol Specification.
3. **Wayanad Disaster Case Study (2024):** District Emergency Operations Centre (DEOC) Kerala landslide incident telemetry reports.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
