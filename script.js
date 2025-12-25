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
let currentWeatherData = null;
let currentChartDataPoints = null;
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
        currentWeatherData = weatherData;

        renderCurrentWeather(weatherData, forecastData);
        renderForecastList(forecastData);
        updateChart(forecastData.list.slice(0, 8));

        contentEl.style.display = 'flex';
    } catch (err) {
        showError("ไม่สามารถดึงข้อมูลได้: " + err.message);
    } finally {
        setLoading(false);
    }
}

function renderCurrentWeather(weather, forecast) {
    // Initial render uses the current weather data + first forecast item for rain chance
    updateMainDisplay({
        name: weather.name,
        dt: weather.dt,
        temp: weather.main.temp,
        description: weather.weather[0].description,
        pop: forecast.list[0].pop,
        humidity: weather.main.humidity,
        wind: weather.wind.speed,
        iconMain: weather.weather[0].main
    });
}

function updateMainDisplay(data) {
    document.getElementById('cityName').textContent = currentWeatherData ? currentWeatherData.name : data.name; // Keep city name constant if possible or update
    // If it's a forecast item, it might not have the city name, so we fallback or keep existing. 
    // Actually, usually we just want to update the weather details, not the city name if it's the same city.

    currentDateEl.textContent = new Date(data.dt * 1000).toLocaleDateString("th-TH", {
        weekday: "long", day: "numeric", month: "long"
    });
    temperatureEl.textContent = Math.round(data.temp) + "°";
    weatherDescEl.textContent = data.description;

    rainChanceEl.textContent = ((data.pop || 0) * 100).toFixed(0) + "%";
    humidityEl.textContent = data.humidity + "%";
    windSpeedEl.textContent = Math.round(data.wind * 3.6) + " km/h";

    // Update Icon
    const iconName = (data.iconMain && data.iconMain.includes('Rain')) ? 'cloud-rain' : 'sun';
    // We need to replace the icon element to update it effectively with Lucide
    const iconContainer = document.getElementById('weatherIcon').parentElement;
    const oldIcon = document.getElementById('weatherIcon');
    // Simple way: change data-lucide attribute and re-run createIcons? 
    // Lucide replaces the <i> with an <svg>. So we might need to recreate the <i> tag.

    // Better approach for Lucide re-render:
    oldIcon.setAttribute('data-lucide', iconName);
    // If it's already an SVG (rendered), we might need to replace it back with <i> first if we use createIcons again.
    // However, simplest is to just recreate the HTML inner string for the icon container part.
    // Let's look at the HTML structure:
    // <div style="... gap: 1rem;"> <i id="weatherIcon" ...></i> <span id="weatherDesc">...</span> </div>

    // Let's use a cleaner replacement approach:
    const iconParent = oldIcon.parentElement;
    // Remove old svg/icon
    oldIcon.remove();
    // Create new i
    const newIcon = document.createElement('i');
    newIcon.id = 'weatherIcon';
    newIcon.setAttribute('data-lucide', iconName);
    newIcon.setAttribute('size', '64');
    iconParent.insertBefore(newIcon, iconParent.firstChild);

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
        // Determine is today logic
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        // Note: API forecast starts from now, so first item might be today. 
        // But our dailyMap logic groups by date.

        const dayName = isToday ? "วันนี้" : date.toLocaleDateString("th-TH", { weekday: "short" });

        const div = document.createElement('div');
        div.className = `day-card ${count === 0 ? 'active' : ''}`; // Default first one active

        // Setup click data
        // For the first item (Today), we prefer the real current weather data which has more detail usually,
        // but for consistency in the list, we can use the map item. 
        // HOWEVER, the requirement implies clicking 'Today' goes back to current weather.

        const index = count; // Capture current count for closure
        div.onclick = () => {
            // Styling
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
            div.classList.add('active');

            if (index === 0 && currentWeatherData) {
                // Revert to current weather
                renderCurrentWeather(currentWeatherData, currentForecastData);
                updateChart(currentForecastData.list.slice(0, 8));
            } else {
                // Show forecast details
                updateMainDisplay({
                    name: currentWeatherData ? currentWeatherData.name : "",
                    dt: item.dt,
                    temp: item.main.temp, // or temp_max
                    description: item.weather[0].description,
                    pop: item.pop,
                    humidity: item.main.humidity,
                    wind: item.wind.speed,
                    iconMain: item.weather[0].main
                });

                // Update Chart for this specific day
                const targetDateStr = new Date(item.dt * 1000).toDateString();
                const dayData = currentForecastData.list.filter(d =>
                    new Date(d.dt * 1000).toDateString() === targetDateStr
                );
                updateChart(dayData);
            }
        };

        div.innerHTML = `
            <span style="font-size: 0.9rem; margin-bottom: 0.5rem; opacity: 0.8">${dayName}</span>
            <div style="margin-bottom: 0.5rem;">
                <i data-lucide="${item.weather[0].main.includes('Rain') ? 'cloud-rain' : 'sun'}" size="32"></i>
            </div>
            <span style="font-weight: bold; font-size: 1.2rem;">${Math.round(item.main.temp_max || item.main.temp)}°</span>
        `;
        forecastListEl.appendChild(div);
        count++;
    });
    lucide.createIcons();
}

function updateChart(newDataPoints) {
    if (newDataPoints) {
        currentChartDataPoints = newDataPoints;
    }

    if (!currentChartDataPoints && currentForecastData) {
        currentChartDataPoints = currentForecastData.list.slice(0, 8);
    }

    if (!currentChartDataPoints) return;

    const dataPoints = currentChartDataPoints;

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
