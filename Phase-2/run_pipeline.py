
import argparse
import os
import sys
import time
from datetime import datetime

# Ensure src is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config import BASE_DIR, LOGS_DIR, MODEL_DIR, PLOTS_DIR
from src.utils import (
    log_output, get_log_filename, print_header, print_section,
    print_success, print_error, print_info, print_warning
)


def run_step(step_name, step_func, log_prefix):
    """
    Run a pipeline step with logging
    
    Args:
        step_name: Name of the step
        step_func: Function to execute
        log_prefix: Prefix for log file
        
    Returns:
        bool: Success status
    """
    log_file = get_log_filename(log_prefix)
    
    print(f"\n{'='*60}")
    print(f"  RUNNING: {step_name}")
    print(f"  Log: {log_file}")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    
    try:
        with log_output(log_file):
            result = step_func()
        
        elapsed = time.time() - start_time
        print_success(f"{step_name} completed in {elapsed:.1f}s")
        print_info(f"Log saved to: {log_file}")
        return True
        
    except Exception as e:
        elapsed = time.time() - start_time
        print_error(f"{step_name} failed after {elapsed:.1f}s: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def step_generate_data():
    """Generate synthetic dataset"""
    from src.data_generation import generate_synthetic_dataset
    df = generate_synthetic_dataset(n_rows=75000)
    return df


def step_train_model():
    """Train the ML model"""
    from src.training import run_training_pipeline
    model = run_training_pipeline()
    return model


def step_analyze_outliers():
    """Run outlier analysis"""
    from src.outlier_analysis import run_outlier_analysis
    analyzer = run_outlier_analysis()
    return analyzer


def step_create_visualizations():
    """Create all visualizations"""
    import pandas as pd
    from src.visualization import create_all_visualizations, create_outlier_analysis_plot
    
    data_path = os.path.join(BASE_DIR, 'unified_dataset.csv')
    df = pd.read_csv(data_path)
    print_info(f"Loaded {len(df):,} rows for visualization")
    
    create_all_visualizations(df)
    create_outlier_analysis_plot(df)
    return True


def run_full_pipeline():
    """
    Run the complete pipeline: Data Generation → Training → Analysis → Visualization
    """
    print_header("CROP YIELD PREDICTION - FULL PIPELINE")
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║              CROP YIELD PREDICTION SYSTEM                    ║
    ║                    Full Pipeline                             ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Author:   Pushkarjay Ajay                                   ║
    ║  Date:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            ║
    ║  GitHub:   github.com/Pushkarjay/Crop-Yield-Prediction       ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    pipeline_start = time.time()
    results = {}
    
    # Ensure directories exist
    os.makedirs(LOGS_DIR, exist_ok=True)
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)
    
    # Step 1: Generate Synthetic Data
    print_section("STEP 1/4: DATA GENERATION")
    results['generate'] = run_step(
        "Synthetic Data Generation",
        step_generate_data,
        "01_data_generation"
    )
    
    if not results['generate']:
        print_warning("Data generation failed, checking for existing data...")
        data_path = os.path.join(BASE_DIR, 'unified_dataset.csv')
        if os.path.exists(data_path):
            print_info("Found existing dataset, continuing...")
        else:
            print_error("No dataset found, aborting pipeline.")
            return results
    
    # Step 2: Train Model
    print_section("STEP 2/4: MODEL TRAINING")
    results['train'] = run_step(
        "Model Training",
        step_train_model,
        "02_model_training"
    )
    
    # Step 3: Outlier Analysis
    print_section("STEP 3/4: OUTLIER ANALYSIS")
    results['analyze'] = run_step(
        "Outlier Analysis",
        step_analyze_outliers,
        "03_outlier_analysis"
    )
    
    # Step 4: Visualizations
    print_section("STEP 4/4: VISUALIZATIONS")
    results['visualize'] = run_step(
        "Visualization Generation",
        step_create_visualizations,
        "04_visualization"
    )
    
    # Final Summary
    total_time = time.time() - pipeline_start
    
    print_header("PIPELINE COMPLETE")
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    PIPELINE SUMMARY                          ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Step 1 - Data Generation:    {'✓ SUCCESS' if results.get('generate') else '✗ FAILED '}              ║
    ║  Step 2 - Model Training:     {'✓ SUCCESS' if results.get('train') else '✗ FAILED '}              ║
    ║  Step 3 - Outlier Analysis:   {'✓ SUCCESS' if results.get('analyze') else '✗ FAILED '}              ║
    ║  Step 4 - Visualizations:     {'✓ SUCCESS' if results.get('visualize') else '✗ FAILED '}              ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Total Time: {total_time:>6.1f} seconds                                  ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Output locations
    print("\n📁 OUTPUT LOCATIONS:")
    print(f"   Dataset:  {os.path.join(BASE_DIR, 'unified_dataset.csv')}")
    print(f"   Model:    {os.path.join(MODEL_DIR, 'crop_yield_model.pkl')}")
    print(f"   Plots:    {PLOTS_DIR}")
    print(f"   Logs:     {LOGS_DIR}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description='Crop Yield Prediction Pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_pipeline.py              # Run all steps
    python run_pipeline.py --generate   # Only generate synthetic data
    python run_pipeline.py --train      # Only train model
    python run_pipeline.py --analyze    # Only run outlier analysis
    python run_pipeline.py --visualize  # Only create visualizations
        """
    )
    
    parser.add_argument('--generate', action='store_true', help='Generate synthetic data')
    parser.add_argument('--train', action='store_true', help='Train ML model')
    parser.add_argument('--analyze', action='store_true', help='Run outlier analysis')
    parser.add_argument('--visualize', action='store_true', help='Create visualizations')
    parser.add_argument('--all', action='store_true', help='Run all steps (default)')
    
    args = parser.parse_args()
    
    # If no specific step selected, run all
    if not any([args.generate, args.train, args.analyze, args.visualize]):
        args.all = True
    
    # Ensure directories exist
    os.makedirs(LOGS_DIR, exist_ok=True)
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)
    
    if args.all:
        run_full_pipeline()
    else:
        if args.generate:
            run_step("Synthetic Data Generation", step_generate_data, "data_generation")
        if args.train:
            run_step("Model Training", step_train_model, "model_training")
        if args.analyze:
            run_step("Outlier Analysis", step_analyze_outliers, "outlier_analysis")
        if args.visualize:
            run_step("Visualization Generation", step_create_visualizations, "visualization")


if __name__ == "__main__":
    main()
