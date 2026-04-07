// ============================================
// CROP YIELD PREDICTION DASHBOARD - JAVASCRIPT
// Form Handling, API Calls, Results Display
// Enhanced with Crop, Location & Farm Area Support
// ============================================

// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// DOM Elements
const predictionForm = document.getElementById('predictionForm');
const resultsContainer = document.getElementById('resultsContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const resetBtn = document.getElementById('resetBtn');
const sampleBtn = document.getElementById('sampleBtn');

const whatIfRainfall = document.getElementById('whatifRainfall');
const whatIfTemp = document.getElementById('whatifTemp');
const whatIfFertilizer = document.getElementById('whatifFertilizer');
const whatIfPrice = document.getElementById('whatifPrice');
const whatIfRainfallValue = document.getElementById('whatifRainfallValue');
const whatIfTempValue = document.getElementById('whatifTempValue');
const whatIfFertilizerValue = document.getElementById('whatifFertilizerValue');
const whatIfPriceValue = document.getElementById('whatifPriceValue');
const simulateWhatIfBtn = document.getElementById('simulateWhatIfBtn');
const resetWhatIfBtn = document.getElementById('resetWhatIfBtn');
const whatIfResult = document.getElementById('whatIfResult');

const saveScenarioABtn = document.getElementById('saveScenarioABtn');
const saveScenarioBBtn = document.getElementById('saveScenarioBBtn');
const compareScenarioBtn = document.getElementById('compareScenarioBtn');
const scenarioTableBody = document.getElementById('scenarioTableBody');

const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Shared context for chatbot: updated on each successful prediction.
window.latestPredictionContext = null;
window.latestPredictionResult = null;
window.savedScenarios = { A: null, B: null };

// Feature List (must match API expectations - 75K Synthetic Dataset)
const FEATURES = [
    'Rainfall_mm',
    'Temperature_C',
    'Humidity',
    'Sunshine_hours',
    'GDD',
    'Pressure_KPa',
    'Wind_Speed_Kmh',
    'Soil_pH',
    'Soil_Quality',
    'OrganicCarbon',
    'Nitrogen',
    'Phosphorus',
    'Potassium',
    'Soil_Moisture',
    'Fertilizer_Amount_kg_per_hectare',
    'Crop_Price'
];

// Additional fields for enhanced prediction (75K Synthetic Dataset)
const EXTRA_FIELDS = [
    'crop_type',
    'state', 
    'district',
    'season',
    'soil_type',
    'irrigation_type',
    'seed_variety',
    'agro_climatic_zone',
    'farm_area',
    'farm_area_unit',
    'latitude',
    'longitude',
    'elevation',
    'sowing_date',
    'expected_harvest_date'
];

// Sample Data for Testing (75K Synthetic Dataset Values)
const SAMPLE_DATA = {
    // Weather features
    Rainfall_mm: 1000,
    Temperature_C: 26,
    Humidity: 72,
    Sunshine_hours: 7,
    GDD: 1800,
    Pressure_KPa: 101,
    Wind_Speed_Kmh: 18,
    // Soil features
    Soil_pH: 6.8,
    Soil_Quality: 70,
    OrganicCarbon: 1.4,
    Nitrogen: 90,
    Phosphorus: 60,
    Potassium: 65,
    Soil_Moisture: 50,
    // Management
    Fertilizer_Amount_kg_per_hectare: 200,
    Crop_Price: 2000,
    // Categorical (now ML active)
    crop_type: 'Rice',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    season: 'Kharif',
    soil_type: 'Alluvial',
    irrigation_type: 'Canal',
    seed_variety: 'Hybrid',
    agro_climatic_zone: 'Trans-Gangetic Plains',
    farm_area: 2.5,
    farm_area_unit: 'Hectare',
    latitude: 30.9010,
    longitude: 75.8573,
    elevation: 247
};

// ============================================
// Event Listeners
// ============================================

// Form Submission
if (predictionForm) {
    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await makePrediction();
    });
}

// Reset Button
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        predictionForm.reset();
        window.latestPredictionContext = null;
        window.latestPredictionResult = null;
        window.dispatchEvent(new CustomEvent('predictionContextUpdated', { detail: null }));
        showPlaceholder();
        resetWhatIfControls();
    });
}

// Sample Data Button
if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
        loadSampleData();
    });
}

// Field Status Toggle Button
const toggleFieldStatusBtn = document.getElementById('toggleFieldStatus');
const fieldStatusLegend = document.getElementById('fieldStatusLegend');

if (toggleFieldStatusBtn) {
    toggleFieldStatusBtn.addEventListener('click', () => {
        const form = document.getElementById('predictionForm');
        const isShowing = form.classList.toggle('show-field-status');
        
        // Toggle legend visibility
        if (fieldStatusLegend) {
            fieldStatusLegend.style.display = isShowing ? 'block' : 'none';
        }
        
        // Update button text and state
        toggleFieldStatusBtn.classList.toggle('active', isShowing);
        toggleFieldStatusBtn.innerHTML = isShowing 
            ? '<span class="btn-icon">✓</span> Hide Field Status'
            : '<span class="btn-icon">🔍</span> Show Field Status';
        
        console.log(`📊 Field status indicators ${isShowing ? 'shown' : 'hidden'}`);
    });
}

// ============================================
// Core Functions
// ============================================

/**
 * Collect form data and make prediction API call
 */
async function makePrediction() {
    showLoading(true);
    
    try {
        // Collect form data - ML features
        const formData = {};
        let hasData = false;
        
        FEATURES.forEach(feature => {
            const element = document.getElementById(feature);
            if (element && element.value !== '') {
                formData[feature] = parseFloat(element.value);
                hasData = true;
            }
        });
        
        // NEW: Collect additional fields (crop, location, farm area, etc.)
        EXTRA_FIELDS.forEach(field => {
            const element = document.getElementById(field);
            if (element && element.value !== '') {
                // Handle numeric fields
                if (['farm_area', 'latitude', 'longitude', 'elevation'].includes(field)) {
                    formData[field] = parseFloat(element.value);
                } else {
                    formData[field] = element.value;
                }
            }
        });
        
        // NEW: Check for multi-crop comparison toggle
        const compareCropsCheckbox = document.getElementById('compare_crops');
        if (compareCropsCheckbox && compareCropsCheckbox.checked) {
            formData['compare_crops'] = true;
            console.log('📊 Multi-crop comparison enabled');
        }
        
        console.log('📤 Sending to API:', formData);
        
        if (!hasData) {
            showError('Please fill in at least some fields to make a prediction.');
            return;
        }
        
        // Make API request
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('✅ API Response:', result);
            displayResults(result, formData);

            // Make latest model output available to chatbot analysis.
            window.latestPredictionContext = {
                inputs: formData,
                prediction: result.prediction || {},
                crop_info: result.crop_info || {},
                total_production: result.total_production || {},
                crop_comparison: result.crop_comparison || []
            };
            window.latestPredictionResult = result;
            window.dispatchEvent(new CustomEvent('predictionContextUpdated', { detail: window.latestPredictionContext }));
            
            // NEW: Handle multi-crop comparison results
            if (result.crop_comparison) {
                console.log('📊 Multi-crop comparison data:', result.crop_comparison);
                displayMultiCropComparison(result.crop_comparison);
            }
        } else {
            showError(result.message || 'Prediction failed. Please try again.');
        }
        
    } catch (error) {
        console.error('Prediction error:', error);
        
        // Check if API is not running
        if (error.message.includes('Failed to fetch')) {
            showError('Cannot connect to API server. Make sure the Flask API is running on localhost:5000');
        } else {
            showError(`Error: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Display prediction results - Enhanced with crop, location & total production
 */
function displayResults(result, formData = {}) {
    const prediction = result.prediction;
    const yieldKg = prediction.yield_kg_per_hectare;
    const yieldTons = prediction.yield_tons_per_hectare;
    
    // NEW: Get crop and location info
    const cropInfo = result.crop_info || {};
    const cropType = cropInfo.crop_type || 'Unknown Crop';
    const state = cropInfo.state || 'Unknown Location';
    const district = cropInfo.district || '';
    const season = cropInfo.season || '';
    
    // NEW: Get total production info
    const totalProd = result.total_production;
    
    // Determine yield quality
    let qualityIcon, qualityText, qualityClass;
    if (yieldKg >= 800) {
        qualityIcon = '🌟';
        qualityText = 'Excellent Yield';
        qualityClass = 'excellent';
    } else if (yieldKg >= 500) {
        qualityIcon = '✅';
        qualityText = 'Good Yield';
        qualityClass = 'good';
    } else if (yieldKg >= 300) {
        qualityIcon = '⚠️';
        qualityText = 'Moderate Yield';
        qualityClass = 'moderate';
    } else {
        qualityIcon = '📉';
        qualityText = 'Low Yield';
        qualityClass = 'low';
    }
    
    // NEW: Update results section title with crop & location
    const resultsTitle = document.getElementById('resultsTitle');
    if (resultsTitle) {
        resultsTitle.innerHTML = `📈 Predicted Yield for <strong>${cropType}</strong> in <strong>${state}</strong>`;
    }
    
    // NEW: Build location string
    let locationStr = state;
    if (district) {
        locationStr = `${district}, ${state}`;
    }
    if (season) {
        locationStr += ` (${season} Season)`;
    }
    
    // Show section and clear error
    resultsContainer.style.display = 'block';
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }

    // Update quality badge
    const qualityBadge = document.getElementById('qualityBadge');
    if (qualityBadge) {
        qualityBadge.innerHTML = `
            <span class="quality-icon">${qualityIcon}</span>
            <span class="quality-text">${qualityText}</span>
        `;
        qualityBadge.className = `quality-badge ${qualityClass}`;
    }

    // Update primary prediction values
    const yieldPerHa = document.getElementById('yieldPerHa');
    const yieldTonsEl = document.getElementById('yieldTons');
    const yieldQuintals = document.getElementById('yieldQuintals');

    if (yieldPerHa) yieldPerHa.textContent = `${yieldKg.toLocaleString()} kg`;
    if (yieldTonsEl) yieldTonsEl.textContent = `${yieldTons} tons`;
    if (yieldQuintals) yieldQuintals.textContent = `${(yieldKg / 100).toFixed(2)} q`;

    // Update total production block
    const totalProductionCard = document.getElementById('totalProductionCard');
    if (totalProductionCard && totalProd) {
        totalProductionCard.style.display = 'block';

        const farmSizeInfo = document.getElementById('farmSizeInfo');
        const totalKg = document.getElementById('totalKg');
        const totalTons = document.getElementById('totalTons');
        const totalQuintals = document.getElementById('totalQuintals');

        if (farmSizeInfo) {
            farmSizeInfo.textContent = `Farm Size: ${totalProd.farm_area_input} ${totalProd.farm_area_unit} (${totalProd.effective_area_hectares} ha)`;
        }
        if (totalKg) totalKg.textContent = `${Number(totalProd.total_kg || 0).toLocaleString()} kg`;
        if (totalTons) totalTons.textContent = `${totalProd.total_tons} tons`;
        if (totalQuintals) totalQuintals.textContent = `${totalProd.total_quintals} q`;
    } else if (totalProductionCard) {
        totalProductionCard.style.display = 'none';
    }

    renderFactorInsights(formData, result);
    renderRiskAlerts(formData, result);
    renderEconomics(formData, result);
    
    // NEW: Hide comparison section if no comparison requested
    const comparisonSection = document.getElementById('comparisonSection');
    if (comparisonSection && !result.crop_comparison) {
        comparisonSection.style.display = 'none';
    }
}

function formatINR(amount) {
    return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

function computeEconomics(input, result) {
    const predictedKgHa = Number(result?.prediction?.yield_kg_per_hectare || 0);
    const pricePerKg = Number(input?.Crop_Price || DEFAULT_VALUES.Crop_Price || 0);
    const farmArea = Number(input?.farm_area || 1);
    const unit = input?.farm_area_unit || 'Hectare';
    const conversionFactor = { Hectare: 1, Acre: 0.4047, Bigha: 0.2529, Sq_Meter: 0.0001 }[unit] || 1;
    const areaHa = Math.max(0.1, farmArea * conversionFactor);

    const totalKg = predictedKgHa * areaHa;
    const revenue = totalKg * pricePerKg;

    const fertAmount = Number(input?.Fertilizer_Amount_kg_per_hectare || DEFAULT_VALUES.Fertilizer_Amount_kg_per_hectare || 0);
    const fertilizerCost = fertAmount * 22 * areaHa;
    const baseOpsCost = 12000 * areaHa;
    const totalCost = fertilizerCost + baseOpsCost;
    const profit = revenue - totalCost;

    return { totalKg, revenue, totalCost, profit, areaHa };
}

function renderEconomics(input, result) {
    const { revenue, totalCost, profit } = computeEconomics(input, result);

    const revenueEl = document.getElementById('estimatedRevenue');
    const costEl = document.getElementById('estimatedCost');
    const profitEl = document.getElementById('estimatedProfit');

    if (revenueEl) revenueEl.textContent = formatINR(revenue);
    if (costEl) costEl.textContent = formatINR(totalCost);
    if (profitEl) {
        profitEl.textContent = formatINR(profit);
        profitEl.style.color = profit >= 0 ? '#2e7d32' : '#c62828';
    }
}

function updateWhatIfLabels() {
    if (whatIfRainfallValue && whatIfRainfall) whatIfRainfallValue.textContent = `${whatIfRainfall.value}%`;
    if (whatIfTempValue && whatIfTemp) whatIfTempValue.textContent = `${whatIfTemp.value}°C`;
    if (whatIfFertilizerValue && whatIfFertilizer) whatIfFertilizerValue.textContent = `${whatIfFertilizer.value}%`;
    if (whatIfPriceValue && whatIfPrice) whatIfPriceValue.textContent = `${whatIfPrice.value}%`;
}

function resetWhatIfControls() {
    if (whatIfRainfall) whatIfRainfall.value = 0;
    if (whatIfTemp) whatIfTemp.value = 0;
    if (whatIfFertilizer) whatIfFertilizer.value = 0;
    if (whatIfPrice) whatIfPrice.value = 0;
    updateWhatIfLabels();
    if (whatIfResult) whatIfResult.textContent = 'Run simulation to compare baseline vs adjusted scenario.';
}

async function runWhatIfSimulation() {
    if (!window.latestPredictionContext || !window.latestPredictionContext.inputs || !window.latestPredictionResult) {
        showNotification('Run a baseline prediction first before using What-If simulation.');
        return;
    }

    const baseInput = { ...window.latestPredictionContext.inputs };
    const modifiedInput = { ...baseInput };

    const rainPct = Number(whatIfRainfall?.value || 0);
    const tempDelta = Number(whatIfTemp?.value || 0);
    const fertPct = Number(whatIfFertilizer?.value || 0);
    const pricePct = Number(whatIfPrice?.value || 0);

    modifiedInput.Rainfall_mm = Number((Number(baseInput.Rainfall_mm || DEFAULT_VALUES.Rainfall_mm) * (1 + rainPct / 100)).toFixed(2));
    modifiedInput.Temperature_C = Number((Number(baseInput.Temperature_C || DEFAULT_VALUES.Temperature_C) + tempDelta).toFixed(2));
    modifiedInput.Fertilizer_Amount_kg_per_hectare = Number((Number(baseInput.Fertilizer_Amount_kg_per_hectare || DEFAULT_VALUES.Fertilizer_Amount_kg_per_hectare) * (1 + fertPct / 100)).toFixed(2));
    modifiedInput.Crop_Price = Number((Number(baseInput.Crop_Price || DEFAULT_VALUES.Crop_Price) * (1 + pricePct / 100)).toFixed(2));

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(modifiedInput)
        });
        const simResult = await response.json();

        if (simResult.status !== 'success') {
            throw new Error(simResult.message || 'Simulation failed');
        }

        const baselineYield = Number(window.latestPredictionResult?.prediction?.yield_kg_per_hectare || 0);
        const simYield = Number(simResult?.prediction?.yield_kg_per_hectare || 0);
        const deltaYield = simYield - baselineYield;

        const baseEco = computeEconomics(baseInput, window.latestPredictionResult);
        const simEco = computeEconomics(modifiedInput, simResult);
        const deltaProfit = simEco.profit - baseEco.profit;

        if (whatIfResult) {
            whatIfResult.innerHTML = `
                Baseline Yield: <strong>${baselineYield.toFixed(2)} kg/ha</strong> | Simulated Yield: <strong>${simYield.toFixed(2)} kg/ha</strong><br>
                Yield Change: <strong>${deltaYield >= 0 ? '+' : ''}${deltaYield.toFixed(2)} kg/ha</strong> | Profit Change: <strong>${deltaProfit >= 0 ? '+' : ''}${formatINR(deltaProfit)}</strong>
            `;
        }
    } catch (error) {
        if (whatIfResult) {
            whatIfResult.textContent = `Simulation failed: ${error.message}`;
        }
    }
}

function saveScenario(slot) {
    if (!window.latestPredictionContext || !window.latestPredictionResult) {
        showNotification('Run prediction first, then save scenario.');
        return;
    }

    window.savedScenarios[slot] = {
        input: { ...window.latestPredictionContext.inputs },
        result: JSON.parse(JSON.stringify(window.latestPredictionResult)),
        economics: computeEconomics(window.latestPredictionContext.inputs, window.latestPredictionResult)
    };
    showNotification(`Scenario ${slot} saved.`);
}

function compareScenarios() {
    const a = window.savedScenarios.A;
    const b = window.savedScenarios.B;
    if (!a || !b) {
        showNotification('Save both Scenario A and Scenario B first.');
        return;
    }

    const yA = Number(a.result?.prediction?.yield_kg_per_hectare || 0);
    const yB = Number(b.result?.prediction?.yield_kg_per_hectare || 0);
    const pA = Number(a.economics?.profit || 0);
    const pB = Number(b.economics?.profit || 0);
    const rA = Number(a.economics?.revenue || 0);
    const rB = Number(b.economics?.revenue || 0);

    if (scenarioTableBody) {
        scenarioTableBody.innerHTML = `
            <tr>
                <td>Yield (kg/ha)</td>
                <td>${yA.toFixed(2)}</td>
                <td>${yB.toFixed(2)}</td>
                <td>${(yB - yA >= 0 ? '+' : '') + (yB - yA).toFixed(2)}</td>
            </tr>
            <tr>
                <td>Revenue</td>
                <td>${formatINR(rA)}</td>
                <td>${formatINR(rB)}</td>
                <td>${(rB - rA >= 0 ? '+' : '') + formatINR(rB - rA)}</td>
            </tr>
            <tr>
                <td>Profit</td>
                <td>${formatINR(pA)}</td>
                <td>${formatINR(pB)}</td>
                <td>${(pB - pA >= 0 ? '+' : '') + formatINR(pB - pA)}</td>
            </tr>
            <tr>
                <td>Crop Type</td>
                <td>${a.input?.crop_type || '-'}</td>
                <td>${b.input?.crop_type || '-'}</td>
                <td>-</td>
            </tr>
        `;
    }
}

function exportCurrentResultCSV() {
    if (!window.latestPredictionContext || !window.latestPredictionResult) {
        showNotification('Run prediction first to export data.');
        return;
    }

    const input = window.latestPredictionContext.inputs || {};
    const result = window.latestPredictionResult || {};
    const eco = computeEconomics(input, result);

    const rows = [
        ['Field', 'Value'],
        ['Crop', input.crop_type || ''],
        ['State', input.state || ''],
        ['Season', input.season || ''],
        ['Yield_kg_per_hectare', result?.prediction?.yield_kg_per_hectare || 0],
        ['Yield_tons_per_hectare', result?.prediction?.yield_tons_per_hectare || 0],
        ['Estimated_Revenue_INR', Math.round(eco.revenue || 0)],
        ['Estimated_Cost_INR', Math.round(eco.totalCost || 0)],
        ['Estimated_Profit_INR', Math.round(eco.profit || 0)]
    ];

    Object.keys(input).forEach((k) => rows.push([`input_${k}`, input[k]]));

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crop_prediction_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function exportCurrentResultPDF() {
    if (!window.latestPredictionContext || !window.latestPredictionResult) {
        showNotification('Run prediction first to export PDF.');
        return;
    }

    const input = window.latestPredictionContext.inputs || {};
    const result = window.latestPredictionResult || {};
    const eco = computeEconomics(input, result);

    const printable = window.open('', '_blank', 'width=900,height=700');
    if (!printable) return;

    printable.document.write(`
        <html><head><title>CropAI Prediction Report</title>
        <style>
            body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}
            h1{color:#2e7d32}
            table{border-collapse:collapse;width:100%;margin-top:16px}
            td,th{border:1px solid #ddd;padding:8px}
            th{background:#f0f4f1;text-align:left}
        </style>
        </head><body>
        <h1>CropAI Prediction Report</h1>
        <p><strong>Crop:</strong> ${input.crop_type || '-'} | <strong>State:</strong> ${input.state || '-'} | <strong>Season:</strong> ${input.season || '-'}</p>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Yield (kg/ha)</td><td>${result?.prediction?.yield_kg_per_hectare || 0}</td></tr>
            <tr><td>Yield (t/ha)</td><td>${result?.prediction?.yield_tons_per_hectare || 0}</td></tr>
            <tr><td>Estimated Revenue</td><td>${formatINR(eco.revenue)}</td></tr>
            <tr><td>Estimated Cost</td><td>${formatINR(eco.totalCost)}</td></tr>
            <tr><td>Estimated Profit</td><td>${formatINR(eco.profit)}</td></tr>
        </table>
        </body></html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
}

function renderRiskAlerts(input, result) {
    const alerts = [];
    const temp = Number(input?.Temperature_C || DEFAULT_VALUES.Temperature_C);
    const rain = Number(input?.Rainfall_mm || DEFAULT_VALUES.Rainfall_mm);
    const ph = Number(input?.Soil_pH || DEFAULT_VALUES.Soil_pH);
    const nitrogen = Number(input?.Nitrogen || DEFAULT_VALUES.Nitrogen);
    const moisture = Number(input?.Soil_Moisture || DEFAULT_VALUES.Soil_Moisture);
    const yieldKg = Number(result?.prediction?.yield_kg_per_hectare || 0);

    if (temp > 35) alerts.push({ level: 'high', text: 'High heat stress risk (Temperature > 35°C)' });
    if (rain < 500) alerts.push({ level: 'high', text: 'Drought risk (Rainfall < 500 mm)' });
    if (ph < 5.5 || ph > 8) alerts.push({ level: 'medium', text: 'Soil pH outside optimal range (5.5 - 8.0)' });
    if (nitrogen < 60) alerts.push({ level: 'medium', text: 'Low nitrogen risk for vegetative growth' });
    if (moisture < 35) alerts.push({ level: 'medium', text: 'Low soil moisture may reduce yield' });
    if (yieldKg < 350) alerts.push({ level: 'high', text: 'Predicted yield is low; management review recommended' });

    const alertsEl = document.getElementById('riskAlertsList');
    if (!alertsEl) return;

    if (alerts.length === 0) {
        alertsEl.innerHTML = '<span class="risk-pill low">No major risk alerts for current inputs</span>';
        return;
    }

    alertsEl.innerHTML = alerts
        .map((a) => `<span class="risk-pill ${a.level}">${a.text}</span>`)
        .join('');
}

function renderFactorInsights(input, result) {
    const insights = [];
    const yieldKg = Number(result?.prediction?.yield_kg_per_hectare || 0);

    const rain = Number(input?.Rainfall_mm || DEFAULT_VALUES.Rainfall_mm);
    const temp = Number(input?.Temperature_C || DEFAULT_VALUES.Temperature_C);
    const ph = Number(input?.Soil_pH || DEFAULT_VALUES.Soil_pH);
    const soilQuality = Number(input?.Soil_Quality || DEFAULT_VALUES.Soil_Quality);
    const fertilizer = Number(input?.Fertilizer_Amount_kg_per_hectare || DEFAULT_VALUES.Fertilizer_Amount_kg_per_hectare);

    if (rain < 700) insights.push('Rainfall is below optimal; additional irrigation planning can improve yield stability.');
    else if (rain > 1800) insights.push('High rainfall may increase waterlogging risk; drainage management is important.');

    if (temp > 34) insights.push('Temperature is high for many crops; heat stress mitigation may be needed.');
    else if (temp < 18) insights.push('Low temperature can slow crop growth and affect final yield.');

    if (ph < 6 || ph > 7.8) insights.push('Soil pH is outside the sweet spot; pH correction may improve nutrient uptake.');
    if (soilQuality < 60) insights.push('Soil quality index is moderate/low; adding organic matter can improve productivity.');

    if (fertilizer < 120) insights.push('Fertilizer input appears low; balanced NPK schedule could improve output.');
    else if (fertilizer > 300) insights.push('Fertilizer input is high; optimize dosage to avoid cost and diminishing returns.');

    if (yieldKg >= 800) insights.unshift('Current settings are strong; maintain consistency and monitor weather swings.');
    if (yieldKg < 400) insights.unshift('Predicted yield is currently low; prioritize water, pH, and nutrient corrections first.');

    const listEl = document.getElementById('factorInsightsList');
    if (!listEl) return;

    if (insights.length === 0) {
        listEl.innerHTML = '<li>Inputs are close to balanced ranges. Fine-tune farm management for incremental gains.</li>';
        return;
    }

    listEl.innerHTML = insights.map((tip) => `<li>${tip}</li>`).join('');
}

/**
 * NEW: Display multi-crop comparison results
 */
function displayMultiCropComparison(comparison) {
    const comparisonSection = document.getElementById('comparisonSection');
    const comparisonResults = document.getElementById('comparisonResults');
    
    if (!comparisonSection || !comparisonResults) return;
    
    comparisonSection.style.display = 'block';
    
    // Handle both array format (from backend) and object format
    const results = Array.isArray(comparison) ? comparison : comparison.results;
    const note = comparison.note || 'Comparison based on current conditions';
    const supported = comparison.supported !== false;
    
    let tableHTML = `
        <div class="comparison-note ${supported ? 'supported' : 'demo'}">
            ${supported ? '✅' : 'ℹ️'} ${note}
        </div>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Crop</th>
                    <th>Yield (kg/ha)</th>
                    <th>Yield (t/ha)</th>
                    <th>Bags/ha (50kg)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    results.forEach((item, index) => {
        const rowClass = index === 0 ? 'top-crop' : '';
        const bagsPerHa = item.bags_per_hectare_50kg || Math.round(item.yield_kg_per_hectare / 50);
        tableHTML += `
            <tr class="${rowClass}">
                <td>${index + 1}</td>
                <td><strong>${item.crop}</strong></td>
                <td>${item.yield_kg_per_hectare.toLocaleString()}</td>
                <td>${item.yield_tons_per_hectare}</td>
                <td>${bagsPerHa}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    comparisonResults.innerHTML = tableHTML;
}

/**
 * Generate farming recommendations based on input and prediction
 * Enhanced with crop and location context
 */
function getRecommendations(input, predictedYield, cropType = 'crop', state = 'your area') {
    const tips = [];
    
    // Safety check for undefined input
    if (!input) input = {};
    
    // Crop-specific recommendations
    if (cropType === 'Rice') {
        tips.push('<li>For rice, maintain water levels during critical growth stages</li>');
        if (input.Irrigation_Schedule && input.Irrigation_Schedule < 5) {
            tips.push('<li>Rice typically needs frequent irrigation - consider increasing frequency</li>');
        }
    } else if (cropType === 'Wheat') {
        tips.push('<li>Wheat performs best with 4-6 irrigations during the season</li>');
    } else if (cropType === 'Maize') {
        tips.push('<li>Maize requires adequate nitrogen - consider split application</li>');
    }
    
    // General recommendations based on inputs
    if (input.Nitrogen && input.Nitrogen < 40) {
        tips.push('<li>Consider increasing nitrogen fertilizer for better vegetative growth</li>');
    }
    if (input.Rainfall_mm && input.Rainfall_mm < 300) {
        tips.push('<li>Low rainfall detected - ensure adequate irrigation</li>');
    }
    if (input.Soil_Quality && input.Soil_Quality < 60) {
        tips.push('<li>Soil quality is below optimal - consider soil amendments</li>');
    }
    if (input.Temperature_C && input.Temperature_C > 35) {
        tips.push('<li>High temperature may stress crops - provide shade or mulching</li>');
    }
    if (predictedYield < 400) {
        tips.push('<li>Consider crop rotation or selecting higher-yield seed varieties</li>');
    }
    
    // Location-specific tips
    if (state === 'Punjab' || state === 'Haryana') {
        tips.push('<li>In ' + state + ', consider groundwater conservation practices</li>');
    }
    if (state === 'Rajasthan') {
        tips.push('<li>In Rajasthan, drought-resistant varieties may perform better</li>');
    }
    
    if (tips.length === 0) {
        tips.push(`<li>Current parameters for ${cropType} in ${state} look optimal for good yield</li>`);
        tips.push('<li>Monitor weather conditions regularly</li>');
    }
    
    return tips.join('');
}

/**
 * Load sample data into form - Enhanced with new fields
 */
function loadSampleData() {
    // Load all fields including new ones
    Object.keys(SAMPLE_DATA).forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = SAMPLE_DATA[field];
        }
    });
    
    // Show notification
    showNotification('Sample data loaded! Click "Predict Yield" to see results.');
}

/**
 * Show placeholder message
 */
function showPlaceholder() {
    const resultsTitle = document.getElementById('resultsTitle');
    const qualityBadge = document.getElementById('qualityBadge');
    const yieldPerHa = document.getElementById('yieldPerHa');
    const yieldTonsEl = document.getElementById('yieldTons');
    const yieldQuintals = document.getElementById('yieldQuintals');
    const totalProductionCard = document.getElementById('totalProductionCard');
    const factorInsightsList = document.getElementById('factorInsightsList');
    const riskAlertsList = document.getElementById('riskAlertsList');
    const estimatedRevenue = document.getElementById('estimatedRevenue');
    const estimatedCost = document.getElementById('estimatedCost');
    const estimatedProfit = document.getElementById('estimatedProfit');
    const errorMessage = document.getElementById('errorMessage');

    if (resultsTitle) resultsTitle.textContent = '📈 Prediction Results';
    if (qualityBadge) {
        qualityBadge.innerHTML = '<span class="quality-icon">🌟</span><span class="quality-text">Ready</span>';
    }
    if (yieldPerHa) yieldPerHa.textContent = '0 kg';
    if (yieldTonsEl) yieldTonsEl.textContent = '0 tons';
    if (yieldQuintals) yieldQuintals.textContent = '0 q';
    if (totalProductionCard) totalProductionCard.style.display = 'none';
    if (factorInsightsList) factorInsightsList.innerHTML = '<li>Run a prediction to see factor-level analysis.</li>';
    if (riskAlertsList) riskAlertsList.innerHTML = '<span class="risk-pill low">No active alerts</span>';
    if (estimatedRevenue) estimatedRevenue.textContent = '₹0';
    if (estimatedCost) estimatedCost.textContent = '₹0';
    if (estimatedProfit) {
        estimatedProfit.textContent = '₹0';
        estimatedProfit.style.color = 'var(--primary)';
    }
    if (errorMessage) errorMessage.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    resultsContainer.style.display = 'block';
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }
}

if (whatIfRainfall) whatIfRainfall.addEventListener('input', updateWhatIfLabels);
if (whatIfTemp) whatIfTemp.addEventListener('input', updateWhatIfLabels);
if (whatIfFertilizer) whatIfFertilizer.addEventListener('input', updateWhatIfLabels);
if (whatIfPrice) whatIfPrice.addEventListener('input', updateWhatIfLabels);
if (simulateWhatIfBtn) simulateWhatIfBtn.addEventListener('click', runWhatIfSimulation);
if (resetWhatIfBtn) resetWhatIfBtn.addEventListener('click', resetWhatIfControls);

if (saveScenarioABtn) saveScenarioABtn.addEventListener('click', () => saveScenario('A'));
if (saveScenarioBBtn) saveScenarioBBtn.addEventListener('click', () => saveScenario('B'));
if (compareScenarioBtn) compareScenarioBtn.addEventListener('click', compareScenarios);

if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCurrentResultCSV);
if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportCurrentResultPDF);

updateWhatIfLabels();

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Show notification message
 */
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <span>✅ ${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 84px;
        right: 20px;
        background: linear-gradient(135deg, var(--primary, #2e7d32), var(--primary-dark, #1b5e20));
        color: #ffffff;
        padding: 15px 25px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        font-weight: 600;
        max-width: min(92vw, 460px);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// Model Info Functions
// ============================================

/**
 * Fetch and display model information
 */
async function fetchModelInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/model-info`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const info = data.model_info;
            document.getElementById('modelName').textContent = info.name;
            document.getElementById('r2Score').textContent = info.r2_score.toFixed(4);
            document.getElementById('maeScore').textContent = `${info.mae.toFixed(2)} kg/ha`;
            document.getElementById('rmseScore').textContent = `${info.rmse.toFixed(2)} kg/ha`;
        }
    } catch (error) {
        console.log('Could not fetch model info - API may not be running');
    }
}

// ============================================
// Initialize
// ============================================

// Load model info on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchModelInfo();
});

// Add CSS animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .result-badge {
        display: inline-block;
        padding: 8px 20px;
        background: rgba(255,255,255,0.2);
        border-radius: 20px;
        font-size: 0.95rem;
        margin-bottom: 15px;
    }
    .imputed-notice {
        margin-top: 20px;
        padding: 10px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
    }
    .result-tips {
        margin-top: 25px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
        text-align: left;
    }
    .result-tips h4 {
        color: var(--primary, #2e7d32);
        margin-bottom: 15px;
    }
    .result-tips ul {
        list-style: none;
        padding: 0;
    }
    .result-tips li {
        padding: 8px 0;
        padding-left: 25px;
        position: relative;
        color: var(--text-secondary);
    }
    .result-tips li:before {
        content: '→';
        position: absolute;
        left: 0;
        color: var(--primary, #2e7d32);
    }
    .animate-in {
        animation: fadeInUp 0.5s ease;
    }
`;
document.head.appendChild(style);

// ============================================
// Backend Status Check
// ============================================

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const backendStatus = document.getElementById('backendStatus');

async function checkBackendStatus() {
    if (!statusIndicator || !statusText) return;
    
    statusIndicator.className = 'status-indicator checking';
    statusText.className = 'status-text';
    statusText.textContent = 'Checking API...';
    
    // Remove existing retry button if any
    const existingBtn = backendStatus.querySelector('.retry-btn');
    if (existingBtn) existingBtn.remove();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.status === 'healthy' && data.model_loaded) {
            statusIndicator.className = 'status-indicator online';
            statusText.className = 'status-text online';
            statusText.textContent = '✓ Backend Online - Ready for predictions';
        } else {
            throw new Error('Model not loaded');
        }
    } catch (error) {
        statusIndicator.className = 'status-indicator offline';
        statusText.className = 'status-text offline';
        statusText.textContent = '✗ Backend Offline - Start the Flask API server';
        
        // Add retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = '🔄 Retry';
        retryBtn.style.display = 'inline-block';
        retryBtn.onclick = checkBackendStatus;
        backendStatus.appendChild(retryBtn);
    }
}

// Check backend status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    // Re-check every 30 seconds
    setInterval(checkBackendStatus, 30000);
});

// ============================================
// Chatbot Integration (Groq via Flask /chat)
// ============================================

const chatToggle = document.getElementById('chatToggle');
const chatWidget = document.getElementById('chatWidget');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

const chatHistory = [
    {
        role: 'assistant',
        content: 'Hi! I can help you understand crop yield predictions, soil factors, and farming decisions.'
    }
];

function toggleChatWidget(openState) {
    if (!chatWidget || !chatToggle) return;

    const shouldOpen = typeof openState === 'boolean' ? openState : chatWidget.classList.contains('hidden');
    chatWidget.classList.toggle('hidden', !shouldOpen);
    chatToggle.textContent = shouldOpen ? '✕' : '💬';
    chatToggle.title = shouldOpen ? 'Close AI Assistant' : 'Open AI Assistant';

    if (shouldOpen && chatInput) {
        setTimeout(() => chatInput.focus(), 120);
    }
}

function addChatMessage(role, content) {
    if (!chatMessages) return;

    const row = document.createElement('div');
    row.className = `chat-message ${role === 'user' ? 'user' : 'bot'}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content;

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatLoading(isLoading) {
    const sendButton = document.getElementById('chatSend');
    if (!sendButton) return;

    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? '...' : 'Send';
}

async function submitChatMessage(text) {
    const userText = (text || '').trim();
    if (!userText) return;

    addChatMessage('user', userText);
    chatHistory.push({ role: 'user', content: userText });
    setChatLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatHistory.slice(-8).map((m) => ({ role: m.role, content: m.content }))
            })
        });

        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            throw new Error(data.message || 'Chat request failed');
        }

        const reply = data.reply || 'I could not generate a response right now.';
        addChatMessage('assistant', reply);
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (error) {
        const fallback = 'I could not reach the AI service. Please check API status and GROQ_API_KEY.';
        addChatMessage('assistant', fallback);
        chatHistory.push({ role: 'assistant', content: fallback });
        console.error('Chat error:', error);
    } finally {
        setChatLoading(false);
    }
}

if (chatToggle) {
    chatToggle.addEventListener('click', () => toggleChatWidget());
}

if (chatClose) {
    chatClose.addEventListener('click', () => toggleChatWidget(false));
}

if (chatInput) {
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
    });

    chatInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const text = chatInput.value;
            chatInput.value = '';
            chatInput.style.height = '40px';
            await submitChatMessage(text);
        }
    });
}

if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!chatInput) return;

        const text = chatInput.value;
        chatInput.value = '';
        chatInput.style.height = '40px';
        await submitChatMessage(text);
    });
}
