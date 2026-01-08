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
    state: 'Punjab',
    district: 'Ludhiana',
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
predictionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await makePrediction();
});

// Reset Button
resetBtn.addEventListener('click', () => {
    predictionForm.reset();
    showPlaceholder();
});

// Sample Data Button
sampleBtn.addEventListener('click', () => {
    loadSampleData();
});

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
    
    // NEW: Total production section HTML
    let totalProductionHTML = '';
    if (totalProd) {
        totalProductionHTML = `
            <div class="total-production-card">
                <h4>📐 Total Production for Your Farm</h4>
                <div class="farm-size-info">
                    Farm Size: <strong>${totalProd.farm_area_input} ${totalProd.farm_area_unit}</strong>
                    (${totalProd.effective_area_hectares} ha)
                </div>
                <div class="total-production-grid">
                    <div class="total-item">
                        <div class="total-value">${totalProd.total_kg.toLocaleString()}</div>
                        <div class="total-label">Total kg</div>
                    </div>
                    <div class="total-item">
                        <div class="total-value">${totalProd.total_tons}</div>
                        <div class="total-label">Total Tons</div>
                    </div>
                    <div class="total-item">
                        <div class="total-value">${totalProd.total_quintals}</div>
                        <div class="total-label">Total Quintals</div>
                    </div>
                    <div class="total-item">
                        <div class="total-value">${totalProd.bags_50kg}</div>
                        <div class="total-label">Bags (50kg)</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = `
        <div class="result-card">
            <div class="result-badge ${qualityClass}">${qualityIcon} ${qualityText}</div>
            
            <!-- NEW: Crop & Location Header -->
            <div class="crop-location-header">
                <span class="crop-badge">🌾 ${cropType}</span>
                <span class="location-badge">📍 ${locationStr}</span>
            </div>
            
            <div class="result-title">Predicted Crop Yield</div>
            <div class="result-value">${yieldKg.toLocaleString()}</div>
            <div class="result-unit">kg per hectare</div>
            
            <div class="result-secondary">
                <div class="result-item">
                    <div class="result-item-label">Tons per Hectare</div>
                    <div class="result-item-value">${yieldTons} t/ha</div>
                </div>
                <div class="result-item">
                    <div class="result-item-label">Quintals per Hectare</div>
                    <div class="result-item-value">${(yieldKg / 100).toFixed(2)} q/ha</div>
                </div>
                <div class="result-item">
                    <div class="result-item-label">Bags (50kg) per Hectare</div>
                    <div class="result-item-value">${Math.round(yieldKg / 50)} bags</div>
                </div>
            </div>
            
            ${totalProductionHTML}
            
            ${result.features_imputed && result.features_imputed.length > 0 ? `
                <div class="imputed-notice">
                    <small>ℹ️ Missing values were estimated for: ${result.features_imputed.join(', ')}</small>
                </div>
            ` : ''}
        </div>
        
        <div class="result-tips">
            <h4>💡 Recommendations for ${cropType} in ${state}</h4>
            <ul>
                ${getRecommendations(formData, yieldKg, cropType, state)}
            </ul>
        </div>
    `;
    
    // Add animation
    resultsContainer.querySelector('.result-card').classList.add('animate-in');
    
    // NEW: Hide comparison section if no comparison requested
    const comparisonSection = document.getElementById('comparisonSection');
    if (comparisonSection && !result.crop_comparison) {
        comparisonSection.style.display = 'none';
    }
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
    resultsContainer.innerHTML = `
        <div class="result-placeholder">
            <span class="placeholder-icon">🌾</span>
            <p>Enter crop parameters and click "Predict Yield" to see results</p>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="error-card">
            <div class="error-icon">⚠️</div>
            <h3>Prediction Error</h3>
            <p>${message}</p>
            <button class="btn btn-outline" onclick="showPlaceholder()" style="margin-top: 15px; color: white; border-color: white;">
                Try Again
            </button>
        </div>
    `;
}

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
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1001;
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
        color: var(--primary-color);
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
        color: var(--primary-color);
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
