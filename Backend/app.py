from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import pickle
import os
import numpy as np

# Import TensorFlow, but suppress the annoying terminal warnings
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
import tensorflow as tf

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'temp_models'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/generate-fingerprints', methods=['POST'])
def generate_fingerprints():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    filename = file.filename
    if filename == '':
        return jsonify({"error": "No selected file"}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        # 1. FILE HASH (Universal for ALL files)
        file_hash = hashlib.sha256(open(filepath, 'rb').read()).hexdigest()

        # --- ROUTER: TENSORFLOW / KERAS DEEP LEARNING ---
        if filename.endswith('.h5') or filename.endswith('.keras'):
            model = tf.keras.models.load_model(filepath)
            
            # Structural Hash: Hash the entire JSON architecture config of the Neural Network
            structure_config = model.to_json()
            structural_hash = hashlib.sha256(structure_config.encode()).hexdigest()
            
            # Behavioral Hash: Dynamically read expected input shape and generate tensor
            # model.input_shape usually looks like (None, 28, 28, 1). We replace 'None' (batch size) with 1
            input_shape = list(model.input_shape)
            input_shape[0] = 1 
            
            np.random.seed(42)
            test_input = np.random.rand(*input_shape).astype(np.float32)
            
            predictions = model.predict(test_input, verbose=0)
            behavior_string = str(np.round(predictions, 4).tolist())
            behavioral_hash = hashlib.sha256(behavior_string.encode()).hexdigest()

        # --- ROUTER: SCIKIT-LEARN TRADITIONAL ML ---
        elif filename.endswith('.pkl'):
            with open(filepath, 'rb') as f:
                model = pickle.load(f)

            # Structural Hash
            model_type = type(model).__name__
            learned_attrs = {}
            for attr_name in dir(model):
                if attr_name.endswith('_') and not attr_name.startswith('__'):
                    try:
                        attr_val = getattr(model, attr_name)
                        if hasattr(attr_val, 'shape'):
                            learned_attrs[attr_name] = str(attr_val.shape)
                        else:
                            learned_attrs[attr_name] = str(type(attr_val))
                    except Exception:
                        pass
            
            structure_string = f"{model_type}_{sorted(learned_attrs.items())}"
            structural_hash = hashlib.sha256(structure_string.encode()).hexdigest()

            # Behavioral Hash
            n_features = getattr(model, 'n_features_in_', None)
            if n_features is None:
                if hasattr(model, 'coef_'):
                    n_features = model.coef_.shape[-1]
                else:
                    raise ValueError("Could not determine input shape for this Scikit-Learn model.")

            np.random.seed(42)
            test_inputs = np.random.rand(5, n_features)

            if hasattr(model, 'predict_proba'):
                predictions = model.predict_proba(test_inputs)
            else:
                predictions = model.predict(test_inputs)

            behavior_string = str(np.round(predictions, 4).tolist())
            behavioral_hash = hashlib.sha256(behavior_string.encode()).hexdigest()

        else:
            raise ValueError("Unsupported file type! Please upload a .pkl (Scikit-Learn) or .h5 (TensorFlow) file.")

    except Exception as e:
        return jsonify({"error": f"Failed to process model: {str(e)}"}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

    # In app.py, change your return statement to this:
    return jsonify({
        "fileHash": ("0x" + file_hash).lower(),
        "structuralHash": ("0x" + structural_hash).lower(),
        "behavioralHash": ("0x" + behavioral_hash).lower()
    }), 200

if __name__ == '__main__':
    print("Multi-Framework AI Engine is running on http://localhost:5000")
    app.run(debug=True, port=5000)