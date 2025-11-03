from fastapi import FastAPI, HTTPException 
from pydantic import BaseModel, Field 
import joblib, json
import numpy as np
import pandas as pd
from typing import Dict, Any  
from fastapi.middleware.cors import CORSMiddleware

#App Setup
app = FastAPI(title = "Student Performance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

#Load Model Data
model = joblib.load("student_performance_xgb.pkl")

# Load list of feature names used during training
with open("features.json") as f:
    FEATURE_NAMES = json.load(f)

#Define Input Schema
class Payload(BaseModel):
    features : Dict[str, Any] = Field( #means it must be a dictionary where: keys are str and values can be any valid JSON type (string, int, float, list, dict, etc.)
        ... , description= "Dictionary of raw input features and their values"
    )
 # Pydantic model defines request body format

 # Example payload:
    # {"features": {"age": 17, "studytime": 2, "absences": 5, "sex": "F"}}


#Helper: convert input to dataframe
def _to_dataframe_(d:Dict[str, Any])-> pd.DataFrame:
    """
    Convert JSON dict from user into a pandas DataFrame
    in the exact order of model training features.
    """
    #Detecting extra features
    extra = set(d.keys()) - set(FEATURE_NAMES)
    if extra:
        raise HTTPException(status_code=400, detail=f"Unknown feature(s): {sorted(extra)}")
    
    #Build single row dataframe, filling missing features with none
    row = {k: d.get(k, None) for k in FEATURE_NAMES}
    return pd.DataFrame([row], columns=FEATURE_NAMES)


#Health endpoint ----------
@app.get("/health")
def health():
    """Simple endpoint to verify the API is running."""
    return {"ok": True}


#Prediction endpoint
@app.post("/predict")
def predict(payload: Payload):
    """
    Receive JSON data, preprocess it through the pipeline,
    and return the model's prediction + probability.
    """
    X = _to_dataframe_(payload.features)

    try:
        # Get probability of 'pass' class from model
        proba = model.predict_proba(X)[:, 1].item()

        # Get predicted label (0 = fail, 1 = pass)
        pred  = int(model.predict(X).item())

    except Exception as e:
        # If pipeline or model fails, return error message
        raise HTTPException(status_code=422, detail=f"Inference failed: {e}")
    
    # Send back structured response
    return {"prediction": pred, "probability_pass": proba}