from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
# Import your RAG function from your other file
from rag_engine import get_maintenance_suggestions

app = FastAPI(title="AeroSense IoT Diagnostic API")

# --- CORS SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
# Using a try/except here helps debug if the file is missing on Render
try:
    model = joblib.load("model.joblib")
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")

# Upgraded Schema for 8 features
class SensorData(BaseModel):
    Temperature: float
    Vibration: float
    Pressure: float
    Speed: float
    RPM: float
    Odometer: float
    Battery_Voltage: float
    Outside_Temp: float

@app.get("/")
def home():
    return {"status": "AeroSense API is Online", "docs": "/docs"}

@app.post("/predict")
def predict_status(data: SensorData):
    input_data = [[
        data.Temperature,
        data.Vibration,
        data.Pressure,
        data.Speed,
        data.RPM,
        data.Odometer,
        data.Battery_Voltage,
        data.Outside_Temp
    ]]

    prediction = model.predict(input_data)[0]

    if prediction != "Normal":
        query_text = f"Vehicle diagnosed with {prediction}. Temp: {data.Temperature}C, Battery: {data.Battery_Voltage}V, Pressure: {data.Pressure}PSI."
        fixes = get_maintenance_suggestions(query_text)
        return {
            "prediction": prediction,
            "recommended_fixes": fixes
        }

    return {
        "prediction": prediction,
        "recommended_fixes": ["System healthy. All telemetry within normal parameters."]
    }