// CONFIGURATION - YOU MUST ADD YOUR API KEY HERE
const API_KEY = "64884ed5368bb5b6bf28e83334acac96"; // <--- PASTE KEY HERE

// Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const contentEl = document.getElementById('weatherContent');
const cityNameEl = document.getElementById('cityName');
const currentDateEl = document.getElementById('currentDate');
const temperatureEl = document.getElementById('temperature');
const weatherDescEl = document.getElementById('weatherDesc');
const rainChanceEl = document.getElementById('rainChance');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const forecastListEl = document.getElementById('forecastList');
const chartCanvas = document.getElementById('weatherChart');
const chartTabs = document.getElementById('chartTabs');

let weatherChartInstance = null;
let currentForecastData = null;
let activeTab = 'temp';

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) fetchWeather(query);
});

chartTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        activeTab = e.target.dataset.tab;
        updateChart();
    }
});

// Initial Load
fetchWeather('Phra Nakhon');

async function fetchWeather(city) {
    if (API_KEY === "YOUR_OPENWEATHER_API_KEY_HERE") {
        showError("Please open script.js and add your OpenWeatherMap API Key in the API_KEY variable.");
        return;
    }

    setLoading(true);
    setError("");

    try {
        // Fetch Current Weather
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},TH&units=metric&lang=th&appid=${API_KEY}`;
        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) throw new Error("City not found");
        const weatherData = await weatherRes.json();

        // Fetch Forecast
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},TH&units=metric&lang=th&appid=${API_KEY}`;
        const forecastRes = await fetch(forecastUrl);
        const forecastData = await forecastRes.json();

        currentForecastData = forecastData;

        renderCurrentWeather(weatherData, forecastData);
        renderForecastList(forecastData);
        updateChart();

        contentEl.style.display = 'flex';
    } catch (err) {
        showError("ไม่สามารถดึงข้อมูลได้: " + err.message);
    } finally {
        setLoading(false);
    }
}

function renderCurrentWeather(weather, forecast) {
    cityNameEl.textContent = weather.name;
    currentDateEl.textContent = new Date(weather.dt * 1000).toLocaleDateString("th-TH", {
        weekday: "long", day: "numeric", month: "long"
    });
    temperatureEl.textContent = Math.round(weather.main.temp) + "°";
    weatherDescEl.textContent = weather.weather[0].description;

    // Update Icons (re-run lucide)
    // Note: In vanilla JS we might map openweather icons to Lucide names
    // Simplification: just using sun/cloud for demo, logic could be expanded

    rainChanceEl.textContent = ((forecast.list[0].pop || 0) * 100).toFixed(0) + "%";
    humidityEl.textContent = weather.main.humidity + "%";
    windSpeedEl.textContent = Math.round(weather.wind.speed * 3.6) + " km/h";

    lucide.createIcons();
}

function renderForecastList(forecast) {
    forecastListEl.innerHTML = '';

    // Process unique days
    const dailyMap = new Map();
    forecast.list.forEach(item => {
        const dateStr = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, item);
        }
    });

    let count = 0;
    dailyMap.forEach((item) => {
        if (count >= 7) return;

        const date = new Date(item.dt * 1000);
        const dayName = count === 0 ? "วันนี้" : date.toLocaleDateString("th-TH", { weekday: "short" });

        const div = document.createElement('div');
        div.className = `day-card ${count === 0 ? 'active' : ''}`;
        div.innerHTML = `
            <span style="font-size: 0.9rem; margin-bottom: 0.5rem; opacity: 0.8">${dayName}</span>
            <div style="margin-bottom: 0.5rem;">
                <!-- Icon Placeholder -->
                <i data-lucide="${item.weather[0].main.includes('Rain') ? 'cloud-rain' : 'sun'}" size="32"></i>
            </div>
            <span style="font-weight: bold; font-size: 1.2rem;">${Math.round(item.main.temp_max || item.main.temp)}°</span>
        `;
        forecastListEl.appendChild(div);
        count++;
    });
    lucide.createIcons();
}

function updateChart() {
    if (!currentForecastData) return;

    const dataPoints = currentForecastData.list.slice(0, 8); // Next 24h

    const labels = dataPoints.map(d => new Date(d.dt * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    const data = dataPoints.map(d => {
        if (activeTab === 'temp') return d.main.temp;
        if (activeTab === 'rain') return (d.pop || 0) * 100;
        if (activeTab === 'wind') return d.wind.speed * 3.6;
    });

    const color = activeTab === 'temp' ? '#fbbf24' : activeTab === 'rain' ? '#3B82F6' : '#10B981';

    if (weatherChartInstance) {
        weatherChartInstance.destroy();
    }

    weatherChartInstance = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: activeTab === 'temp' ? 'Temperature (°C)' : activeTab === 'rain' ? 'Rain (%)' : 'Wind (km/h)',
                data: data,
                borderColor: color,
                backgroundColor: color + '33', // Add transparency
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#a0c4b0' }, grid: { display: false } },
                y: { ticks: { color: '#a0c4b0' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

function setLoading(bool) {
    loadingEl.style.display = bool ? 'block' : 'none';
    if (bool) {
        contentEl.style.display = 'none';
        errorEl.style.display = 'none';
    }
}

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    loadingEl.style.display = 'none';
}

function setError(msg) {
    if (!msg) errorEl.style.display = 'none';
    else {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}
