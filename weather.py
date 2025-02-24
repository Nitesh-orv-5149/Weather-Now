from fastapi import FastAPI, Request, WebSocket,Query
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import requests
import os
import asyncio
from starlette.websockets import WebSocketDisconnect

API_KEY = "c1dd69ba68cd5e8f0c7c1e2233acc1f7"  
DEFAULT_CITY = "Tiruchirappalli"

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Serve static files for JS and CSS
app.mount("/static", StaticFiles(directory="static"), name="static")

# Function to get weather forecast
def get_weather(city: str = DEFAULT_CITY):
    """Fetch real-time weather data from OpenWeather API."""
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    return response.json() if response.status_code == 200 else None

# Function to get 5-day hourly forecast
def get_forecast(city: str = DEFAULT_CITY):
    url = f"https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    return response.json() if response.status_code == 200 else {"error": "Forecast data unavailable"}

# Function to get air quality data
def get_air_quality(lat: float, lon: float):
    url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}"
    response = requests.get(url)
    return response.json() if response.status_code == 200 else {"error": "Air quality data unavailable"}

# Function to get weather alerts
def get_alerts(lat: float, lon: float):
    url = f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&appid={API_KEY}&exclude=current,minutely,hourly,daily"
    response = requests.get(url)
    return response.json().get("alerts", []) if response.status_code == 200 else {"error": "No alerts available"}

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    city: str = Query(DEFAULT_CITY)
):
    await websocket.accept()
    print(f"WebSocket Connection Established for city: {city}")

    try:
        while True:
            weather_data = get_weather(city)

            if not weather_data or "error" in weather_data:
                await websocket.send_json({"error": "Weather data unavailable"})
                print("Weather API Error:", weather_data)
            else:
                await websocket.send_json(weather_data)

            await asyncio.sleep(10)

    except WebSocketDisconnect:
        print(f"WebSocket Disconnected for city: {city}")
    except Exception as e:
        print("Unexpected WebSocket Error:", str(e))
        
@app.get("/")
def home(request: Request, city: str = DEFAULT_CITY):
    weather_data = get_weather(city)
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "weather": weather_data, "selected_city": city}
    )

# New API: Get weather forecast
@app.get("/forecast")
def forecast(city: str = DEFAULT_CITY):
    return get_forecast(city)

# New API: Get air quality data
@app.get("/air_quality")
def air_quality(city: str = DEFAULT_CITY):
    weather_data = get_weather(city)
    if "coord" in weather_data:
        lat, lon = weather_data["coord"]["lat"], weather_data["coord"]["lon"]
        return get_air_quality(lat, lon)
    return {"error": "Could not fetch coordinates"}


# New API: Get weather alerts
@app.get("/alerts")
def alerts(city: str = DEFAULT_CITY):
    weather_data = get_weather(city)
    if "coord" in weather_data:
        lat, lon = weather_data["coord"]["lat"], weather_data["coord"]["lon"]
        return get_alerts(lat, lon)
    return {"error": "Could not fetch coordinates"}




