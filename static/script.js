let ws;

let currentCity = ""; // Remove default city

const menuIcon = document.querySelector(".menu-icon");
const sidebar = document.querySelector(".sidebar");

// Menu toggle functionality
document.querySelector('.menu-icon').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
});

menuIcon.addEventListener("click", function () {
    sidebar.classList.toggle("active");
    
    // Move icon inside sidebar when opened
    if (sidebar.classList.contains("active")) {
        menuIcon.style.left = "110px"; // Adjust based on sidebar width
    } else {
        menuIcon.style.left = "15px"; // Default position
    }
});


// Function to clear all weather data displays
function clearWeatherData() {
    document.getElementById("city-name").textContent = "--";
    document.getElementById("temperature").textContent = "--";
    document.getElementById("condition").textContent = "--";
    document.getElementById("pressure").textContent = "--";
    document.getElementById("humidity").textContent = "--";
    document.getElementById("clouds").textContent = "--";
    document.getElementById("rain").textContent = "--";
    document.getElementById("wind-speed").textContent = "--";
    document.getElementById("wind-direction").textContent = "--";
    document.getElementById("sunrise").textContent = "--";
    document.getElementById("sunset").textContent = "--";
    document.getElementById("aqi").textContent = "--";
    document.getElementById("pm25").textContent = "--";
    document.getElementById("co").textContent = "--";
    document.getElementById("no2").textContent = "--";
    document.getElementById("forecast").innerHTML = "";
    document.getElementById("alerts").innerHTML = "<li>No alerts currently</li>";
}

// Add event listener for the dropdown
document.addEventListener('DOMContentLoaded', function() {
    const citySelect = document.querySelector('select[name="city"]');
    if (citySelect) {
        // Clear all data initially
        clearWeatherData();
        
        citySelect.addEventListener('change', function(e) {
            currentCity = e.target.value;
            if (!currentCity) {
                clearWeatherData();
                return;
            }
            
            // Close existing WebSocket connection
            if (ws) {
                ws.close();
            }
            // Reconnect with new city
            connectWebSocket();
            
            // Fetch new data for the selected city
            fetchForecast(currentCity);
            fetchAirQuality();
            fetchAlerts();
        });
    }
});

function connectWebSocket() {
    if (!currentCity) {
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        console.warn("WebSocket already connected");
        return;
    }

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss://' : 'ws://'}${location.host}/ws?city=${currentCity}`);

    ws.onopen = function() {
        console.log("WebSocket Connected");
    };

    ws.onmessage = function(event) {
        const weather = JSON.parse(event.data);

        if (weather.error) {
            console.error("Weather API Error:", weather.error);
            clearWeatherData();
        } else {
            document.getElementById("city-name").textContent = weather.name;
            document.getElementById("temperature").textContent = weather.main.temp;
            document.getElementById("condition").textContent = weather.weather[0].main;
            document.getElementById("pressure").textContent = weather.main.pressure;
            document.getElementById("humidity").textContent = weather.main.humidity;
            document.getElementById("clouds").textContent = weather.clouds.all;
            document.getElementById("rain").textContent = weather.rain && weather.rain["1h"] 
            ? weather.rain["1h"] 
            : "No rain";
            document.getElementById("wind-speed").textContent = weather.wind.speed;
            document.getElementById("wind-direction").textContent = weather.wind.deg;
            document.getElementById("sunrise").textContent = convertTime(weather.sys.sunrise);
            document.getElementById("sunset").textContent = convertTime(weather.sys.sunset);
        }
    };

    ws.onerror = function(error) {
        console.error("WebSocket Error:", error);
        clearWeatherData();
    };

    ws.onclose = function() {
        console.warn("WebSocket Disconnected, Reconnecting in 5s...");
        setTimeout(connectWebSocket, 5000);
    };
}

// Function to convert Unix timestamp to HH:MM AM/PM format
function convertTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Modified fetchForecast to handle empty city
function fetchForecast(city = currentCity) {
    if (!city) {
        document.getElementById('forecast').innerHTML = "";
        return;
    }

    fetch(`/forecast?city=${city}`)
        .then(response => response.json())
        .then(data => {
            console.log("Forecast Data:", data);
            const forecastContainer = document.getElementById('forecast');
            forecastContainer.innerHTML = "";

            if (data.list) {
                data.list.slice(0, 5).forEach(entry => {
                    const temp = entry.main.temp;
                    const condition = entry.weather[0].description;
                    const time = new Date(entry.dt * 1000).toLocaleString();

                    const item = document.createElement('p');
                    item.textContent = `${time}: ${temp}°C - ${condition}`;
                    forecastContainer.appendChild(item);
                });
            }
        })
        .catch(error => {
            console.error("Forecast Fetch Error:", error);
            document.getElementById('forecast').innerHTML = "";
        });
}

async function fetchAirQuality() {
    if (!currentCity) {
        return;
    }

    try {
        const response = await fetch(`/air_quality?city=${currentCity}`);
        const data = await response.json();

        if (data.list) {
            document.getElementById('aqi').textContent = data.list[0].main.aqi;
            document.getElementById('pm25').textContent = data.list[0].components.pm2_5;
            document.getElementById('co').textContent = data.list[0].components.co;
            document.getElementById('no2').textContent = data.list[0].components.no2;
        }
    } catch (error) {
        console.error("Air Quality Fetch Error:", error);
    }
}

function fetchAlerts() {
    if (!currentCity) {
        document.getElementById('alerts').innerHTML = "<li>No alerts currently</li>";
        return;
    }

    fetch(`/alerts?city=${currentCity}`)
        .then(response => response.json())
        .then(data => {
            console.log("Alerts Data:", data);
            const alertList = document.getElementById('alerts');
            alertList.innerHTML = "";

            if (data.length > 0) {
                data.forEach(alert => {
                    const item = document.createElement('li');
                    item.textContent = `${alert.event}: ${alert.description}`;
                    alertList.appendChild(item);
                });
            } else {
                alertList.innerHTML = "<li>No alerts currently</li>";
            }
        })
        .catch(error => {
            console.error("Alerts Fetch Error:", error);
            document.getElementById('alerts').innerHTML = "<li>No alerts currently</li>";
        });
}

// Only clear the data initially, don't connect WebSocket or fetch data
clearWeatherData();