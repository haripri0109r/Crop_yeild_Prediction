# ============================================
# CROP YIELD PREDICTION API
# Flask REST API for Model Predictions
# Works with Synthetic Dataset (75K records)
# Author: Pushkarjay Ajay
# ============================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ============================================
# Load Model and Preprocessing Objects
# ============================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, '..', 'model')

try:
    model = joblib.load(os.path.join(MODEL_PATH, 'model.pkl'))
    scaler = joblib.load(os.path.join(MODEL_PATH, 'scaler.pkl'))
    label_encoders = joblib.load(os.path.join(MODEL_PATH, 'label_encoders.pkl'))
    feature_list = joblib.load(os.path.join(MODEL_PATH, 'feature_list.pkl'))
    model_info = joblib.load(os.path.join(MODEL_PATH, 'model_info.pkl'))
    print("✅ Model and preprocessing objects loaded successfully!")
    print(f"   Model: {model_info['model_name']}")
    print(f"   R² Score: {model_info['r2_score']:.4f}")
    print(f"   Features: {len(feature_list)}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    model_info = None

# ============================================
# Constants
# ============================================
AREA_CONVERSIONS = {
    'Hectare': 1.0,
    'Acre': 0.4047,
    'Bigha': 0.2529
}

# Default values for missing features (medians from training data)
DEFAULT_VALUES = {
    'Rainfall_mm': 996.61,
    'Temperature_C': 25.44,
    'Humidity': 70.92,
    'Sunshine_hours': 7.01,
    'GDD': 1819.84,
    'Pressure_KPa': 101.0,
    'Wind_Speed_Kmh': 17.52,
    'Soil_pH': 6.81,
    'Soil_Quality': 69.96,
    'OrganicCarbon': 1.40,
    'Nitrogen': 87.28,
    'Phosphorus': 58.76,
    'Potassium': 60.30,
    'Soil_Moisture': 50.20,
    'Fertilizer_Amount_kg_per_hectare': 199.52,
    'Crop_Price': 4518.96,
}

# ============================================
# API Routes
# ============================================

@app.route('/')
def home():
    """Home route with API information"""
    return jsonify({
        'status': 'success',
        'message': '🌾 Crop Yield Prediction API',
        'version': '2.0.0',
        'dataset': '75,000 synthetic records',
        'endpoints': {
            '/predict': 'POST - Predict crop yield',
            '/predict-batch': 'POST - Batch predictions',
            '/features': 'GET - Get list of required features',
            '/model-info': 'GET - Get model information',
            '/health': 'GET - Health check',
            '/crops': 'GET - Get supported crops',
            '/states': 'GET - Get supported states'
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/crops', methods=['GET'])
def get_crops():
    """Get list of supported crops"""
    if model_info and 'crops' in model_info:
        return jsonify({
            'status': 'success',
            'crops': sorted(model_info['crops']),
            'total': len(model_info['crops'])
        })
    return jsonify({
        'status': 'success',
        'crops': ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane'],
        'total': 5
    })


@app.route('/states', methods=['GET'])
def get_states():
    """Get list of supported states"""
    if model_info and 'states' in model_info:
        return jsonify({
            'status': 'success',
            'states': sorted(model_info['states']),
            'total': len(model_info['states'])
        })
    return jsonify({
        'status': 'success',
        'states': ['Punjab', 'Haryana', 'Maharashtra', 'Karnataka'],
        'total': 4
    })


@app.route('/features', methods=['GET'])
def get_features():
    """Get list of required input features"""
    return jsonify({
        'status': 'success',
        'features': feature_list if feature_list else [],
        'total_features': len(feature_list) if feature_list else 0,
        'numeric_features': model_info.get('numeric_features', []) if model_info else [],
        'categorical_features': model_info.get('categorical_features', []) if model_info else [],
        'description': {
            'Rainfall_mm': 'Annual rainfall in millimeters (100-3000)',
            'Temperature_C': 'Average temperature in Celsius (5-45)',
            'Humidity': 'Relative humidity percentage (40-95)',
            'Sunshine_hours': 'Daily sunshine hours (4-10)',
            'GDD': 'Growing Degree Days (0-5000)',
            'Pressure_KPa': 'Atmospheric pressure (99-103)',
            'Wind_Speed_Kmh': 'Wind speed (5-30)',
            'Soil_pH': 'Soil pH value (4.5-9.0)',
            'Soil_Quality': 'Soil quality index (40-100)',
            'OrganicCarbon': 'Organic carbon content (0.3-2.5)',
            'Nitrogen': 'Soil nitrogen content (10-300)',
            'Phosphorus': 'Soil phosphorus content (10-170)',
            'Potassium': 'Soil potassium content (10-450)',
            'Soil_Moisture': 'Soil moisture (20-80)',
            'Fertilizer_Amount_kg_per_hectare': 'Fertilizer used (50-350)',
            'Crop_Price': 'Market price per unit (280-40000)',
            'Crop': 'Crop type (Rice, Wheat, etc.)',
            'State': 'Indian state name',
            'Season': 'Growing season (Kharif, Rabi, Annual, Summer)',
            'Soil_Type': 'Type of soil',
            'Irrigation_Type': 'Irrigation method',
            'Seed_Variety': 'Seed variety type'
        }
    })


@app.route('/model-info', methods=['GET'])
def get_model_info():
    """Get model information and performance metrics"""
    if model_info:
        return jsonify({
            'status': 'success',
            'model_info': {
                'name': model_info.get('model_name', 'Unknown'),
                'r2_score': round(model_info.get('r2_score', 0), 4),
                'mae': round(model_info.get('mae', 0), 2),
                'rmse': round(model_info.get('rmse', 0), 2),
                'cv_r2_mean': round(model_info.get('cv_r2_mean', 0), 4),
                'training_samples': model_info.get('training_samples', 0),
                'test_samples': model_info.get('test_samples', 0),
                'total_samples': model_info.get('total_samples', 0),
                'features_count': len(model_info.get('features', [])),
                'crops_count': len(model_info.get('crops', [])),
                'states_count': len(model_info.get('states', []))
            }
        })
    return jsonify({'status': 'error', 'message': 'Model info not available'})


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict crop yield based on input features
    """
    try:
        if model is None:
            return jsonify({
                'status': 'error',
                'message': 'Model not loaded'
            }), 500
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No input data provided. Send JSON with feature values.'
            }), 400
        
        # Extract categorical fields
        crop_type = data.get('crop_type', data.get('Crop', 'Rice'))
        state = data.get('state', data.get('State', 'Punjab'))
        season = data.get('season', data.get('Season', 'Kharif'))
        soil_type = data.get('soil_type', data.get('Soil_Type', 'Alluvial'))
        irrigation_type = data.get('irrigation_type', data.get('Irrigation_Type', 'Canal'))
        seed_variety = data.get('seed_variety', data.get('Seed_Variety', 'Hybrid'))
        
        # Farm area for production calculation
        farm_area = data.get('farm_area')
        farm_area_unit = data.get('farm_area_unit', 'Hectare')
        
        # Multi-crop comparison flag
        compare_crops = data.get('compare_crops', False)
        
        # Build feature vector
        input_features = []
        
        for feature in feature_list:
            if feature.endswith('_encoded'):
                # Handle encoded categorical features
                base_feature = feature.replace('_encoded', '')
                
                if base_feature == 'Crop':
                    value = crop_type
                elif base_feature == 'State':
                    value = state
                elif base_feature == 'Season':
                    value = season
                elif base_feature == 'Soil_Type':
                    value = soil_type
                elif base_feature == 'Irrigation_Type':
                    value = irrigation_type
                elif base_feature == 'Seed_Variety':
                    value = seed_variety
                else:
                    value = 'Unknown'
                
                # Encode the value
                if base_feature in label_encoders:
                    le = label_encoders[base_feature]
                    if value in le.classes_:
                        encoded_value = le.transform([value])[0]
                    else:
                        # Use most common class if value not found
                        encoded_value = 0
                    input_features.append(float(encoded_value))
                else:
                    input_features.append(0.0)
            else:
                # Handle numeric features
                if feature in data:
                    input_features.append(float(data[feature]))
                elif feature in DEFAULT_VALUES:
                    input_features.append(DEFAULT_VALUES[feature])
                else:
                    input_features.append(0.0)
        
        # Convert to numpy array
        X_input = np.array(input_features).reshape(1, -1)
        
        # Scale features
        X_scaled = scaler.transform(X_input)
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        prediction = max(0, prediction)
        
        # Calculate total production if farm area provided
        total_production = None
        if farm_area is not None and farm_area > 0:
            try:
                conversion_factor = AREA_CONVERSIONS.get(farm_area_unit, 1.0)
                effective_area_ha = float(farm_area) * conversion_factor
                total_kg = prediction * effective_area_ha
                
                total_production = {
                    'farm_area_input': farm_area,
                    'farm_area_unit': farm_area_unit,
                    'effective_area_hectares': round(effective_area_ha, 4),
                    'total_kg': round(total_kg, 2),
                    'total_tons': round(total_kg / 1000, 3),
                    'total_quintals': round(total_kg / 100, 2),
                    'bags_50kg': round(total_kg / 50, 1),
                    'bags_100kg': round(total_kg / 100, 1)
                }
            except (ValueError, TypeError):
                pass
        
        # Build response
        response = {
            'status': 'success',
            'prediction': {
                'yield_kg_per_hectare': round(prediction, 2),
                'yield_tons_per_hectare': round(prediction / 1000, 3),
                'yield_quintals_per_hectare': round(prediction / 100, 2),
                'bags_per_hectare_50kg': round(prediction / 50, 1)
            },
            'crop_info': {
                'crop_type': crop_type,
                'state': state,
                'season': season,
                'soil_type': soil_type,
                'irrigation_type': irrigation_type,
                'seed_variety': seed_variety
            },
            'model_used': model_info.get('model_name', 'Unknown') if model_info else 'Unknown',
            'timestamp': datetime.now().isoformat()
        }
        
        if total_production:
            response['total_production'] = total_production
        
        # Multi-crop comparison
        if compare_crops and model_info and 'crops' in model_info:
            comparison_results = []
            crops_to_compare = model_info['crops'][:10]  # Top 10 crops
            
            for crop in crops_to_compare:
                crop_features = input_features.copy()
                
                # Find and update crop encoding
                for i, feature in enumerate(feature_list):
                    if feature == 'Crop_encoded':
                        if 'Crop' in label_encoders:
                            le = label_encoders['Crop']
                            if crop in le.classes_:
                                crop_features[i] = float(le.transform([crop])[0])
                
                X_crop = np.array(crop_features).reshape(1, -1)
                X_crop_scaled = scaler.transform(X_crop)
                crop_pred = max(0, model.predict(X_crop_scaled)[0])
                
                comparison_results.append({
                    'crop': crop,
                    'yield_kg_per_hectare': round(crop_pred, 2),
                    'yield_tons_per_hectare': round(crop_pred / 1000, 3),
                    'bags_per_hectare_50kg': round(crop_pred / 50, 1)
                })
            
            # Sort by yield
            comparison_results.sort(key=lambda x: x['yield_kg_per_hectare'], reverse=True)
            response['crop_comparison'] = comparison_results
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/predict-batch', methods=['POST'])
def batch_predict():
    """Batch prediction for multiple scenarios"""
    try:
        if model is None:
            return jsonify({'status': 'error', 'message': 'Model not loaded'}), 500
        
        data = request.get_json()
        
        if not data or 'scenarios' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Provide scenarios array'
            }), 400
        
        scenarios = data['scenarios']
        results = []
        
        for i, scenario in enumerate(scenarios[:20]):  # Max 20 scenarios
            try:
                # Process each scenario
                crop_type = scenario.get('crop_type', 'Rice')
                state = scenario.get('state', 'Punjab')
                season = scenario.get('season', 'Kharif')
                
                input_features = []
                
                for feature in feature_list:
                    if feature.endswith('_encoded'):
                        base_feature = feature.replace('_encoded', '')
                        if base_feature == 'Crop':
                            value = crop_type
                        elif base_feature == 'State':
                            value = state
                        elif base_feature == 'Season':
                            value = season
                        else:
                            value = scenario.get(base_feature, 'Unknown')
                        
                        if base_feature in label_encoders:
                            le = label_encoders[base_feature]
                            if value in le.classes_:
                                input_features.append(float(le.transform([value])[0]))
                            else:
                                input_features.append(0.0)
                        else:
                            input_features.append(0.0)
                    else:
                        if feature in scenario:
                            input_features.append(float(scenario[feature]))
                        elif feature in DEFAULT_VALUES:
                            input_features.append(DEFAULT_VALUES[feature])
                        else:
                            input_features.append(0.0)
                
                X_input = np.array(input_features).reshape(1, -1)
                X_scaled = scaler.transform(X_input)
                prediction = max(0, model.predict(X_scaled)[0])
                
                results.append({
                    'scenario_id': i + 1,
                    'crop': crop_type,
                    'state': state,
                    'yield_kg_per_hectare': round(prediction, 2),
                    'status': 'success'
                })
            except Exception as e:
                results.append({
                    'scenario_id': i + 1,
                    'status': 'error',
                    'message': str(e)
                })
        
        return jsonify({
            'status': 'success',
            'results': results,
            'total_scenarios': len(results)
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================
# Run Server
# ============================================
if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🌾 Starting Crop Yield Prediction API Server")
    print("=" * 50)
    print(f"📍 URL: http://localhost:5000")
    print(f"📊 Endpoints: /, /health, /predict, /crops, /states")
    print("=" * 50 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
