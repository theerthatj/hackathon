# Sahayam — Market Model & Deployment Strategy

## 1. Stakeholder Architecture: Users, Buyers & Channels

Sahayam operates across four distinct tiers of institutional and grassroots stakeholders:

```
                     ┌────────────────────────────────────────┐
                     │           State / District DEOC        │
                     │          (Institutional Buyer)         │
                     └──────────────────▲─────────────────────┘
                                        │ Procures & Operates
                     ┌──────────────────┴─────────────────────┐
                     │          NGOs & Relief Partners        │
                     │      (Deployment & Distribution)       │
                     └─────────▲────────────────────▲─────────┘
                               │                    │
              ┌────────────────┴──────┐      ┌──────┴────────────────┐
              │ ASHA Workers & Aapda  │      │ Civilian Households   │
              │ Mitra Volunteers      │      │ (End Beneficiaries)   │
              │ (Field Operators)     │      │                       │
              └───────────────────────┘      └───────────────────────┘
```

* **Institutional Buyers (State Disaster Management Authorities - SDMAs / DEOCs)**:
  - Incident commanders and district collectors requiring empirical, explainable silence anomaly detection to prioritize search-and-rescue teams when communication blackouts occur.
* **Field Operators (ASHA Workers, Civil Defence, Aapda Mitra)**:
  - Accredited Social Health Activist (ASHA) community health workers and disaster volunteers who conduct household intake, carry offline store-and-forward SOS couriers, and scan medical passports at relief camps.
* **End Beneficiaries (Civilian Households)**:
  - Vulnerable citizens in high-hazard landslide/flood corridors (elderly, bedridden, infant-care households) carrying offline cryptographic Resilience Passports.
* **Deployment Channels (NGOs & Relief Organizations)**:
  - Red Cross, Kerala Voluntary Youth Action Force, and local disaster response alliances who distribute low-cost field terminals, laminates, and volunteer training.

---

## 2. Pilot District Strategy: Wayanad (100 Grid Sectors)

The operational validation is targeted on Wayanad District, Kerala, modeled on the Mundakkai–Chooralmala disaster corridor:

* **Spatial Coverage**: 100 1-km² geographic grid cells covering high-risk taluks (Vythiri, Mananthavady, Sulthan Bathery).
* **Pre-Seeded Shelters**: 3 permanent relief camp hubs (St. Thomas HSS Kalpetta, Meppadi Community Hall, GHSS Vythiri).
* **Pilot Success Metrics**:
  1. **Time-to-First-Verification**: Reducing the discovery latency of total blackout sectors (dark zones) from 48–72 hours to under 4 hours.
  2. **Golden Window Coverage**: 95% of P0 critical bundles delivered to a command uplink within the 4–6 hour crush-syndrome window.
  3. **Passport Penetration**: >80% of registered high-vulnerability households (bedridden, insulin-dependent, elderly) issued resilience passport tokens prior to the monsoon season.

---

## 3. Cost Model (Yearly, Order-of-Magnitude)

Because Sahayam uses an offline-first PWA architecture and lean server-side scoring, operational infrastructure remains affordable for state disaster budgets:

| Component | Low (INR) | Likely (INR) | High (INR) | USD Equivalent (Likely) | Notes |
|---|---|---|---|---|---|
| **Managed PostGIS Database** | ₹35,000 | ₹75,000 | ₹1,50,000 | ~$900 / yr | Small HA instance (e.g. AWS RDS / GCP Cloud SQL 2 vCPU, 8GB RAM, 100GB SSD) |
| **API Application Host** | ₹20,000 | ₹45,000 | ₹90,000 | ~$540 / yr | Containerized FastAPI instances with auto-scaling |
| **Edge CDN & PWA Hosting** | ₹0 | ₹12,000 | ₹30,000 | ~$150 / yr | Cloudflare / Fastly CDN edge distribution for static assets and offline cache |
| **Map Tile Infrastructure** | ₹0 | ₹25,000 | ₹80,000 | ~$300 / yr | Self-hosted OpenMapTiles or CARTO / Protomaps vector tiles |
| **On-Call Engineering & Maintenance**| ₹1,50,000 | ₹3,50,000 | ₹7,000,000 | ~$4,200 / yr | Annual maintenance contract (AMC) with local technical partner |
| **Total Annual Operational Cost** | **₹2,05,000** | **₹5,07,000** | **₹10,50,000** | **~$6,090 / yr** | Fits well within standard district emergency contingency budgets |

---

## 4. Funding Routes

1. **State Disaster Response Fund (SDRF) Capacity-Building Window**:
   - SDRF guidelines allocate dedicated annual percentages for capacity building, early warning, and disaster mitigation tools.
2. **National Disaster Management Authority (NDMA) Tech Innovation Grants**:
   - Central schemes supporting technological innovations in last-mile disaster communications.
3. **Corporate Social Responsibility (CSR)**:
   - CSR commitments from telecommunication providers, public sector undertakings (PSUs), and financial institutions targeting disaster resilience in the Western Ghats.
4. **NGO & Multi-Lateral Aid**:
   - Co-funding for volunteer hardware (ruggedized low-cost Android tablets for ASHA workers).

---

## 5. Grassroots Distribution Pipeline

```
[ASHA Worker Pre-Monsoon Survey] ──▶ [Resilience Passport Token Issued]
                                               │
                                               ▼
[Physical Printed Card or Mobile PWA] ◄── [Opaque Token: sahayam:user:<id>]
```

1. **Pre-Monsoon ASHA Household Drive**:
   - During annual May pre-monsoon health surveys, ASHA workers enroll high-risk families, documenting chronic conditions, medications, and mobility status into the offline-first registry.
2. **Physical + Digital Issuance**:
   - High-density laminated QR cards are provided to households without smartphones; smartphone users add the PWA to their home screen.
3. **Civil Defence & Aapda Mitra Training**:
   - Volunteer corps receive practical field training on store-and-forward custody relays, basic Wi-Fi Direct synchronization, and camp intake scanning.

---

## 6. Open-Source Sustainability & Public Good Model

* **MIT Core Licensing**:
  - The core application, scoring models, and DTN protocol specifications are open-source and free from proprietary vendor lock-in.
* **Sovereign State Hosting**:
  - State governments and district emergency authorities host and maintain their own instances on State Data Centre (SDC) infrastructure or national cloud (NIC / MeghRaj).
* **Zero Per-Seat Licensing**:
  - No per-user, per-volunteer, or per-citizen license fees, ensuring equitable scaling across impoverished rural panchayats.

---

## 7. Risks & Mitigations

| Risk Factor | Impact | Mitigation Strategy |
|---|---|---|
| **Telco Data Sharing Agreements** | Difficulty accessing real-time cellular handshakes and tower telemetry | Scorer functions with aggregated, anonymized metadata; operates alongside electricity smart meter data and IoT rain gauge telemetry if CDRs are delayed. |
| **Data Privacy & DPDP Act 2023** | Exposure of citizen medical records | QR codes encode **only** an opaque identifier (`sahayam:user:<id>`). No medical data is stored within the printed QR code itself; records can only be resolved by authenticated volunteers with field clearance. |
| **Severe Physical Damage to Hardware** | Loss of volunteer phones during floods or landslides | Atomic ADUs are duplicated via peer-to-peer store-and-forward mesh across multiple volunteer nodes; delivery of any copy fulfills the custody chain. |
| **Device Battery Depletion** | Phones running out of power during multi-day grid blackouts | PWA uses minimal background compute; volunteers equipped with low-cost manual crank / solar power banks at designated camp relay points. |
