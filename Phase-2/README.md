# 🌾 Phase-2: Production ML Pipeline

**Crop Yield Prediction System - End-to-End Implementation**

Author: **Pushkarjay Ajay**  
GitHub: [github.com/Pushkarjay/Crop-Yield-Prediction](https://github.com/Pushkarjay/Crop-Yield-Prediction)

---

## 📋 Overview

Phase-2 implements the complete production-ready machine learning pipeline including:
- Synthetic dataset generation (75,000 records)
- Data preprocessing and feature engineering
- Model training and evaluation (Gradient Boosting, R² = 0.9627)
- REST API for predictions
- Interactive web dashboard
- Comprehensive technical documentation
- Terminal logging for reproducibility

---

## 📁 Directory Structure

```
Phase-2/
├── src/                          # Source Code Modules
│   ├── __init__.py              # Package initialization
│   ├── config.py                # Configuration & constants
│   ├── utils.py                 # Logging & helper utilities
│   ├── data_generation.py       # Synthetic dataset generator
│   ├── visualization.py         # Plot generation functions
│   ├── training.py              # ML model training pipeline
│   ├── outlier_analysis.py      # Outlier detection & analysis
│   └── legacy_*.py              # Original workflow scripts (reference)
│
├── api/                          # Flask REST API
│   ├── app.py                   # Main API application
│   └── requirements.txt         # Python dependencies
│
├── dashboard/                    # Frontend Web UI
│   ├── index.html               # Main prediction dashboard
│   ├── technical.html           # Technical documentation page
│   ├── report.html              # Quick view / PPT-style report
│   ├── script.js                # Frontend JavaScript
│   └── style.css                # Styles
│
├── model/                        # Trained Model Artifacts
│   ├── model.pkl                # Gradient Boosting model
│   ├── scaler.pkl               # StandardScaler
│   ├── imputer.pkl              # SimpleImputer
│   ├── label_encoders.pkl       # Categorical encoders
│   ├── feature_list.pkl         # Feature names
│   └── model_info.pkl           # Model metadata
│
├── plots/                        # Visualizations (8 plots)
│   ├── 01_yield_distribution.png
│   ├── 02_correlation_matrix.png
│   ├── 03_crop_yield_comparison.png
│   ├── 04_state_yield_comparison.png
│   ├── 05_weather_soil_yield.png
│   ├── 06_feature_importance.png
│   ├── 07_outlier_analysis.png
│   └── 07_prediction_analysis.png
│
├── logs/                         # Terminal Output Logs (auto-generated)
├── Terminal Log/                 # Historical terminal logs
│
├── run_pipeline.py               # Master pipeline runner
├── unified_dataset.csv           # 75K synthetic dataset
└── README.md                     # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r api/requirements.txt
```

### 2. Run Full Pipeline (Generate Data + Train Model)

```bash
python run_pipeline.py --all
```

Or run individual steps:
```bash
python run_pipeline.py --generate    # Generate synthetic data
python run_pipeline.py --train       # Train model only
python run_pipeline.py --analyze     # Outlier analysis
python run_pipeline.py --visualize   # Create plots
```

### 3. Start Backend API

```bash
cd api
python app.py
```

Output:
```
✅ Model and preprocessing objects loaded successfully!
🌾 CROP YIELD PREDICTION API
Starting server on http://localhost:5000
```

### 4. Start Frontend

```bash
cd dashboard
python -m http.server 8080
```

Open: `http://localhost:8080`

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check |
| `/features` | GET | Feature list |
| `/model-info` | GET | Model metrics |
| `/predict` | POST | Single prediction |
| `/predict-batch` | POST | Batch predictions |

### Example Prediction Request

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Crop": "Rice",
    "State": "Punjab",
    "Year": 2024,
    "Rainfall_mm": 1200,
    "Temperature_C": 28,
    "Humidity": 70,
    "Soil_Quality": 75,
    "Nitrogen": 45,
    "Phosphorus": 35,
    "Potassium": 42,
    "Fertilizer_Amount": 180,
    "Irrigation_Type": "Canal",
    "Seed_Variety": "Hybrid",
    "Pesticide_Usage": 8.5,
    "Sunshine_Hours": 7.2,
    "GDD": 1850,
    "Pressure_KPa": 101.3,
    "Wind_Speed_Kmh": 12,
    "Soil_pH": 6.8,
    "OrganicCarbon": 1.2,
    "Soil_Moisture": 42,
    "Crop_Price": 2200
  }'
```

---

## 📊 ML Features

### Active ML Features (22)

| Category | Features | Status |
|----------|----------|--------|
| **Weather** | Rainfall_mm, Temperature_C, Humidity, Sunshine_Hours, GDD, Pressure_KPa, Wind_Speed_Kmh | 🟢 Complete |
| **Soil** | Soil_Quality, Nitrogen, Phosphorus, Potassium, Soil_pH, OrganicCarbon, Soil_Moisture | 🟢 Complete |
| **Management** | Fertilizer_Amount, Irrigation_Type, Seed_Variety, Pesticide_Usage | 🟢 Complete |
| **Location** | Crop, State, Year, Crop_Price | 🟢 Complete |
| **Encoded** | Crop_Encoded, State_Encoded | 🟢 Auto-generated |

### Synthetic Dataset (75,000 records)

| Property | Value |
|----------|-------|
| Total Records | 75,000 |
| Features | 27 columns |
| Crops | 22 types |
| States | 20 Indian states |
| Years | 2015-2024 |
| Missing Values | 0 |

---

## 🤖 Model Performance

**Best Model: Gradient Boosting Regressor**

| Metric | Value |
|--------|-------|
| R² Score | 0.9627 |
| MAE | 1,610 kg/ha |
| RMSE | 3,574 kg/ha |
| Cross-Val R² | 0.9603 |
| Training Samples | 60,000 |
| Test Samples | 15,000 |

### All Models Compared

| Model | R² Score | MAE (kg/ha) | RMSE (kg/ha) |
|-------|----------|-------------|--------------|
| **Gradient Boosting** 🏆 | **0.9627** | **1,610** | **3,574** |
| Random Forest | 0.9594 | 1,782 | 3,728 |
| Decision Tree | 0.8834 | 2,514 | 6,314 |
| Linear Regression | 0.7156 | 5,221 | 9,866 |

**Why Gradient Boosting?** Selected for best generalization (CV R² = 0.9603), faster inference (~3x), smaller model size (~4x), and better outlier handling compared to Random Forest.

### Feature Importance (Top 5)
1. Crop Type (~25%)
2. Year (~18%)
3. Rainfall (~12%)
4. Fertilizer Amount (~11%)
5. Temperature (~9%)

---

## 🌐 Dashboard Features

1. **Prediction Form** - Enter crop parameters
2. **Backend Status** - Shows API availability
3. **Field Status Toggle** - Shows which fields are ML-active
4. **Multi-Crop Comparison** - Compare yields across crops
5. **Total Production Calculator** - Farm area calculations
6. **Technical Docs** - Detailed documentation
7. **Quick View** - PPT-style project report

---

## 📁 Files Description

### Python Scripts

| File | Description |
|------|-------------|
| `full_workflow.py` | Complete 13-step ML pipeline |
| `api/app.py` | Flask REST API server |

### Model Artifacts

| File | Description |
|------|-------------|
| `model.pkl` | Trained Gradient Boosting model |
| `scaler.pkl` | StandardScaler for normalization |
| `label_encoders.pkl` | Encoders for Crop, State, Irrigation, Seed |
| `feature_list.pkl` | List of 22 feature names |
| `model_info.pkl` | Model metadata and metrics |

### Dashboard Pages

| File | Description |
|------|-------------|
| `index.html` | Main prediction interface |
| `technical.html` | Technical documentation |
| `report.html` | PPT-style quick view |

---

## 🔧 Retraining the Model

To retrain with updated data:

```bash
python full_workflow.py
```

This will:
1. Load and merge datasets
2. Preprocess features
3. Train multiple models
4. Save best model to `model/`
5. Generate plots in `plots/`

---

## 📝 Notes

- Backend must be running for predictions to work
- Dashboard shows "Backend Offline" if API is not available
- Model imputes missing values using median strategy
- Contextual fields (crop, state) are for display only

---

## 👨‍💻 Author

**Pushkarjay Ajay**

---

<p align="center">
  🌾 Crop Yield Prediction System - Phase 2
</p>
