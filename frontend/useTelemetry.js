import { useState, useEffect, useRef } from 'react';

// Your LIVE FastAPI Render URL
const BACKEND_URL = "https://aerosense-mlops-pipeline-sh1j.onrender.com/predict";

export const useTelemetry = () => {
  const [mode, setMode] = useState('BLUETOOTH'); // Default to BT now
  const [scenario, setScenario] = useState('NORMAL');
  const [backendResponse, setBackendResponse] = useState(null);
  
  const [telemetry, setTelemetry] = useState({
    Temperature: 90.0, Vibration: 1.2, Pressure: 55.0,
    Speed: 60.0, RPM: 2000.0, Odometer: 34000.0,
    Battery_Voltage: 13.8, Outside_Temp: 35.0
  });

  const streamInterval = useRef(null);

  const generateMockData = () => {
    setTelemetry((prev) => {
      let newData = { ...prev };
      const jitter = (val, percentage) => val * (1 + (Math.random() * percentage * 2 - percentage));

      if (scenario === 'NORMAL') {
        newData.Speed = jitter(60, 0.05); newData.RPM = jitter(2000, 0.05);
        newData.Temperature = jitter(90, 0.02); newData.Vibration = jitter(1.2, 0.1);
        newData.Pressure = jitter(55, 0.05); newData.Battery_Voltage = jitter(13.8, 0.01);
      } 
      else if (scenario === 'OVERHEATING') {
        newData.Speed = 85.0; newData.Temperature = prev.Temperature < 118 ? prev.Temperature + 2.5 : 118;
        newData.RPM = jitter(3500, 0.02);
      }
      else if (scenario === 'COLD_START_ABUSE') {
        newData.Temperature = 20.0; newData.RPM = jitter(5000, 0.05);
      }
      else if (scenario === 'TRANSMISSION_SLIP') { // NEW
        newData.Speed = jitter(40, 0.05); newData.RPM = 6500.0; // High RPM, low speed
      }
      else if (scenario === 'BATTERY_DRAIN') { // NEW
        newData.Battery_Voltage = 10.5; // Alternator failure
      }
      else if (scenario === 'OIL_LEAK') { // NEW
        newData.Pressure = prev.Pressure > 15 ? prev.Pressure - 2.0 : 15; // Drops to dangerous levels
        newData.Temperature = prev.Temperature < 110 ? prev.Temperature + 1.0 : 110;
      }
      else if (scenario === 'SENSOR_FAILURE') {
        newData.RPM = 68000.0; 
      }
      return newData;
    });
  };

  const readBluetoothData = () => {
    // In Bluetooth mode, we just keep the dashboard zeroed out until "connected"
    setTelemetry({
      Temperature: 0, Vibration: 0, Pressure: 0,
      Speed: 0, RPM: 0, Odometer: 34000.0,
      Battery_Voltage: 0, Outside_Temp: 0
    });
  };

  const sendToBackend = async (currentTelemetry) => {
    // Don't send API requests if we are just sitting on the Bluetooth pairing screen
    if (mode === 'BLUETOOTH') return; 

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTelemetry)
      });
      
      // DEFENSIVE PROGRAMMING: Read as raw text first
      const rawText = await response.text();
      
      // If Render sent us empty garbage, just silently abort and wait for the next tick
      if (!rawText) return; 

      // Safely try to parse the text into JSON
      const data = JSON.parse(rawText);
      setBackendResponse(data);
      
    } catch (error) {
      // Silently catch the error in the background instead of throwing a Red Screen
      console.warn("AeroSense Cloud is asleep or unreachable. Retrying...");
    }
  };
  useEffect(() => {
    if (streamInterval.current) clearInterval(streamInterval.current);
    streamInterval.current = setInterval(() => {
      if (mode === 'DEMO') generateMockData();
      else readBluetoothData();
    }, 2000);
    return () => clearInterval(streamInterval.current);
  }, [mode, scenario]);

  useEffect(() => {
    sendToBackend(telemetry);
  }, [telemetry]);

  return { telemetry, mode, setMode, scenario, setScenario, backendResponse };
};