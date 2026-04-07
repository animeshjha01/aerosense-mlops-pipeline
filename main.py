from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np

# --- TEAMMATE 2: Import the RAG function ---
RAG_IMPORT_ERROR = None
try:
    from rag_engine import get_maintenance_suggestions
except BaseException as e:
    RAG_IMPORT_ERROR = str(e)

model = None
try:
    model = joblib.load('model.joblib')
except FileNotFoundError:
    print("Error: Model not found. Run train_model.py first!")

app = FastAPI(title="AeroSense Predictive Maintenance API")

class SensorData(BaseModel):
    Temperature: float
    Vibration: float
    Pressure: float

@app.post("/predict")
def predict_status(data: SensorData):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded. Run train_model.py first.")

    input_data = np.array([[data.Temperature, data.Vibration, data.Pressure]])
    prediction = model.predict(input_data)
    
    # --- TEAMMATE 2: Add RAG Logic Here ---
    if prediction[0] == 1:
        result = "Anomaly"
        # Turn the raw numbers into a sentence so the Vector DB can understand it
        query_string = f"Anomaly detected with Temperature {data.Temperature}, Vibration {data.Vibration}, Pressure {data.Pressure}"
        
        # Ask ChromaDB for the 3 best fixes if the optional RAG layer is available
        if RAG_IMPORT_ERROR is None:
            try:
                suggestions = get_maintenance_suggestions(query_string)
            except Exception as e:
                suggestions = [f"RAG query failed: {e}"]
        else:
            suggestions = [f"RAG unavailable: {RAG_IMPORT_ERROR}"]
    else:
        result = "Normal"
        suggestions = ["System operating normally. No maintenance required."]
        
    return {
        "input_received": data.dict(),
        "prediction": result,
        "recommended_fixes": suggestions # The API now returns your RAG fixes!
    }